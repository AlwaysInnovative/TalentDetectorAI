'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, FileText } from 'lucide-react'

export default function CandidateInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadInterest()
    // eslint-disable-next-line
  }, [])

  async function loadInterest() {
    try {
      setLoading(true)
      setError('')
      const supabase = createClient()
      // Step 1: Get logged in user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not logged in!')
        return
      }
      // Step 2: Look up candidate profile by user_id
      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single()
      if (candErr || !candidate) {
        setError('No candidate profile found for your user.')
        return
      }
      // Step 3: Fetch interest by params.id and candidate.id
      const { data, error: interestErr } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          jobs(id, title, location, salary_min, salary_max),
          candidates(id, name, email)
        `)
        .eq('id', params.id)
        .eq('candidate_id', candidate.id)
        .single()
      if (interestErr || !data) {
        setError('This opportunity does not exist or is not assigned to you.')
        return
      }
      setInterest(data)
      setError('')
    } catch (err: any) {
      setError('Failed to load opportunity: ' + (err?.message || err))
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
      <Loader2 className="w-14 h-14 text-blue-600 animate-spin"/>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50 ">
      <div className="bg-white rounded-2xl p-10 text-center shadow-lg max-w-lg">
        <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500"/>
        <h1 className="font-bold text-2xl text-red-700 mb-4">Failed to Load Opportunity</h1>
        <p className="mb-6">{error}</p>
        <button
          onClick={loadInterest}
          className="px-5 py-2 bg-blue-600 text-white rounded font-bold mr-2"
        >Try Again</button>
        <Link href="/dashboard/candidate/interests">
          <button
            className="px-5 py-2 bg-gray-100 text-gray-800 rounded font-bold ml-2 flex items-center justify-center"
          ><ArrowLeft className="w-5 h-5 mr-2" /> Back</button>
        </Link>
      </div>
    </div>
  )

  if (!interest) return null

  const job = interest.jobs
  const candidate = interest.candidates

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/dashboard/candidate/interests">
            <button className="flex items-center text-blue-600 hover:text-blue-800 font-semibold">
              <ArrowLeft className="w-5 h-5" />
              Back to My Opportunities
            </button>
          </Link>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">{job?.title}</h1>
          <p className="text-lg text-gray-600 mb-2">{job?.location}</p>
          <p className="mb-5 text-gray-800">Salary: £{job?.salary_min?.toLocaleString()} - £{job?.salary_max?.toLocaleString()}</p>
          <div className="mb-6">
            <strong>Your Name:</strong> {candidate?.name}<br />
            <strong>Your Email:</strong> {candidate?.email}
          </div>
          {interest.right_to_represent_url ? (
            <div className="bg-purple-50 p-6 rounded-xl text-center">
              <h2 className="font-bold text-xl mb-4">Right to Represent Agreement Available</h2>
              <a
                href={interest.right_to_represent_url}
                target="_blank"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-bold shadow hover:bg-purple-700 transition"
              >
                <FileText className="inline w-6 h-6 mr-2" />
                View / Download RTR
              </a>
              {/* You can add your e-sign flow below */}
            </div>
          ) : (
            <div className="text-amber-600 font-semibold py-6">This opportunity is pending agency action.</div>
          )}
        </div>
      </div>
    </div>
  )
}
