'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { FileText, CheckCircle, Send, Eye, AlertCircle } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: rtrs } = await supabase
    .from('rtr_tracking')
    .select('*, jobs(*), agency_candidates!rtr_tracking_candidate_id_fkey(*)')
    .eq('candidate_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  return rtrs || []
}

export default function RTRManagement() {
  const { data: rtrs, mutate } = useSWR('candidate-rtrs', fetcher, { refreshInterval: 3000 })
  const [selectedRTR, setSelectedRTR] = useState<any>(null)
  const [signing, setSigning] = useState(false)

  async function handleSign(rtrId: string) {
    setSigning(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase.from('rtr_tracking')
        .update({ 
          signed_at: new Date().toISOString(),
          status: 'signed'
        })
        .eq('id', rtrId)
      
      if (error) throw error
      
      toast.success('✅ RTR signed successfully!')
      mutate()
    } catch (error) {
      toast.error('Failed to sign RTR')
    } finally {
      setSigning(false)
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="documents" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Right to Represent
        </h1>
        <p className="text-gray-600">Review and sign agency representation agreements</p>
      </div>

      {rtrs && rtrs.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* RTR List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">RTR Requests ({rtrs.length})</h2>
            {rtrs.map((rtr: any, i: number) => (
              <motion.div
                key={rtr.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedRTR(rtr)}
                className={'card cursor-pointer transition ' +
                  (selectedRTR?.id === rtr.id ? 'ring-2 ring-primary-600 bg-blue-50' : 'hover:shadow-lg')}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{rtr.jobs?.title}</h3>
                    <p className="text-sm text-gray-600">Agency: {rtr.agency_candidates?.name || 'Agency'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Received {new Date(rtr.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                    (rtr.status === 'signed' ? 'bg-emerald-100 text-emerald-700' :
                     rtr.status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                     'bg-gray-100 text-gray-700')}>
                    {rtr.status === 'signed' ? '✓ Signed' : 'Pending'}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className={'p-2 rounded text-center ' + (rtr.sent_at ? 'bg-blue-50' : 'bg-gray-50')}>
                    <Send className="w-4 h-4 mx-auto mb-1" />
                    <p>Sent</p>
                  </div>
                  <div className={'p-2 rounded text-center ' + (rtr.viewed_at ? 'bg-purple-50' : 'bg-gray-50')}>
                    <Eye className="w-4 h-4 mx-auto mb-1" />
                    <p>Viewed</p>
                  </div>
                  <div className={'p-2 rounded text-center ' + (rtr.signed_at ? 'bg-emerald-50' : 'bg-gray-50')}>
                    <CheckCircle className="w-4 h-4 mx-auto mb-1" />
                    <p>Signed</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* RTR Details */}
          <div className="sticky top-4">
            {selectedRTR ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-4">RTR Details</h2>
                  
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Position</p>
                      <p className="font-bold">{selectedRTR.jobs?.title}</p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Company</p>
                      <p className="font-bold">{selectedRTR.jobs?.company || 'Confidential'}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Agency</p>
                      <p className="font-bold">{selectedRTR.agency_candidates?.name || 'Recruitment Agency'}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Salary Range</p>
                      <p className="font-bold">
                        £{selectedRTR.jobs?.salary_min?.toLocaleString()} - £{selectedRTR.jobs?.salary_max?.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 mb-6">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-900 mb-1">What is RTR?</p>
                        <p className="text-xs text-blue-800">
                          By signing, you authorize this agency to represent you for this specific role. 
                          This doesn't commit you to accepting an offer, but allows the agency to submit your profile.
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedRTR.signed_at ? (
                    <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center">
                      <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
                      <p className="font-bold text-emerald-900">Signed</p>
                      <p className="text-sm text-emerald-700 mt-1">
                        {new Date(selectedRTR.signed_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSign(selectedRTR.id)}
                      disabled={signing}
                      className="w-full btn-primary flex items-center justify-center gap-2 text-lg py-4">
                      <FileText className="w-5 h-5" />
                      {signing ? 'Signing...' : 'Sign Electronically'}
                    </button>
                  )}
                </div>
              </motion.div>
            ) : (
              <div className="card text-center py-20">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Select an RTR to review</p>
              </div>
            )}
          </div>
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
