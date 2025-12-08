'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Plus, X, CheckCircle, AlertTriangle, Wand2, Upload } from 'lucide-react'
import { generateJobDescription, checkDuplicateJob } from '@/lib/ai/advanced-engine'
import { getAvailableTransitions } from '@/lib/workflows/job-workflow'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'

export default function NewJob() {
  const [step, setStep] = useState(1)
  const [title, setTitle] = useState('')
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState<'draft' | 'open'>('draft')
  const [autoPublish, setAutoPublish] = useState(false)
  const [stages, setStages] = useState([
    { name: 'Application Review', duration: 2 },
    { name: 'Phone Screening', duration: 1 },
    { name: 'Technical Interview', duration: 3 },
    { name: 'Final Interview', duration: 2 },
    { name: 'Offer', duration: 1 }
  ])
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null)
  const router = useRouter()

  async function handleAIGenerate() {
    if (!title.trim()) {
      toast.error('Enter job title first')
      return
    }
    
    setAiLoading(true)
    try {
      const result = await generateJobDescription(title, skills.length > 0 ? skills : ['Communication'])
      setDescription(result.description)
      setSkills(result.recommendedKeywords)
      setStages(result.suggestedStages.map((s: any) => ({ 
        name: s.name, 
        duration: parseInt(s.duration) 
      })))
      setAiResult(result)
      toast.success('✨ AI generated complete job posting!')
      setStep(2)
    } catch (error) {
      toast.error('Generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleCheckDuplicate() {
    if (!title.trim()) {
      toast.error('Enter title first')
      return
    }
    
    setAiLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const { data: existingJobs } = await supabase.from('jobs').select('*').eq('manager_id', user?.id || '')
      
      const check = await checkDuplicateJob(title, description, existingJobs || [])
      setDuplicateCheck(check)
      
      if (check.isDuplicate) {
        toast.error('⚠️ Similar job found!')
      } else {
        toast.success('✅ No duplicates found')
      }
    } catch (error) {
      toast.error('Check failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function extractSkills() {
    if (!description.trim()) return
    
    setAiLoading(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      const commonSkills = ['JavaScript', 'React', 'Python', 'SQL', 'AWS', 'Leadership', 'Communication']
      const found = commonSkills.filter(skill => description.toLowerCase().includes(skill.toLowerCase()))
      setSkills([...new Set([...skills, ...found])])
      toast.success(`✨ Extracted ${found.length} skills!`)
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('jobs').insert({
        manager_id: user?.id,
        title,
        description,
        location,
        salary_min: parseInt(salaryMin),
        salary_max: parseInt(salaryMax),
        department,
        ai_keywords: skills,
        status: autoPublish ? 'open' : status,
        interview_stages: stages
      })
      
      if (error) throw error
      
      toast.success(autoPublish ? '🎉 Job published!' : '✅ Job saved as ' + status)
      router.push('/dashboard/manager/jobs/list')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen pb-20">
      <DynamicBackground page="jobs" />
      
      <Link href="/dashboard/manager/jobs/list">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600 transition">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </Link>

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <motion.div 
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Create Job Posting
              </h1>
              <p className="text-gray-600">AI-powered with duplicate detection & workflow</p>
            </div>
          </div>
          <Link href="/dashboard/manager/jobs/bulk-upload">
            <button className="btn-secondary flex items-center gap-2">
              <Upload className="w-4 h-4" /> Bulk Upload
            </button>
          </Link>
        </div>

        {/* Progress */}
        <div className="card mb-8">
          <div className="flex justify-between">
            {['Basic Info', 'Description', 'Interview Stages', 'Review'].map((s, i) => (
              <div key={i} className="flex-1 text-center">
                <motion.div 
                  animate={{ scale: step === i + 1 ? 1.1 : 1 }}
                  className={'w-10 h-10 rounded-full mx-auto flex items-center justify-center font-bold shadow-lg ' + 
                    (step > i + 1 ? 'bg-emerald-600 text-white' : 
                     step === i + 1 ? 'bg-purple-600 text-white' : 'bg-gray-200')}>
                  {step > i + 1 ? '✓' : i + 1}
                </motion.div>
                <p className="text-sm mt-2 font-medium">{s}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6">Basic Information</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Job Title *</label>
                      <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                        className="input text-lg" placeholder="e.g., Senior Software Engineer" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Location *</label>
                        <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                          className="input" required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Department</label>
                        <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                          className="input" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Min Salary (£) *</label>
                        <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)}
                          className="input" required />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-2">Max Salary (£) *</label>
                        <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)}
                          className="input" required />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2">Key Skills</label>
                      <div className="flex gap-2 mb-3">
                        <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                          onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), setSkills([...skills, skillInput.trim()]), setSkillInput(''))}
                          className="input flex-1" />
                        <button type="button" onClick={() => {setSkills([...skills, skillInput.trim()]); setSkillInput('')}} 
                          className="btn-primary">Add</button>
                      </div>
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, i) => (
                            <span key={i} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full flex items-center gap-2">
                              {skill}
                              <button type="button" onClick={() => setSkills(skills.filter(s => s !== skill))}>
                                <X className="w-4 h-4" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {duplicateCheck && duplicateCheck.isDuplicate && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="card bg-yellow-50 border-2 border-yellow-200">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-bold text-yellow-900 mb-2">⚠️ Similar Job Detected</p>
                        <p className="text-sm text-yellow-800 mb-3">{duplicateCheck.recommendation}</p>
                        <div className="space-y-2">
                          {duplicateCheck.similarJobs.map((job: any, i: number) => (
                            <div key={i} className="p-2 bg-white rounded border border-yellow-300">
                              <p className="font-semibold text-sm">{job.title}</p>
                              <p className="text-xs text-gray-600">Status: {job.status} • Created: {job.created}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={handleCheckDuplicate} disabled={aiLoading}
                    className="btn-secondary flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Check Duplicates
                  </button>
                  <button type="button" onClick={handleAIGenerate} disabled={aiLoading}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-xl font-bold shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center gap-3">
                    <Wand2 className="w-6 h-6" />
                    {aiLoading ? 'AI Working...' : 'Generate Everything with AI ✨'}
                  </button>
                  <button type="button" onClick={() => setStep(2)} className="btn-primary px-8">Next →</button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6">Job Description</h2>

                  {aiResult && (
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 border-2 border-emerald-200 rounded-xl mb-6">
                      <p className="font-bold text-emerald-900 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5" /> AI Insights
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-700">Time to Fill</p>
                          <p className="font-bold text-emerald-900">{aiResult.estimatedFillTime} days</p>
                        </div>
                        <div>
                          <p className="text-gray-700">7-Day Fill Likelihood</p>
                          <p className="font-bold text-blue-900">{aiResult.likelihoodToFill7Days}</p>
                        </div>
                        <div>
                          <p className="text-gray-700">Next Best Action</p>
                          <p className="font-bold text-purple-900 text-xs">{aiResult.nextBestAction}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 mb-4">
                    <button type="button" onClick={extractSkills} disabled={aiLoading}
                      className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg font-semibold hover:bg-purple-200 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Extract Skills
                    </button>
                  </div>

                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    className="input h-96 font-mono text-sm" required />
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">← Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary flex-1">Next →</button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-4">Interview Stages</h2>
                  <div className="space-y-3">
                    {stages.map((stage, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <input type="text" value={stage.name} 
                          onChange={e => {
                            const updated = [...stages]
                            updated[i].name = e.target.value
                            setStages(updated)
                          }}
                          className="input flex-1" />
                        <input type="number" value={stage.duration}
                          onChange={e => {
                            const updated = [...stages]
                            updated[i].duration = parseInt(e.target.value) || 1
                            setStages(updated)
                          }}
                          className="input w-20" />
                        <span className="text-sm text-gray-600">days</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary">← Back</button>
                  <button type="button" onClick={() => setStep(4)} className="btn-primary flex-1">Review →</button>
                </div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="card">
                  <h2 className="text-2xl font-bold mb-6">Review & Publish</h2>
                  
                  <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl mb-6">
                    <h3 className="text-2xl font-bold mb-4">{title}</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-600">Location:</span> <span className="font-semibold">{location}</span></div>
                      <div><span className="text-gray-600">Salary:</span> <span className="font-semibold">£{parseInt(salaryMin).toLocaleString()} - £{parseInt(salaryMax).toLocaleString()}</span></div>
                      <div><span className="text-gray-600">Skills:</span> <span className="font-semibold">{skills.length} required</span></div>
                      <div><span className="text-gray-600">Stages:</span> <span className="font-semibold">{stages.length} stages</span></div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Publication Status</label>
                      <select value={status} onChange={e => setStatus(e.target.value as any)} className="input">
                        <option value="draft">Save as Draft</option>
                        <option value="open">Publish Immediately</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                      <input type="checkbox" checked={autoPublish} onChange={e => setAutoPublish(e.target.checked)}
                        className="w-5 h-5" />
                      <div>
                        <p className="font-semibold">Auto-publish to job boards</p>
                        <p className="text-sm text-gray-600">Automatically share to LinkedIn, Indeed, and internal channels</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(3)} className="btn-secondary">← Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2 text-lg py-4">
                    {loading ? 'Publishing...' : <><CheckCircle className="w-6 h-6" /> Publish Job</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  )
}
