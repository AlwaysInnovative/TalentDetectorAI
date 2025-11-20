'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, FileText, ThumbsUp, ThumbsDown } from 'lucide-react'

export default function CandidateInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)
  const [responseComment, setResponseComment] = useState('')
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

  async function handleRespond(accepted: boolean) {
    if (responding) return
    setResponding(true)
    setError('')
    try {
      const res = await fetch('/api/candidate/respond-to-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest_id: interest.id,
          accepted,
          comment: responseComment,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to submit response')
        setResponding(false)
        return
      }
      await loadInterest() // reload to update state
      setResponseComment('')
    } catch (err: any) {
      setError('Could not submit. ' + (err?.message || err))
    } finally {
      setResponding(false)
    }
  }

  function getStatusMessage(interest: any) {
    if (interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response') {
      return "Please review the job and respond with your acceptance or decline."
    }
    if (interest.status === 'interested' || interest.status === 'candidate_accepted') {
      return "Thank you for your interest! The agency will follow up with the next steps."
    }
    if (
      interest.status === 'not_interested' ||
      interest.status === 'rejected'
    ) {
      return "You have declined this opportunity."
    }
    if (interest.status === 'rtr_ready') {
      return "Your Right to Represent agreement is ready to sign."
    }
    if (interest.status === 'pending_agency_action') {
      return "Waiting for the agency to provide required documents. Please check back soon."
    }
    return ""
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
  const statusMsg = getStatusMessage(interest)

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
          
          {/* Status Message */}
          {statusMsg && (
            <div className="mb-6 p-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800">
              {statusMsg}
            </div>
          )}

          {/* Accept/Decline Actions */}
          {interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response' && (
            <div className="mb-8">
              <textarea
                rows={3}
                value={responseComment}
                onChange={e => setResponseComment(e.target.value)}
                className="w-full border rounded-lg p-3 mb-3"
                placeholder="Add comments or questions (optional)"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => handleRespond(false)}
                  disabled={responding}
                  className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2 justify-center"
                >
                  {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5" />}
                  Decline
                </button>
                <button
                  onClick={() => handleRespond(true)}
                  disabled={responding}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2 justify-center"
                >
                  {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
                  Accept
                </button>
              </div>
            </div>
          )}

          {/* RTR Section */}
          {interest.right_to_represent_url && interest.status === 'rtr_ready' && (
            <div className="bg-purple-50 p-6 rounded-xl text-center mb-6">
              <h2 className="font-bold text-xl mb-4">Right to Represent Agreement Available</h2>
              <a
                href={interest.right_to_represent_url}
                target="_blank"
                className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-bold shadow hover:bg-purple-700 transition"
              >
                <FileText className="inline w-6 h-6 mr-2" />
                View / Download RTR
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
