'use client'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Plus, Building, CheckCircle, XCircle, DollarSign, Clock, AlertCircle, Star } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, assignmentsRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('agency_assignments').select('*').eq('job_id', jobId),
    supabase.from('applications').select('agency_id').not('agency_id', 'is', null)
  ])
  
  // Get unique agencies from all applications
  const allAgencyIds = [...new Set(applicationsRes.data?.map(a => a.agency_id) || [])]
  const assignedIds = new Set(assignmentsRes.data?.map(a => a.agency_id) || [])
  
  // Calculate agency performance for recommendations
  const agencyPerformance = await Promise.all(
    allAgencyIds.map(async (agencyId) => {
      const { data: agencyApps } = await supabase
        .from('applications')
        .select('*')
        .eq('agency_id', agencyId)
      
      const submissions = agencyApps?.length || 0
      const placements = agencyApps?.filter(a => a.status === 'hired').length || 0
      const avgMatch = submissions > 0 ? 
        Math.round(agencyApps!.reduce((sum, a) => sum + (a.ai_match_score || 0), 0) / submissions) : 0
      
      return {
        id: agencyId,
        name: 'Agency ' + agencyId.substring(0, 6),
        submissions,
        placements,
        successRate: submissions > 0 ? Math.round((placements / submissions) * 100) : 0,
        avgMatch,
        score: Math.round((avgMatch * 0.6) + ((placements / Math.max(submissions, 1)) * 40)),
        isAssigned: assignedIds.has(agencyId)
      }
    })
  )
  
  return {
    job: jobRes.data,
    assignments: assignmentsRes.data || [],
    availableAgencies: agencyPerformance.filter(a => !a.isAssigned).sort((a, b) => b.score - a.score)
  }
}

