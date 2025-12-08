'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('applications')
    .select('*, jobs(title, salary_max)')
    .eq('agency_id', user?.id || '')
    .eq('status', 'hired')
  return data || []
}

export default function Placements() {
  const { data: placements } = useSWR('agency-placements', fetcher, { refreshInterval: 3000 })

  const total = (placements || []).reduce((sum, p) => sum + ((p.jobs?.salary_max || 0) * 0.15), 0)

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Placements</h1>
      <div className="card mb-6">
        <p className="text-sm text-gray-600">Total Earnings</p>
        <p className="text-4xl font-bold text-emerald-600">£{Math.round(total).toLocaleString()}</p>
      </div>
      {placements && placements.length > 0 ? (
        <div className="grid gap-4">
          {placements.map((p: any) => (
            <div key={p.id} className="card">
              <h3 className="text-xl font-bold">{p.jobs?.title}</h3>
              <p className="text-emerald-600 font-bold">
                £{Math.round((p.jobs?.salary_max || 0) * 0.15).toLocaleString()} commission
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No placements yet</p>
      )}
    </div>
  )
}
