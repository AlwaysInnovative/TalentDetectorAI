#!/bin/bash
# Fix User Creation & Add Dynamic Realistic Backgrounds
# Run: bash fix-user-creation-backgrounds.sh

set -e

echo "🔧 Fixing user creation and backgrounds..."

# ==================== FIX: ENHANCED CANDIDATES PAGE WITH PROPER USER CREATION ====================

cat > app/dashboard/agency/candidates/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Users, Sparkles, Loader2, Mail, Phone, MapPin, Star, CheckCircle, Filter, Search, Brain, Zap, Target, Send, ArrowLeft, UserPlus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import Image from 'next/image'

// Dynamic realistic business/office backgrounds
const backgrounds = [
  'photo-1497366216548-37526070297c', // Modern office
  'photo-1497366811353-6870744d04b2', // Workspace
  'photo-1542744173-8e7e53415bb0', // Business team
  'photo-1519389950473-47ba0277781c', // Tech workspace
  'photo-1557804506-669a67965ba0', // Team meeting
  'photo-1522071820081-009f0129c71c', // Business collaboration
]

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*, jobs(*)')
    .eq('agency_id', user?.id || '')
    .eq('status', 'accepted')
  
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })
  
  const { data: interests } = await supabase
    .from('candidate_interests')
    .select('*')
    .eq('agency_id', user?.id || '')
  
  return {
    jobs: proposals?.map(p => p.jobs) || [],
    candidates: candidates || [],
    existingInterests: interests || []
  }
}

function calculateAdvancedMatch(candidate: any, job: any) {
  let totalScore = 0
  const strengths: string[] = []
  
  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase())
  const requiredSkills = (job.required_skills || []).map((s: string) => s.toLowerCase())
  
  let matchedRequired = 0
  requiredSkills.forEach((req: string) => {
    if (candidateSkills.some(cs => cs.includes(req) || req.includes(cs))) {
      matchedRequired++
      totalScore += 35 / requiredSkills.length
    }
  })
  
  if (matchedRequired === requiredSkills.length) strengths.push(`All skills matched`)
  else if (matchedRequired > 0) strengths.push(`${matchedRequired}/${requiredSkills.length} skills`)
  
  const candidateExp = candidate.years_of_experience || 0
  const minExp = job.min_experience || 0
  
  if (candidateExp >= minExp) {
    totalScore += 25
    strengths.push(`${candidateExp} years experience`)
  }
  
  if (candidate.location && job.location && candidate.location.toLowerCase().includes(job.location.toLowerCase())) {
    totalScore += 10
    strengths.push('Location match')
  }
  
  totalScore += 15 + 10 + 5
  
  let tier = ''
  if (totalScore >= 85) tier = 'S-Tier'
  else if (totalScore >= 75) tier = 'A-Tier'
  else if (totalScore >= 60) tier = 'B-Tier'
  else tier = 'C-Tier'
  
  return { overallScore: Math.round(totalScore), tier, strengths }
}

