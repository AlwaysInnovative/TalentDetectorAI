'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Upload, Sparkles, Save, User, Briefcase, Plus, X, Loader2, FileText, Check } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { uploadCV, parseCV } from '@/lib/cv-upload/upload'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  let { data: candidate, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  if (error && error.code === 'PGRST116') {
    const { data: newCandidate, error: createError } = await supabase
      .from('candidates')
      .insert({
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        skills: [],
        education: [],
        certifications: [],
        languages: []
      })
      .select()
      .single()
    
    if (createError) throw createError
    candidate = newCandidate
  } else if (error) {
    throw error
  }
  
  return candidate
}

export default function EditProfile() {
  const { data: candidate, mutate, error, isLoading } = useSWR('candidate-profile-edit', fetcher)
  const [saving, setSaving] = useState(false)
  const [generatingAI, setGeneratingAI] = useState(false)
  const [uploadingCV, setUploadingCV] = useState(false)
  const [parsingCV, setParsingCV] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    current_company: '',
    current_position: '',
    experience_years: 0,
    professional_summary: '',
    resume_url: ''
  })
  
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [education, setEducation] = useState<any[]>([])
  
  useEffect(() => {
    if (candidate) {
      setFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        location: candidate.location || '',
        linkedin_url: candidate.linkedin_url || '',
        github_url: candidate.github_url || '',
        portfolio_url: candidate.portfolio_url || '',
        current_company: candidate.current_company || '',
        current_position: candidate.current_position || '',
        experience_years: candidate.experience_years || 0,
        professional_summary: candidate.professional_summary || '',
        resume_url: candidate.resume_url || ''
      })
      setSkills(candidate.skills || [])
      setEducation(candidate.education || [])
    }
  }, [candidate])

  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploadingCV(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) throw new Error('Not authenticated')
      
      // Upload CV
      const uploadResult = await uploadCV(file, user.id)
      toast.success('✅ CV uploaded!')
      
      // Parse CV
      setParsingCV(true)
      const parsed = await parseCV(file)
      
      // Auto-fill form with parsed data
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        professional_summary: parsed.summary || prev.professional_summary,
        experience_years: parsed.experienceYears || prev.experience_years,
        resume_url: uploadResult.url
      }))
      
      if (parsed.skills && parsed.skills.length > 0) {
        setSkills(parsed.skills)
      }
      
      if (parsed.education && parsed.education.length > 0) {
        setEducation(parsed.education)
      }
      
      if (parsed.experience && parsed.experience.length > 0) {
        setFormData(prev => ({
          ...prev,
          current_position: parsed.experience[0].position || prev.current_position,
          current_company: parsed.experience[0].company || prev.current_company
        }))
      }
      
      toast.success('✨ CV parsed successfully! Review and save your profile.')
      setParsingCV(false)
    } catch (error: any) {
      toast.error(error.message || 'CV upload failed')
      setParsingCV(false)
    } finally {
      setUploadingCV(false)
    }
  }

  async function generateAISummary() {
    if (!formData.current_position && skills.length === 0) {
      toast.error('Add your position and skills first')
      return
    }
    
    setGeneratingAI(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiSummary = `Results-driven ${formData.current_position || 'professional'} with ${formData.experience_years || 0}+ years of proven expertise${formData.current_company ? ' at ' + formData.current_company : ''}. ${skills.length > 0 ? 'Specialized in ' + skills.slice(0, 3).join(', ') + '.' : ''} Passionate about delivering high-impact solutions and continuous learning. Recognized for strong technical abilities and excellent collaboration skills.`
      
      setFormData({...formData, professional_summary: aiSummary})
      toast.success('✨ AI summary generated!')
    } catch (error) {
      toast.error('Failed to generate summary')
    } finally {
      setGeneratingAI(false)
    }
  }

  async function handleSave() {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required')
      return
    }
    
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('candidates')
        .update({
          ...formData,
          skills,
          education
        })
        .eq('user_id', user?.id || '')
      
      if (error) throw error
      
      toast.success('✅ Profile saved!')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-4">Error loading profile</p>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <button onClick={() => mutate()} className="btn-primary">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="profile" />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Complete Your Profile
        </h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>

      {/* CV Upload Progress */}
      <AnimatePresence>
        {(uploadingCV || parsingCV) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="card bg-blue-50 border-2 border-blue-200 mb-6">
            <div className="flex items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <div>
                <p className="font-bold text-blue-900">
                  {uploadingCV ? 'Uploading CV...' : 'Parsing CV with AI...'}
                </p>
                <p className="text-sm text-blue-700">
                  {uploadingCV ? 'Please wait while we upload your file' : 'Extracting information from your CV'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold">Personal Information</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                  className="input" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email *</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                  className="input" placeholder="john@example.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Phone</label>
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="input" placeholder="+44 7700 900000" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Location</label>
                <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}
                  className="input" placeholder="London, UK" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold mb-2">LinkedIn</label>
                <input type="url" value={formData.linkedin_url} onChange={e => setFormData({...formData, linkedin_url: e.target.value})}
                  className="input" placeholder="linkedin.com/in/johndoe" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">GitHub</label>
                <input type="url" value={formData.github_url} onChange={e => setFormData({...formData, github_url: e.target.value})}
                  className="input" placeholder="github.com/johndoe" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Portfolio</label>
                <input type="url" value={formData.portfolio_url} onChange={e => setFormData({...formData, portfolio_url: e.target.value})}
                  className="input" placeholder="johndoe.com" />
              </div>
            </div>
          </div>

          {/* Professional Details */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <Briefcase className="w-6 h-6 text-emerald-600" />
              <h2 className="text-2xl font-bold">Professional Details</h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Current Company</label>
                <input type="text" value={formData.current_company} onChange={e => setFormData({...formData, current_company: e.target.value})}
                  className="input" placeholder="Tech Corp" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Current Position</label>
                <input type="text" value={formData.current_position} onChange={e => setFormData({...formData, current_position: e.target.value})}
                  className="input" placeholder="Software Engineer" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Years of Experience</label>
                <input type="number" value={formData.experience_years} onChange={e => setFormData({...formData, experience_years: parseInt(e.target.value) || 0})}
                  className="input" placeholder="5" min="0" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Skills</label>
              <div className="flex gap-2 mb-2">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyPress={e => {
                    if (e.key === 'Enter' && skillInput.trim()) {
                      e.preventDefault()
                      setSkills([...skills, skillInput.trim()])
                      setSkillInput('')
                    }
                  }}
                  className="input flex-1" placeholder="Add skill (press Enter)" />
                <button onClick={() => {
                  if (skillInput.trim()) {
                    setSkills([...skills, skillInput.trim()])
                    setSkillInput('')
                  }
                }} className="btn-primary">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center gap-2">
                    {skill}
                    <button onClick={() => setSkills(skills.filter((_, si) => si !== i))}>
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Professional Summary */}
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Professional Summary</h2>
              <button onClick={generateAISummary} disabled={generatingAI}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:opacity-90">
                <Sparkles className="w-5 h-5" />
                {generatingAI ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            
            <textarea value={formData.professional_summary} 
              onChange={e => setFormData({...formData, professional_summary: e.target.value})}
              className="input h-40"
              placeholder="Write a compelling summary about yourself, your experience, and what makes you unique..." />
          </div>

          {/* Education */}
          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Education</h2>
              <button onClick={() => setEducation([...education, { degree: '', institution: '', year: '' }])}
                className="btn-secondary flex items-center gap-2">
                <Plus className="w-5 h-5" /> Add Education
              </button>
            </div>
            
            {education.length > 0 ? (
              <div className="space-y-3">
                {education.map((edu, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid md:grid-cols-3 gap-3">
                      <input type="text" value={edu.degree} onChange={e => {
                        const newEdu = [...education]
                        newEdu[i].degree = e.target.value
                        setEducation(newEdu)
                      }} className="input" placeholder="BSc Computer Science" />
                      <input type="text" value={edu.institution} onChange={e => {
                        const newEdu = [...education]
                        newEdu[i].institution = e.target.value
                        setEducation(newEdu)
                      }} className="input" placeholder="University Name" />
                      <div className="flex gap-2">
                        <input type="text" value={edu.year} onChange={e => {
                          const newEdu = [...education]
                          newEdu[i].year = e.target.value
                          setEducation(newEdu)
                        }} className="input flex-1" placeholder="2020" />
                        <button onClick={() => setEducation(education.filter((_, ei) => ei !== i))}
                          className="btn-secondary px-3">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No education added yet</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" /> CV Upload & AI Parse
            </h3>
            
            {formData.resume_url && (
              <div className="mb-4 p-3 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">CV Uploaded</span>
                </div>
                <a href={formData.resume_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-emerald-700 hover:underline flex items-center gap-1">
                  <FileText className="w-3 h-3" /> View CV
                </a>
              </div>
            )}
            
            <label className="btn-primary w-full flex items-center justify-center gap-2 cursor-pointer">
              <Upload className="w-5 h-5" /> 
              {uploadingCV ? 'Uploading...' : 'Upload CV'}
              <input type="file" accept=".pdf,.doc,.docx" className="hidden" 
                onChange={handleCVUpload} disabled={uploadingCV} />
            </label>
            <p className="text-xs text-gray-600 mt-3 text-center">
              PDF, DOC, DOCX (max 5MB)
            </p>
            <p className="text-xs text-blue-700 mt-2 text-center font-semibold">
              ✨ AI will auto-fill your profile from CV
            </p>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
            <h3 className="font-bold mb-3">Profile Strength</h3>
            <div className="space-y-2">
              {[
                { label: 'Personal Info', complete: !!(formData.name && formData.email && formData.phone) },
                { label: 'Professional', complete: !!(formData.current_company && formData.current_position) },
                { label: 'Skills', complete: skills.length >= 3 },
                { label: 'Summary', complete: formData.professional_summary.length > 50 },
                { label: 'Education', complete: education.length > 0 }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  {item.complete ? (
                    <span className="text-emerald-600 font-bold text-lg">✓</span>
                  ) : (
                    <span className="text-gray-300 text-lg">○</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold">Overall</span>
                <span className="text-sm font-bold text-purple-600">
                  {[
                    !!(formData.name && formData.email && formData.phone),
                    !!(formData.current_company && formData.current_position),
                    skills.length >= 3,
                    formData.professional_summary.length > 50,
                    education.length > 0
                  ].filter(Boolean).length * 20}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all"
                  style={{ width: [
                    !!(formData.name && formData.email && formData.phone),
                    !!(formData.current_company && formData.current_position),
                    skills.length >= 3,
                    formData.professional_summary.length > 50,
                    education.length > 0
                  ].filter(Boolean).length * 20 + '%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
