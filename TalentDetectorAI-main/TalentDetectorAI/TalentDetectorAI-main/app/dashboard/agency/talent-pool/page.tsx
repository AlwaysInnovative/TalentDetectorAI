'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Plus, Upload, Sparkles, Download, Users, Search, Filter } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { parseCV, calculateProfileCompleteness } from '@/lib/agency/cv-parser/parser'
import { enrichCandidateProfile } from '@/lib/agency/ai-matching/matcher'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: candidates } = await supabase
    .from('agency_candidates')
    .select('*')
    .eq('agency_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  return candidates || []
}

export default function TalentPool() {
  const { data: candidates, mutate } = useSWR('talent-pool', fetcher, { refreshInterval: 3000 })
  const [showAddForm, setShowAddForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    currentRole: '',
    experienceYears: '',
    skills: [] as string[],
    summary: ''
  })
  const [skillInput, setSkillInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [enriching, setEnriching] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  async function handleCVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const parsed = await parseCV(file)
      
      setFormData({
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone || '',
        currentRole: parsed.experience[0]?.title || '',
        experienceYears: parsed.experienceYears.toString(),
        skills: parsed.skills,
        summary: parsed.summary
      })
      
      toast.success('✨ CV parsed successfully!')
    } catch (error) {
      toast.error('Failed to parse CV')
    } finally {
      setUploading(false)
    }
  }

  async function handleAddCandidate() {
    if (!formData.name || !formData.email) {
      toast.error('Name and email required')
      return
    }
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const completeness = calculateProfileCompleteness({
        ...formData,
        experience_years: parseInt(formData.experienceYears) || 0
      })
      
      const { error } = await supabase.from('agency_candidates').insert({
        agency_id: user?.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role_title: formData.currentRole,
        experience_years: parseInt(formData.experienceYears) || 0,
        skills: formData.skills,
        summary: formData.summary,
        profile_completeness: completeness
      })
      
      if (error) throw error
      
      toast.success('✅ Candidate added to talent pool!')
      setShowAddForm(false)
      setFormData({ name: '', email: '', phone: '', currentRole: '', experienceYears: '', skills: [], summary: '' })
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to add candidate')
    }
  }

  async function handleEnrichProfile(candidateId: string) {
    setEnriching(candidateId)
    try {
      const candidate = candidates?.find(c => c.id === candidateId)
      if (!candidate) return
      
      const enrichment = await enrichCandidateProfile(candidate)
      
      const supabase = createClient()
      await supabase.from('agency_candidates')
        .update({ 
          ai_enrichment: enrichment,
          summary: enrichment.suggestedSummary
        })
        .eq('id', candidateId)
      
      toast.success('✨ Profile enriched with AI!')
      mutate()
    } catch (error) {
      toast.error('Enrichment failed')
    } finally {
      setEnriching(null)
    }
  }

  const filteredCandidates = candidates?.filter(c => 
    searchTerm === '' || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      <DynamicBackground page="candidates" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Talent Pool
          </h1>
          <p className="text-gray-600">Your candidate repository with AI enrichment</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddForm(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Add Candidate
          </button>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            <Upload className="w-5 h-5" /> Bulk Upload
            <input type="file" accept=".csv,.xlsx" className="hidden" />
          </label>
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Total Candidates', value: candidates?.length || 0, color: 'blue' },
          { label: 'Avg Completeness', value: Math.round((candidates?.reduce((s, c) => s + c.profile_completeness, 0) || 0) / (candidates?.length || 1)) + '%', color: 'emerald' },
          { label: 'AI Enriched', value: candidates?.filter(c => c.ai_enrichment).length || 0, color: 'purple' },
          { label: 'Submitted', value: 0, color: 'yellow' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={'card bg-gradient-to-br from-' + stat.color + '-50 to-white border-2 border-' + stat.color + '-200'}>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
              placeholder="Search candidates..." />
          </div>
          <button className="btn-secondary flex items-center gap-2">
            <Filter className="w-5 h-5" /> Filters
          </button>
        </div>
      </div>

      {/* Add Candidate Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="card mb-6 border-2 border-primary-200">
            <h3 className="text-xl font-bold mb-4">Add New Candidate</h3>
            
            <div className="mb-4">
              <label className="btn-secondary w-full flex items-center justify-center gap-2 cursor-pointer">
                <Upload className="w-5 h-5" />
                {uploading ? 'Parsing CV...' : 'Upload CV to Auto-Fill'}
                <input type="file" accept=".pdf,.doc,.docx" onChange={handleCVUpload} className="hidden" />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                className="input" placeholder="Full Name *" />
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}
                className="input" placeholder="Email *" />
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                className="input" placeholder="Phone" />
              <input type="text" value={formData.currentRole} onChange={e => setFormData({...formData, currentRole: e.target.value})}
                className="input" placeholder="Current Role" />
              <input type="number" value={formData.experienceYears} onChange={e => setFormData({...formData, experienceYears: e.target.value})}
                className="input" placeholder="Years of Experience" />
            </div>

            <div className="mb-4">
              <div className="flex gap-2 mb-2">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), setFormData({...formData, skills: [...formData.skills, skillInput]}), setSkillInput(''))}
                  className="input flex-1" placeholder="Add skills" />
                <button onClick={() => {setFormData({...formData, skills: [...formData.skills, skillInput]}); setSkillInput('')}}
                  className="btn-primary">Add</button>
              </div>
              {formData.skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <textarea value={formData.summary} onChange={e => setFormData({...formData, summary: e.target.value})}
              className="input h-24 mb-4" placeholder="Professional summary..." />

            <div className="flex gap-3">
              <button onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddCandidate} className="btn-primary flex-1">Add Candidate</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Candidates List */}
      {filteredCandidates && filteredCandidates.length > 0 ? (
        <div className="grid gap-4">
          {filteredCandidates.map((candidate: any, i: number) => (
            <motion.div
              key={candidate.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {candidate.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold">{candidate.name}</h3>
                    <div className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                      (candidate.profile_completeness >= 80 ? 'bg-emerald-100 text-emerald-700' :
                       candidate.profile_completeness >= 50 ? 'bg-yellow-100 text-yellow-700' :
                       'bg-red-100 text-red-700')}>
                      {candidate.profile_completeness}% Complete
                    </div>
                    {candidate.ai_enrichment && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Enriched
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{candidate.email} • {candidate.phone}</p>
                  <p className="text-sm text-gray-700 mb-3">{candidate.role_title} • {candidate.experience_years} years exp</p>
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {candidate.skills.slice(0, 5).map((skill: string, si: number) => (
                        <span key={si} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                  {candidate.summary && (
                    <p className="text-sm text-gray-600 line-clamp-2">{candidate.summary}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleEnrichProfile(candidate.id)}
                    disabled={enriching === candidate.id}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {enriching === candidate.id ? 'Enriching...' : 'AI Enrich'}
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    Match Jobs
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-4">
            {searchTerm ? 'No candidates match your search' : 'No candidates in talent pool yet'}
          </p>
          <button onClick={() => setShowAddForm(true)} className="btn-primary">
            Add First Candidate
          </button>
        </div>
      )}
    </div>
  )
}