export default function JobAgencies() {
  const params = useParams()
  const id = params.id as string
  const { data, mutate } = useSWR('job-agencies-' + id, () => fetcher(id), { refreshInterval: 3000 })
  const [showAssign, setShowAssign] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState('')
  const [commissionRate, setCommissionRate] = useState('15.00')
  const [bonusRate, setBonusRate] = useState('2.00')
  const [slaHours, setSlaHours] = useState('48')
  const [assigning, setAssigning] = useState(false)

  async function assignAgency() {
    if (!selectedAgency) {
      toast.error('Select an agency')
      return
    }
    
    setAssigning(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('agency_assignments').insert({
        job_id: id,
        agency_id: selectedAgency,
        assigned_by: user?.id,
        commission_rate: parseFloat(commissionRate),
        bonus_rate: parseFloat(bonusRate),
        sla_hours: parseInt(slaHours),
        status: 'active'
      })
      
      if (error) throw error
      
      toast.success('✅ Agency assigned successfully!')
      setShowAssign(false)
      setSelectedAgency('')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign')
    } finally {
      setAssigning(false)
    }
  }

  async function removeAssignment(assignmentId: string) {
    if (!confirm('Remove this agency? Their existing submissions will remain.')) return
    
    try {
      const supabase = createClient()
      const { error } = await supabase.from('agency_assignments')
        .update({ status: 'inactive' })
        .eq('id', assignmentId)
      
      if (error) throw error
      
      toast.success('Agency removed')
      mutate()
    } catch (error) {
      toast.error('Failed to remove')
    }
  }

  if (!data) return <div className="flex items-center justify-center h-screen">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full" />
  </div>

  return (
    <div className="relative">
      <DynamicBackground page="agencies" />
      
      <Link href={'/dashboard/manager/jobs/' + id}>
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600 transition">
          <ArrowLeft className="w-5 h-5" /> Back to Job
        </button>
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Agency Assignments
          </motion.h1>
          <p className="text-gray-600">{data.job?.title}</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAssign(true)} 
          className="btn-primary flex items-center gap-2 shadow-lg">
          <Plus className="w-5 h-5" /> Assign Agency
        </motion.button>
      </div>

      <AnimatePresence>
        {showAssign && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card mb-8 border-2 border-primary-200 bg-gradient-to-br from-blue-50 to-purple-50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Building className="w-6 h-6 text-primary-600" /> Assign Agency to Job
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">Select Agency *</label>
                <select value={selectedAgency} onChange={e => setSelectedAgency(e.target.value)} 
                  className="input text-lg">
                  <option value="">Choose best performing agency...</option>
                  {data.availableAgencies.map((agency: any) => (
                    <option key={agency.id} value={agency.id}>
                      {agency.name} - Score: {agency.score}/100 | {agency.successRate}% success | {agency.avgMatch}% avg match
                    </option>
                  ))}
                </select>
                {data.availableAgencies.length === 0 && (
                  <p className="text-sm text-yellow-600 mt-2">ℹ️ All available agencies already assigned</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Base Commission Rate (%) *</label>
                <input type="number" step="0.01" value={commissionRate} 
                  onChange={e => setCommissionRate(e.target.value)}
                  className="input" min="0" max="100" />
                <p className="text-xs text-gray-600 mt-1">Standard rate per placement</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Bonus Rate (%) *</label>
                <input type="number" step="0.01" value={bonusRate}
                  onChange={e => setBonusRate(e.target.value)}
                  className="input" min="0" max="10" />
                <p className="text-xs text-gray-600 mt-1">Extra for candidates with &gt;80% match</p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">SLA Response Time (hours) *</label>
                <input type="number" value={slaHours} onChange={e => setSlaHours(e.target.value)}
                  className="input" min="1" max="168" />
                <p className="text-xs text-gray-600 mt-1">
                  ⚠️ Violations tracked if submissions not reviewed within this timeframe
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-white rounded-xl border-2 border-blue-200 mb-6">
              <p className="text-sm font-semibold text-blue-900 mb-2">💡 Commission Structure (Hidden from Candidates)</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-700">Base commission:</p>
                  <p className="font-bold text-blue-600">{commissionRate}% of max salary</p>
                </div>
                <div>
                  <p className="text-gray-700">High-quality bonus:</p>
                  <p className="font-bold text-emerald-600">+{bonusRate}% for &gt;80% match</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button onClick={() => setShowAssign(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={assignAgency} disabled={assigning || !selectedAgency} 
                className="btn-primary flex-1">
                {assigning ? 'Assigning...' : '✓ Confirm Assignment'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {data.assignments.filter((a: any) => a.status === 'active').length > 0 ? (
        <div className="grid gap-6">
          {data.assignments.filter((a: any) => a.status === 'active').map((assignment: any, index: number) => (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Building className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                      Agency {assignment.agency_id.substring(0, 6)}
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </h3>
                    <p className="text-sm text-gray-600">
                      Assigned {new Date(assignment.assigned_at).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold">
                        Active
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        Commission Tracking On
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeAssignment(assignment.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="grid md:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-xl border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-purple-600" />
                    <p className="text-sm font-semibold text-purple-900">Base Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{assignment.commission_rate}%</p>
                  <p className="text-xs text-purple-700 mt-1">Per placement</p>
                </div>
                
                <div className="p-4 bg-white rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-900">Bonus Rate</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">+{assignment.bonus_rate || 2}%</p>
                  <p className="text-xs text-emerald-700 mt-1">High match bonus</p>
                </div>
                
                <div className="p-4 bg-white rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <p className="text-sm font-semibold text-blue-900">SLA Time</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{assignment.sla_hours}h</p>
                  <p className="text-xs text-blue-700 mt-1">Response deadline</p>
                </div>
                
                <div className="p-4 bg-white rounded-xl border-2 border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm font-semibold text-yellow-900">Auto Tracking</p>
                  </div>
                  <p className="text-lg font-bold text-yellow-600">Enabled</p>
                  <p className="text-xs text-yellow-700 mt-1">SLA monitoring active</p>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-xs text-gray-700 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-600" />
                  <strong>Commission Structure:</strong>
                  <span>
                    {assignment.commission_rate}% base + {assignment.bonus_rate || 2}% bonus for quality
                  </span>
                  <span className="ml-auto px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded font-semibold">
                    🔒 Hidden from candidates
                  </span>
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">No agencies assigned yet</p>
          <p className="text-gray-400 text-sm mb-6">Assign recruitment agencies to help fill this position faster</p>
          <button onClick={() => setShowAssign(true)} className="btn-primary">
            Assign First Agency
          </button>
        </div>
      )}

      {data.availableAgencies.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card mt-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <h3 className="text-xl font-bold mb-4">🏆 Top Recommended Agencies</h3>
          <div className="space-y-3">
            {data.availableAgencies.slice(0, 3).map((agency: any, i: number) => (
              <motion.div
                key={agency.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-4 bg-white rounded-xl flex justify-between items-center">
                <div>
                  <p className="font-bold">{agency.name}</p>
                  <p className="text-sm text-gray-600">
                    Performance Score: {agency.score}/100 • 
                    Success Rate: {agency.successRate}% • 
                    Avg Match: {agency.avgMatch}%
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedAgency(agency.id)
                    setShowAssign(true)
                  }}
                  className="btn-primary">
                  Assign
                </button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
