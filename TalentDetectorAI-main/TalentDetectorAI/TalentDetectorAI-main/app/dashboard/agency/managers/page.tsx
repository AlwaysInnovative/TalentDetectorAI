'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

const fetcher = async () => {
  const supabase = createClient()
  const { data: jobs } = await supabase.from('jobs').select('manager_id')
  const uniqueIds = [...new Set((jobs || []).map(j => j.manager_id))]
  return uniqueIds.map(id => ({ id, jobCount: (jobs || []).filter(j => j.manager_id === id).length }))
}

export default function Managers() {
  const { data: managers } = useSWR('agency-managers', fetcher, { refreshInterval: 3000 })

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Hiring Managers</h1>
      {managers && managers.length > 0 ? (
        <div className="grid gap-4">
          {managers.map((m: any) => (
            <div key={m.id} className="card">
              <h3 className="text-xl font-bold">Manager #{m.id.substring(0, 8)}</h3>
              <p className="text-gray-600">{m.jobCount} active jobs</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No managers found</p>
      )}
    </div>
  )
}
