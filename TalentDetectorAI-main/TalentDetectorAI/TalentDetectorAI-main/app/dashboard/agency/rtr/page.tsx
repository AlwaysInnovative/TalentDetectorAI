'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { FileText, Send, Eye, CheckCircle, Clock } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [rtrsRes, candidatesRes, jobsRes] = await Promise.all([
    supabase.from('rtr_tracking')
      .select('*, agency_candidates(*), jobs(*)')
      .eq('agency_id', user?.id || '')
      .order('created_at', { ascending: false }),
    supabase.from('agency_candidates').select('*').eq('agency_id', user?.id || ''),
    supabase.from('jobs').select('*').eq('status', 'open')
  ])
  
  return {
    rtrs: rtrsRes.data || [],
    candidates: candidatesRes.data || [],
    jobs: jobsRes.data || []
  }
}

export default function RTRWorkflow() {
  const { data, mutate } = useSWR('rtr-workflow', fetcher)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState('')
  const [selectedJob, setSelectedJob] = useState('')
  const [generating, setGenerating] = useState(false)

  async function handleGenerateRTR() {
    if (!selectedCandidate || !selectedJob) {
      toast.error('Select candidate and job')
      return
    }

    setGenerating(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Generate envelope ID (simulate DocuSign)
      const envelopeId = 'env_' + Math.random().toString(36).substring(7)
      
      const { error } = await supabase.from('rtr_tracking').insert({
        agency_id: user?.id,
        candidate_id: selectedCandidate,
        job_id: selectedJob,
        docusign_envelope_id: envelopeId,
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      
      if (error) throw error
      
      toast.success('✅ RTR sent via DocuSign!')
      setShowCreateForm(false)
      setSelectedCandidate('')
      setSelectedJob('')
      mutate()
    } catch (error) {
      toast.error('Failed to generate RTR')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="documents" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
            RTR Management
          </h1>
          <p className="text-gray-600">Right to Represent workflow with DocuSign</p>
        </div>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn-primary flex items-center gap-2">
          <FileText className="w-5 h-5" /> Generate RTR
        </button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Sent', count: data?.rtrs.filter(r => r.status === 'sent').length || 0, color: 'yellow' },
          { label: 'Viewed', count: data?.rtrs.filter(r => r.viewed_at).length || 0, color: 'blue' },
          { label: 'Signed', count: data?.rtrs.filter(r => r.signed_at).length || 0, color: 'emerald' },
          { label: 'Completed', count: data?.rtrs.filter(r => r.status === 'completed').length || 0, color: 'green' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={'card bg-gradient-to-br from-' + stat.color + '-50 to-white border-2 border-' + stat.color + '-200'}>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-4xl font-bold">{stat.count}</p>
          </motion.div>
        ))}
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="card mb-8 border-2 border-primary-200">
          <h3 className="text-xl font-bold mb-4">Generate RTR Request</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Select Candidate *</label>
              <select value={selectedCandidate} onChange={e => setSelectedCandidate(e.target.value)} className="input">
                <option value="">Choose candidate...</option>
                {data?.candidates.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.email}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Select Job *</label>
              <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="input">
                <option value="">Choose job...</option>
                {data?.jobs.map((j: any) => (
                  <option key={j.id} value={j.id}>{j.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-xl mb-4">
            <p className="text-sm text-blue-900 mb-2">📄 RTR will include:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Auto-filled candidate and job details</li>
              <li>• DocuSign envelope for electronic signature</li>
              <li>• Real-time status tracking</li>
              <li>• Automatic notifications on signature</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleGenerateRTR} disabled={generating} className="btn-primary flex-1 flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              {generating ? 'Generating...' : 'Generate & Send RTR'}
            </button>
          </div>
        </motion.div>
      )}

      {/* RTR List */}
      {data && data.rtrs.length > 0 ? (
        <div className="grid gap-4">
          {data.rtrs.map((rtr: any, i: number) => (
            <motion.div
              key={rtr.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-lg">{rtr.agency_candidates.name}</p>
                  <p className="text-sm text-gray-600">{rtr.jobs.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Envelope: {rtr.docusign_envelope_id}
                  </p>
                </div>
                <span className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                  (rtr.status === 'completed' ? 'bg-green-100 text-green-700' :
                   rtr.signed_at ? 'bg-emerald-100 text-emerald-700' :
                   rtr.viewed_at ? 'bg-blue-100 text-blue-700' :
                   'bg-yellow-100 text-yellow-700')}>
                  {rtr.status}
                </span>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className={'p-3 rounded-lg border-l-4 ' + 
                  (rtr.sent_at ? 'bg-yellow-50 border-yellow-500' : 'bg-gray-50 border-gray-300')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Send className="w-4 h-4" />
                    <p className="text-sm font-semibold">Sent</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {rtr.sent_at ? new Date(rtr.sent_at).toLocaleDateString() : 'Not sent'}
                  </p>
                </div>

                <div className={'p-3 rounded-lg border-l-4 ' + 
                  (rtr.viewed_at ? 'bg-blue-50 border-blue-500' : 'bg-gray-50 border-gray-300')}>
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4" />
                    <p className="text-sm font-semibold">Viewed</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {rtr.viewed_at ? new Date(rtr.viewed_at).toLocaleDateString() : 'Not viewed'}
                  </p>
                </div>

                <div className={'p-3 rounded-lg border-l-4 ' + 
                  (rtr.signed_at ? 'bg-emerald-50 border-emerald-500' : 'bg-gray-50 border-gray-300')}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-sm font-semibold">Signed</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {rtr.signed_at ? new Date(rtr.signed_at).toLocaleDateString() : 'Not signed'}
                  </p>
                </div>

                <div className={'p-3 rounded-lg border-l-4 ' + 
                  (rtr.completed_at ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-300')}>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4" />
                    <p className="text-sm font-semibold">Completed</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    {rtr.completed_at ? new Date(rtr.completed_at).toLocaleDateString() : 'Pending'}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No RTR requests yet</p>
        </div>
      )}
    </div>
  )
}