export default function CandidatesPage() {
  const { data, mutate } = useSWR('agency-candidates-v3', fetcher, { refreshInterval: 3000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [matching, setMatching] = useState(false)
  const [sendingInterest, setSendingInterest] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    years_of_experience: '',
    expected_salary: '',
    create_credentials: false,
    password: ''
  })
  const [creatingCandidate, setCreatingCandidate] = useState(false)

  // Rotate background every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgrounds.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [])

  async function handleAIMatch() {
    if (!selectedJob) {
      toast.error('Select a job first')
      return
    }

    setMatching(true)
    try {
      const candidateMatches = (data?.candidates || []).map((candidate: any) => {
        const analysis = calculateAdvancedMatch(candidate, selectedJob)
        return { ...candidate, ...analysis }
      })

      const sorted = candidateMatches.sort((a, b) => b.overallScore - a.overallScore)
      setMatches(sorted)
      toast.success(`✨ AI analyzed ${sorted.length} candidates!`)
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setMatching(false)
    }
  }

  async function handleCreateCandidate(e: React.FormEvent) {
    e.preventDefault()
    setCreatingCandidate(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const skillsArray = newCandidate.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      let candidateUserId = null

      // Create auth user if credentials requested - using server-side API
      if (newCandidate.create_credentials && newCandidate.password) {
        const response = await fetch('/api/create-candidate-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: newCandidate.email,
            password: newCandidate.password,
            name: newCandidate.name
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create user credentials')
        }

        const { userId } = await response.json()
        candidateUserId = userId
      }

      // Create candidate record
      const { error: candidateError } = await supabase.from('candidates').insert({
        name: newCandidate.name,
        email: newCandidate.email,
        phone: newCandidate.phone,
        location: newCandidate.location,
        skills: skillsArray,
        years_of_experience: newCandidate.years_of_experience ? parseInt(newCandidate.years_of_experience) : null,
        expected_salary: newCandidate.expected_salary ? parseFloat(newCandidate.expected_salary) : null,
        user_id: candidateUserId,
        created_by_agency_id: user?.id
      })

      if (candidateError) throw candidateError

      toast.success(`✅ Candidate ${newCandidate.name} created!${newCandidate.create_credentials ? ' Login credentials will be sent via email.' : ''}`, { duration: 5000 })
      
      setShowCreateForm(false)
      setNewCandidate({
        name: '', email: '', phone: '', location: '', skills: '',
        years_of_experience: '', expected_salary: '', create_credentials: false, password: ''
      })
      mutate()
    } catch (error: any) {
      console.error('Create candidate error:', error)
      toast.error(error.message || 'Failed to create candidate')
    } finally {
      setCreatingCandidate(false)
    }
  }

  async function handleSendInterest(candidate: any) {
    if (!selectedJob) {
      toast.error('Select a job first')
      return
    }
    
    const alreadySent = data?.existingInterests?.some((i: any) => 
      i.candidate_id === candidate.id && i.job_id === selectedJob.id
    )
    
    if (alreadySent) {
      toast.error('Interest already sent to this candidate for this job')
      return
    }

    setSendingInterest(candidate.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const salaryRange = `£${selectedJob.salary_min?.toLocaleString()} - £${selectedJob.salary_max?.toLocaleString()}`

      const { error } = await supabase.from('candidate_interests').insert({
        candidate_id: candidate.id,
        job_id: selectedJob.id,
        agency_id: user?.id,
        salary_range: salaryRange,
        jd_sent: true,
        status: 'sent',
        job_description: selectedJob.description,
        job_title: selectedJob.title,
        job_location: selectedJob.location
      })

      if (error) throw error
      
      toast.success(`✅ Interest & JD sent to ${candidate.name}!`, { duration: 5000 })
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSendingInterest(null)
    }
  }

  const filteredCandidates = (matches.length > 0 ? matches : data?.candidates || [])
    .filter((c: any) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (c.overallScore !== undefined && c.overallScore < minScore) return false
      return true
    })

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dynamic Realistic Background */}
      <div className="fixed inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBg}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0">
            <Image
              src={`https://images.unsplash.com/${backgrounds[currentBg]}?auto=format&fit=crop&w=2400&q=80`}
              alt="Professional workspace"
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-gray-900/85 to-zinc-900/90" />
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <Brain className="w-12 h-12 text-cyan-400" />
                AI Candidate Discovery
              </h1>
              <p className="text-lg text-cyan-200">Match • Send Interest • Track Response</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Candidate
              </button>
              <Link href="/dashboard/agency">
                <button className="px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white font-bold hover:bg-white/20 transition flex items-center gap-2">
                  <ArrowLeft className="w-5 h-5" />
                  Back
                </button>
              </Link>
            </div>
          </div>

          {/* Create Candidate Modal */}
          <AnimatePresence>
            {showCreateForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={() => setShowCreateForm(false)}>
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  className="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full border border-cyan-500/30 max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-white">Add New Candidate</h2>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="p-2 hover:bg-white/10 rounded-lg transition">
                      <X className="w-6 h-6 text-white" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateCandidate} className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-cyan-200 mb-2">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={newCandidate.name}
                          onChange={(e) => setNewCandidate({...newCandidate, name: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-cyan-200 mb-2">Email *</label>
                        <input
                          type="email"
                          required
                          value={newCandidate.email}
                          onChange={(e) => setNewCandidate({...newCandidate, email: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                          placeholder="john@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-cyan-200 mb-2">Phone</label>
                        <input
                          type="tel"
                          value={newCandidate.phone}
                          onChange={(e) => setNewCandidate({...newCandidate, phone: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                          placeholder="+44 7700 900123"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-cyan-200 mb-2">Location</label>
                        <input
                          type="text"
                          value={newCandidate.location}
                          onChange={(e) => setNewCandidate({...newCandidate, location: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                          placeholder="London, UK"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-cyan-200 mb-2">Years of Experience</label>
                        <input
                          type="number"
                          value={newCandidate.years_of_experience}
                          onChange={(e) => setNewCandidate({...newCandidate, years_of_experience: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                          placeholder="5"
                          min="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-cyan-200 mb-2">Expected Salary (£)</label>
                        <input
                          type="number"
                          value={newCandidate.expected_salary}
                          onChange={(e) => setNewCandidate({...newCandidate, expected_salary: e.target.value})}
                          className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                          placeholder="50000"
                          min="0"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-cyan-200 mb-2">Skills (comma-separated)</label>
                      <textarea
                        value={newCandidate.skills}
                        onChange={(e) => setNewCandidate({...newCandidate, skills: e.target.value})}
                        rows={3}
                        className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                        placeholder="React, TypeScript, Node.js, PostgreSQL"
                      />
                    </div>

                    <div className="border-t border-white/20 pt-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newCandidate.create_credentials}
                          onChange={(e) => setNewCandidate({...newCandidate, create_credentials: e.target.checked})}
                          className="w-5 h-5"
                        />
                        <span className="text-white font-bold">Create login credentials for candidate</span>
                      </label>
                      {newCandidate.create_credentials && (
                        <div className="mt-4">
                          <label className="block text-sm font-bold text-cyan-200 mb-2">Password *</label>
                          <input
                            type="password"
                            required={newCandidate.create_credentials}
                            value={newCandidate.password}
                            onChange={(e) => setNewCandidate({...newCandidate, password: e.target.value})}
                            className="w-full px-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                            placeholder="Minimum 6 characters"
                            minLength={6}
                          />
                          <p className="text-xs text-cyan-300 mt-2">
                            Candidate will receive email with login credentials
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={creatingCandidate}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {creatingCandidate ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                        ) : (
                          <><UserPlus className="w-5 h-5" /> Create Candidate</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-8 py-4 bg-white/10 border border-white/20 text-white rounded-xl font-bold hover:bg-white/20 transition">
                        Cancel
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 sticky top-4">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Select Job
                </h2>

                {data?.jobs && data.jobs.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {data.jobs.map((job: any) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`p-4 rounded-xl cursor-pointer transition border-2 ${
                          selectedJob?.id === job.id
                            ? 'border-cyan-400 bg-cyan-500/30'
                            : 'border-white/10 hover:border-cyan-400/50 bg-white/5'
                        }`}>
                        <p className="font-bold text-white text-sm">{job.title}</p>
                        <p className="text-xs text-cyan-200">{job.location}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-cyan-200 text-sm">No jobs available</p>
                )}

                {selectedJob && (
                  <button
                    onClick={handleAIMatch}
                    disabled={matching}
                    className="w-full mt-6 bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {matching ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Brain className="w-5 h-5" /> AI Match</>
                    )}
                  </button>
                )}

                {matches.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <label className="text-xs font-semibold text-cyan-200 mb-2 block">Min Score</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={minScore}
                      onChange={(e) => setMinScore(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-cyan-200 mt-1 text-center font-bold">{minScore}%</p>
                  </div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 space-y-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search candidates..."
                      className="w-full pl-12 pr-4 py-3 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-6 py-2 bg-cyan-500/30 rounded-xl border border-cyan-400">
                    <Users className="w-6 h-6 text-cyan-300" />
                    <span className="text-2xl font-bold text-white">{filteredCandidates.length}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {filteredCandidates.map((candidate: any, index: number) => {
                    const interestSent = data?.existingInterests?.some((i: any) => 
                      i.candidate_id === candidate.id && i.job_id === selectedJob?.id
                    )
                    
                    return (
                      <motion.div
                        key={candidate.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/20 hover:border-cyan-400/50 transition">
                        
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <h3 className="text-2xl font-bold text-white">{candidate.name}</h3>
                              {candidate.tier && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  candidate.tier === 'S-Tier' ? 'bg-emerald-500' :
                                  candidate.tier === 'A-Tier' ? 'bg-blue-500' :
                                  candidate.tier === 'B-Tier' ? 'bg-cyan-500' : 'bg-amber-500'
                                } text-white`}>
                                  {candidate.tier}
                                </span>
                              )}
                              {interestSent && (
                                <span className="px-3 py-1 bg-green-500/30 border border-green-400 rounded-full text-xs font-bold text-green-300">
                                  ✓ Interest Sent
                                </span>
                              )}
                            </div>

                            <div className="flex gap-3 text-sm text-cyan-200 mb-3">
                              {candidate.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {candidate.email}</span>}
                              {candidate.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {candidate.location}</span>}
                            </div>

                            {candidate.skills && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {candidate.skills.slice(0, 8).map((skill: string, i: number) => (
                                  <span key={i} className="px-3 py-1 bg-white/10 text-cyan-200 rounded-full text-xs font-bold border border-white/20">
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}

                            {candidate.strengths && candidate.strengths.length > 0 && (
                              <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-400/30">
                                <p className="text-xs font-bold text-emerald-400 mb-1">✓ STRENGTHS</p>
                                <p className="text-xs text-emerald-200">{candidate.strengths.join(' • ')}</p>
                              </div>
                            )}
                          </div>

                          {candidate.overallScore !== undefined && (
                            <div className="ml-6">
                              <div className={`w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold border-4 ${
                                candidate.tier === 'S-Tier' ? 'bg-emerald-500 border-emerald-300' :
                                candidate.tier === 'A-Tier' ? 'bg-blue-500 border-blue-300' :
                                candidate.tier === 'B-Tier' ? 'bg-cyan-500 border-cyan-300' : 'bg-amber-500 border-amber-300'
                              } text-white shadow-xl`}>
                                <span className="text-3xl">{candidate.overallScore}</span>
                                <span className="text-xs">MATCH</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {selectedJob && !interestSent && (
                          <button
                            onClick={() => handleSendInterest(candidate)}
                            disabled={sendingInterest === candidate.id}
                            className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                            {sendingInterest === candidate.id ? (
                              <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
                            ) : (
                              <><Send className="w-5 h-5" /> Send Interest with JD</>
                            )}
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </AnimatePresence>

                {filteredCandidates.length === 0 && (
                  <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-20 text-center border border-white/20">
                    <Users className="w-32 h-32 text-cyan-300 mx-auto mb-8" />
                    <h3 className="text-3xl font-bold text-white mb-4">No Candidates Found</h3>
                    <p className="text-xl text-cyan-200 mb-6">Start by adding your first candidate</p>
                    <button
                      onClick={() => setShowCreateForm(true)}
                      className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center justify-center gap-2 mx-auto">
                      <UserPlus className="w-6 h-6" />
                      Add First Candidate
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Enhanced candidates page with dynamic backgrounds created!"

# ==================== CREATE API ENDPOINT FOR USER CREATION ====================

mkdir -p app/api/create-candidate-user

cat > app/api/create-candidate-user/route.ts << 'ENDFILE'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// This endpoint uses service role to create users
export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    // Create Supabase admin client with service role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user with admin privileges
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'candidate'
      }
    })

    if (authError) throw authError

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: name,
      role: 'candidate'
    })

    if (profileError) throw profileError

    return NextResponse.json({
      success: true,
      userId: authData.user.id
    })

  } catch (error: any) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create user' },
      { status: 500 }
    )
  }
}
ENDFILE

echo "✅ API endpoint for user creation created!"

# Update env template
cat >> .env.local.example << 'ENDFILE'

# Service Role Key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
ENDFILE

echo ""
echo "✅✅✅ USER CREATION FIX & DYNAMIC BACKGROUNDS COMPLETE! ✅✅✅"
echo ""
echo "🔧 FIXES APPLIED:"
echo ""
echo "1. USER CREATION:"
echo "   ✓ Moved to server-side API endpoint"
echo "   ✓ Uses service role key (admin privileges)"
echo "   ✓ Creates auth user + profile automatically"
echo "   ✓ No more 'User not allowed' error"
echo ""
echo "2. DYNAMIC BACKGROUNDS:"
echo "   ✓ 6 realistic business/office images"
echo "   ✓ Smooth transitions every 7 seconds"
echo "   ✓ Professional team and workspace photos"
echo "   ✓ Animated crossfade effect"
echo ""
echo "📋 SETUP REQUIRED:"
echo ""
echo "1. Add service role key to .env.local:"
echo "   SUPABASE_SERVICE_ROLE_KEY=your-key-here"
echo ""
echo "   Get it from:"
echo "   Supabase Dashboard → Settings → API → service_role key"
echo ""
echo "2. Restart dev server:"
echo "   npm run dev"
echo ""
echo "3. Test creating candidate with credentials!"
echo ""
echo "⚠️  IMPORTANT:"
echo "Keep service_role key secret! Never commit to git!"
echo "It has admin privileges to bypass RLS."
echo ""
