'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, Save, Users, TrendingUp, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import CinematicBackground from '@/components/backgrounds/CinematicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { aiAgent } from '@/lib/ai-agents/engine'

export default function CreateJob() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    location: '',
    description: '',
    salary_min: '',
    salary_max: '',
    assigned_recruiter_id: ''
  })
  const [recruiters, setRecruiters] = useState<any[]>([])
  const [optimizing, setOptimizing] = useState(false)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchRecruiters()
  }, [])

  async function fetchRecruiters() {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'agency')
    
    setRecruiters(data || [])
  }

  async function handleAIOptimize() {
    if (!formData.title || !formData.description) {
      toast.error('Add title and description first')
      return
    }

    setOptimizing(true)
    try {
      const result = await aiAgent.optimizeJobDescription(formData.description)
      
      setFormData({
        ...formData,
        description: result.optimized_jd
      })
      
      setAiInsights({
        likelihood_to_fill: result.likelihood_to_fill,
        improvements: result.improvements,
        market_insights: result.market_insights
      })
      
      toast.success('✨ Job description optimized with AI!')
    } catch (error) {
      toast.error('AI optimization failed')
    } finally {
      setOptimizing(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!formData.assigned_recruiter_id) {
      toast.error('Please assign a recruiter')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Create job
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert({
          title: formData.title,
          location: formData.location,
          description: formData.description,
          salary_min: parseFloat(formData.salary_min),
          salary_max: parseFloat(formData.salary_max),
          manager_id: user?.id,
          assigned_recruiter_id: formData.assigned_recruiter_id,
          ai_optimized: !!aiInsights,
          likelihood_to_fill: aiInsights?.likelihood_to_fill,
          status: 'open'
        })
        .select()
        .single()

      if (jobError) throw jobError

      // Create notification for recruiter
      await supabase.from('notifications').insert({
        user_id: formData.assigned_recruiter_id,
        type: 'job_assigned',
        title: 'New Job Assigned',
        message: `You've been assigned to recruit for ${formData.title}`,
        data: { job_id: job.id }
      })

      // Log activity
      await supabase.from('activity_log').insert({
        user_id: user?.id,
        action: 'job_created',
        entity_type: 'job',
        entity_id: job.id,
        metadata: { title: formData.title, recruiter_assigned: true }
      })

      toast.success('✅ Job posted and recruiter notified!')
      router.push('/dashboard/manager')
    } catch (error: any) {
      toast.error(error.message || 'Failed to create job')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative min-h-screen">
      <CinematicBackground variant="office" />
      
      <div className="relative z-10 max-w-4xl mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}>
          
          <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
            Create New Job
          </h1>
          <p className="text-white/80 mb-8">AI-powered job posting with recruiter assignment</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/20">
              <h2 className="text-2xl font-bold mb-6">Job Details</h2>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Job Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="input"
                    placeholder="Senior Software Engineer"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Location *</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                    className="input"
                    placeholder="London, UK"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Min Salary (£)</label>
                  <input
                    type="number"
                    value={formData.salary_min}
                    onChange={e => setFormData({...formData, salary_min: e.target.value})}
                    className="input"
                    placeholder="50000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">Max Salary (£)</label>
                  <input
                    type="number"
                    value={formData.salary_max}
                    onChange={e => setFormData({...formData, salary_max: e.target.value})}
                    className="input"
                    placeholder="70000"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2">Assign Recruiter *</label>
                <select
                  value={formData.assigned_recruiter_id}
                  onChange={e => setFormData({...formData, assigned_recruiter_id: e.target.value})}
                  className="input"
                  required>
                  <option value="">Select a recruiter...</option>
                  {recruiters.map(rec => (
                    <option key={rec.id} value={rec.id}>
                      {rec.full_name} ({rec.email})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  The recruiter will be notified immediately
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-semibold">Job Description *</label>
                  <button
                    type="button"
                    onClick={handleAIOptimize}
                    disabled={optimizing}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:opacity-90">
                    <Sparkles className="w-4 h-4" />
                    {optimizing ? 'Optimizing...' : 'AI Optimize'}
                  </button>
                </div>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="input h-40"
                  placeholder="Describe the role, responsibilities, requirements..."
                  required
                />
              </div>
            </div>

            {/* AI Insights Card */}
            {aiInsights && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-xl border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold">AI Insights</h3>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="p-4 bg-white rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <span className="text-sm font-semibold">Likelihood to Fill</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">
                      {aiInsights.likelihood_to_fill}%
                    </p>
                  </div>

                  <div className="p-4 bg-white rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold">Predicted Time</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {aiInsights.market_insights.avg_time_to_fill}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-purple-900">✨ AI Improvements:</h4>
                  <ul className="space-y-1">
                    {aiInsights.improvements.map((imp: string, i: number) => (
                      <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span>{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 bg-white rounded-xl">
                  <h4 className="font-semibold mb-2">Market Insights:</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>Competition:</strong> {aiInsights.market_insights.competition_level}</p>
                    <p><strong>Recommended Salary:</strong> {aiInsights.market_insights.recommended_salary_range}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Posting...
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Post Job & Notify Recruiter
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
