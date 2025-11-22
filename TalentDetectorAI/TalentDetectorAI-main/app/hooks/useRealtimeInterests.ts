import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeInterests(candidateId: string) {
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!candidateId) return

    const supabase = createClient()

    // Initial fetch
    loadInterests()

    // Set up realtime subscription
    const channel = supabase
      .channel(`candidate_interests_${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_interests',
          filter: `candidate_id=eq.${candidateId}`
        },
        () => {
          loadInterests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [candidateId])

  async function loadInterests() {
    const supabase = createClient()

    const { data: interestData } = await supabase
      .from('candidate_interests')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (!interestData) {
      setLoading(false)
      return
    }

    // Fetch related data for each interest (jobs and agency profiles)
    const enrichedInterests = await Promise.all(
      interestData.map(async (interest) => {
        const [jobRes, agencyRes] = await Promise.all([
          supabase.from('jobs').select('*').eq('id', interest.job_id).single(),
          supabase.from('profiles').select('*').eq('id', interest.agency_id).single()
        ])

        return {
          ...interest,
          jobs: jobRes.data,
          profiles: agencyRes.data
        }
      })
    )

    setInterests(enrichedInterests)
    setLoading(false)
  }

  return { interests, loading }
}
