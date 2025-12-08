#!/bin/bash
# Update Candidate Page with Real Human Images & New Colors
# Run: bash update-candidate-design.sh

set -e

echo "🎨 Updating candidate page design with human images..."

cat > app/dashboard/agency/candidates/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Users, Sparkles, Loader2, Mail, Phone, MapPin, Briefcase, Award, TrendingUp, Star, CheckCircle, Filter, Search, Brain, Zap, Target, Activity } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

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
  
  const { data: submissions } = await supabase
    .from('applications')
    .select('*, candidates(*), jobs(*)')
    .eq('submitted_by_agency_id', user?.id || '')
  
  return {
    jobs: proposals?.map(p => p.jobs) || [],
    candidates: candidates || [],
    submissions: submissions || []
  }
}

// Advanced AI Matching Engine (same as before)
function calculateAdvancedMatch(candidate: any, job: any) {
  let totalScore = 0
  const breakdown: any = {}
  const strengths: string[] = []
  const gaps: string[] = []
  const heatMap: any = {}

  const candidateSkills = (candidate.skills || []).map((s: string) => s.toLowerCase())
  const requiredSkills = (job.required_skills || []).map((s: string) => s.toLowerCase())
  
  let skillScore = 0
  let matchedRequired = 0

  requiredSkills.forEach((req: string) => {
    if (candidateSkills.some(cs => cs.includes(req) || req.includes(cs))) {
      matchedRequired++
      skillScore += 35 / requiredSkills.length
    }
  })

  breakdown.skills = Math.round(skillScore)
  if (matchedRequired === requiredSkills.length) {
    strengths.push(`All ${requiredSkills.length} required skills matched`)
  } else if (matchedRequired > 0) {
    strengths.push(`${matchedRequired}/${requiredSkills.length} required skills`)
    gaps.push(`Missing ${requiredSkills.length - matchedRequired} required skills`)
  }

  const candidateExp = candidate.years_of_experience || 0
  const minExp = job.min_experience || 0
  const maxExp = job.max_experience || 20
  
  let expScore = 0
  if (candidateExp >= minExp && candidateExp <= maxExp) {
    expScore = 25
    strengths.push(`Perfect experience: ${candidateExp} years`)
  } else if (candidateExp < minExp) {
    expScore = Math.max(0, 25 - ((minExp - candidateExp) * 5))
    gaps.push(`${minExp - candidateExp} years less than required`)
  }
  breakdown.experience = expScore

  let eduScore = candidate.education ? 15 : 5
  breakdown.education = eduScore

  let locationScore = 0
  if (candidate.location && job.location) {
    if (candidate.location.toLowerCase() === job.location.toLowerCase()) {
      locationScore = 10
      strengths.push('Exact location match')
    } else if (candidate.location.toLowerCase().includes(job.location.toLowerCase())) {
      locationScore = 7
      strengths.push('Same region')
    } else {
      gaps.push('Different location')
    }
  }
  breakdown.location = locationScore

  let salaryScore = 5
  if (candidate.expected_salary && job.salary_max) {
    if (candidate.expected_salary <= job.salary_max) {
      salaryScore = 10
      strengths.push('Salary aligned')
    }
  }
  breakdown.salary = salaryScore

  let availScore = 3
  breakdown.availability = availScore

  totalScore = Math.round(breakdown.skills + breakdown.experience + breakdown.education + breakdown.location + breakdown.salary + breakdown.availability)

  let recommendation = ''
  let tier = ''
  
  if (totalScore >= 85) {
    recommendation = '🌟 Exceptional Match - PRIORITY CANDIDATE'
    tier = 'S-Tier'
  } else if (totalScore >= 75) {
    recommendation = '⭐ Strong Match - Highly Recommended'
    tier = 'A-Tier'
  } else if (totalScore >= 60) {
    recommendation = '✅ Good Match - Worth Considering'
    tier = 'B-Tier'
  } else if (totalScore >= 40) {
    recommendation = '⚠️ Moderate Match - Review Carefully'
    tier = 'C-Tier'
  } else {
    recommendation = '❌ Poor Match - Not Recommended'
    tier = 'D-Tier'
  }

  return { overallScore: totalScore, breakdown, strengths, gaps, recommendation, tier, heatMap }
}

export default function CandidatesPage() {
  const { data, mutate } = useSWR('agency-candidates-v2', fetcher, { refreshInterval: 5000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [matching, setMatching] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [minScore, setMinScore] = useState(0)

  async function handleAIMatch() {
    if (!selectedJob) {
      toast.error('Select a job first')
      return
    }

    setMatching(true)
    try {
      const candidateMatches = (data?.candidates || []).map((candidate: any) => {
        const analysis = calculateAdvancedMatch(candidate, selectedJob)
        return { ...candidate, matchScore: analysis.overallScore, breakdown: analysis.breakdown, recommendation: analysis.recommendation, tier: analysis.tier, strengths: analysis.strengths, gaps: analysis.gaps, heatMap: analysis.heatMap }
      })

      const sorted = candidateMatches.sort((a, b) => b.matchScore - a.matchScore)
      setMatches(sorted)
      toast.success(`✨ AI analyzed ${sorted.length} candidates!`)
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setMatching(false)
    }
  }

  async function handleSubmitCandidate(candidate: any) {
    setSubmitting(candidate.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('applications').insert({
        job_id: selectedJob.id,
        candidate_id: candidate.id,
        submitted_by_agency_id: user?.id,
        status: 'pending',
        ai_match_score: candidate.matchScore || 0
      })
      
      toast.success(`✅ ${candidate.name} submitted!`)
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSubmitting(null)
    }
  }

  const filteredCandidates = (matches.length > 0 ? matches : data?.candidates || [])
    .filter((c: any) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !c.email?.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (c.matchScore !== undefined && c.matchScore < minScore) return false
      return true
    })

  return (
    <div className="relative min-h-screen">
      {/* Real Human Team Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-cover bg-center" 
             style={{ 
               backgroundImage: 'url(https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80)',
               filter: 'brightness(0.25) blur(1px)' 
             }} />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-gray-900/95 to-zinc-900/95" />
        <div className="absolute inset-0" 
             style={{ 
               backgroundImage: 'linear-gradient(45deg, rgba(59, 130, 246, 0.05) 25%, transparent 25%, transparent 75%, rgba(59, 130, 246, 0.05) 75%), linear-gradient(45deg, rgba(59, 130, 246, 0.05) 25%, transparent 25%, transparent 75%, rgba(59, 130, 246, 0.05) 75%)', 
               backgroundSize: '60px 60px', 
               backgroundPosition: '0 0, 30px 30px' 
             }} />
      </div>

      <div className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-6xl font-bold mb-3 flex items-center gap-4">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-400 bg-clip-text text-transparent">
                AI Candidate Intelligence
              </span>
              <Brain className="w-16 h-16 text-cyan-400 animate-pulse" />
            </h1>
            <p className="text-xl text-cyan-200">Advanced neural matching • Real-time analysis • Predictive insights</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {/* Sidebar */}
            <div className="md:col-span-1 space-y-4">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 sticky top-4">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Target className="w-6 h-6" />
                  Select Target Job
                </h2>

                {data?.jobs && data.jobs.length > 0 ? (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {data.jobs.map((job: any) => (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJob(job)}
                        className={`p-4 rounded-xl cursor-pointer transition border-2 ${
                          selectedJob?.id === job.id
                            ? 'border-cyan-400 bg-cyan-500/30 shadow-lg shadow-cyan-500/50'
                            : 'border-white/10 hover:border-cyan-400/50 bg-white/5'
                        }`}>
                        <p className="font-bold text-white text-sm mb-1">{job.title}</p>
                        <p className="text-xs text-cyan-200">{job.location}</p>
                        {selectedJob?.id === job.id && (
                          <div className="mt-2 flex items-center gap-1 text-cyan-300">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-semibold">ACTIVE</span>
                          </div>
                        )}
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
                    className="w-full mt-6 bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 text-white py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-cyan-500/50 transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {matching ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Brain className="w-6 h-6" /> AI Deep Scan</>
                    )}
                  </button>
                )}

                {matches.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/20">
                    <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Smart Filters
                    </h3>
                    <div>
                      <label className="text-xs font-semibold text-cyan-200 mb-2 block">Minimum Match Score</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => setMinScore(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #06b6d4 0%, #22d3ee ${minScore}%, rgba(255,255,255,0.2) ${minScore}%, rgba(255,255,255,0.2) 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-cyan-200 mt-1">
                        <span>0%</span>
                        <span className="font-bold text-cyan-300">{minScore}%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3 space-y-6">
              {/* Search & Controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-300" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, email, skills..."
                      className="w-full pl-12 pr-4 py-4 bg-white/10 border-2 border-white/20 rounded-xl text-white placeholder-cyan-300 focus:border-cyan-400 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 px-6 py-2 bg-cyan-500/30 rounded-xl border border-cyan-400">
                    <Users className="w-6 h-6 text-cyan-300" />
                    <span className="text-2xl font-bold text-white">{filteredCandidates.length}</span>
                  </div>
                </div>
              </motion.div>

              {/* Stats Dashboard */}
              {matches.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-xl rounded-2xl p-6 border border-emerald-400/30">
                    <Star className="w-10 h-10 text-emerald-400 mb-3" />
                    <p className="text-3xl font-bold text-white mb-1">{matches.filter(m => m.tier === 'S-Tier').length}</p>
                    <p className="text-sm text-emerald-300">S-Tier (85%+)</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-6 border border-blue-400/30">
                    <Award className="w-10 h-10 text-blue-400 mb-3" />
                    <p className="text-3xl font-bold text-white mb-1">{matches.filter(m => m.tier === 'A-Tier').length}</p>
                    <p className="text-sm text-blue-300">A-Tier (75-84%)</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-6 border border-teal-400/30">
                    <TrendingUp className="w-10 h-10 text-teal-400 mb-3" />
                    <p className="text-3xl font-bold text-white mb-1">{Math.round(matches.reduce((acc, m) => acc + m.matchScore, 0) / matches.length) || 0}%</p>
                    <p className="text-sm text-teal-300">Avg Score</p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="bg-gradient-to-br from-sky-500/20 to-blue-500/20 backdrop-blur-xl rounded-2xl p-6 border border-sky-400/30">
                    <Activity className="w-10 h-10 text-sky-400 mb-3" />
                    <p className="text-3xl font-bold text-white mb-1">{matches.filter(m => m.matchScore >= 60).length}</p>
                    <p className="text-sm text-sky-300">Qualified</p>
                  </motion.div>
                </div>
              )}

              {/* Candidates List */}
              <div className="space-y-4">
                <AnimatePresence>
                  {filteredCandidates.map((candidate: any, index: number) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/20 hover:border-cyan-400/50 hover:shadow-2xl hover:shadow-cyan-500/20 transition-all duration-300"
                      style={{
                        borderLeftWidth: '6px',
                        borderLeftColor: candidate.tier === 'S-Tier' ? '#10b981' :
                                        candidate.tier === 'A-Tier' ? '#3b82f6' :
                                        candidate.tier === 'B-Tier' ? '#06b6d4' :
                                        candidate.tier === 'C-Tier' ? '#f59e0b' : '#ef4444'
                      }}>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-2xl font-bold text-white">{candidate.name}</h3>
                            {candidate.tier && (
                              <span className={`px-4 py-1 rounded-full text-xs font-bold ${
                                candidate.tier === 'S-Tier' ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                                candidate.tier === 'A-Tier' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                candidate.tier === 'B-Tier' ? 'bg-gradient-to-r from-teal-500 to-cyan-500' :
                                'bg-gradient-to-r from-amber-500 to-orange-500'
                              } text-white shadow-lg`}>
                                {candidate.tier}
                              </span>
                            )}
                            {candidate.matchScore >= 85 && <span className="animate-pulse">⭐</span>}
                          </div>

                          <div className="flex flex-wrap gap-3 text-sm text-cyan-200 mb-4">
                            {candidate.email && (
                              <a href={`mailto:${candidate.email}`} className="flex items-center gap-1 hover:text-cyan-400 transition">
                                <Mail className="w-4 h-4" /> {candidate.email}
                              </a>
                            )}
                            {candidate.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" /> {candidate.phone}
                              </span>
                            )}
                            {candidate.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" /> {candidate.location}
                              </span>
                            )}
                          </div>

                          {candidate.skills && candidate.skills.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {candidate.skills.slice(0, 10).map((skill: string, i: number) => {
                                const isMatched = selectedJob?.required_skills?.some((req: string) => 
                                  skill.toLowerCase().includes(req.toLowerCase()) ||
                                  req.toLowerCase().includes(skill.toLowerCase())
                                )
                                return (
                                  <span
                                    key={i}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                                      isMatched
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/50 border-2 border-emerald-300'
                                        : 'bg-white/10 text-cyan-200 border border-white/20'
                                    }`}>
                                    {skill}
                                    {isMatched && ' ✓'}
                                  </span>
                                )
                              })}
                            </div>
                          )}

                          {candidate.matchScore !== undefined && (
                            <div className="space-y-3">
                              <div className={`inline-block px-4 py-2 rounded-xl font-bold text-sm ${
                                candidate.matchScore >= 85 ? 'bg-gradient-to-r from-emerald-500 to-green-500' :
                                candidate.matchScore >= 75 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                                candidate.matchScore >= 60 ? 'bg-gradient-to-r from-teal-500 to-cyan-500' :
                                'bg-gradient-to-r from-amber-500 to-orange-500'
                              } text-white shadow-lg`}>
                                {candidate.recommendation}
                              </div>

                              {candidate.strengths && candidate.strengths.length > 0 && (
                                <div className="bg-emerald-500/10 rounded-xl p-3 border border-emerald-400/30">
                                  <p className="text-xs font-bold text-emerald-400 mb-2">✓ STRENGTHS</p>
                                  <ul className="text-xs text-emerald-200 space-y-1">
                                    {candidate.strengths.slice(0, 3).map((s: string, i: number) => (
                                      <li key={i}>• {s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {candidate.matchScore !== undefined && (
                          <div className="text-center ml-6">
                            <div
                              className={`w-28 h-28 rounded-full flex flex-col items-center justify-center font-bold border-4 shadow-2xl ${
                                candidate.matchScore >= 85 ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-300 shadow-emerald-500/50' :
                                candidate.matchScore >= 75 ? 'bg-gradient-to-br from-blue-500 to-cyan-600 border-blue-300 shadow-blue-500/50' :
                                candidate.matchScore >= 60 ? 'bg-gradient-to-br from-teal-500 to-cyan-600 border-teal-300 shadow-teal-500/50' :
                                'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-300 shadow-amber-500/50'
                              } text-white`}>
                              <span className="text-4xl">{candidate.matchScore}</span>
                              <span className="text-xs opacity-90">MATCH</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {selectedJob && (
                        <button
                          onClick={() => handleSubmitCandidate(candidate)}
                          disabled={submitting === candidate.id}
                          className="w-full bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white py-4 rounded-xl font-bold hover:shadow-2xl hover:shadow-emerald-500/50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
                          {submitting === candidate.id ? (
                            <><Loader2 className="w-6 h-6 animate-spin" /> Submitting...</>
                          ) : (
                            <><CheckCircle className="w-6 h-6" /> Submit to {selectedJob.title}</>
                          )}
                        </button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filteredCandidates.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-white/10 backdrop-blur-xl rounded-3xl p-20 text-center border border-white/20">
                    <Users className="w-32 h-32 text-cyan-300 mx-auto mb-8" />
                    <h3 className="text-3xl font-bold text-white mb-4">
                      {matches.length > 0 ? 'No Matches Found' : 'Ready to Discover Talent'}
                    </h3>
                    <p className="text-xl text-cyan-200">
                      {matches.length > 0 ? 'Adjust filters or select a different job' : 'Select a job and run AI Deep Scan to find perfect candidates'}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.5);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.7);
        }
      `}</style>
    </div>
  )
}
ENDFILE

echo ""
echo "✅✅✅ DESIGN UPDATED! ✅✅✅"
echo ""
echo "New Design Features:"
echo "✓ Real human team office background"
echo "✓ Cyan/Blue/Teal color scheme (no purple/indigo)"
echo "✓ Glassmorphism with office photo blur"
echo "✓ Professional business aesthetic"
echo "✓ Darker overlay for better readability"
echo ""
echo "Color Palette:"
echo "• Primary: Cyan (#06b6d4)"
echo "• Secondary: Blue (#3b82f6)"  
echo "• Accent: Teal (#14b8a6)"
echo "• Success: Emerald (#10b981)"
echo "• Warning: Amber (#f59e0b)"
echo ""
echo "Background: Real office teamwork photo from Unsplash"
echo ""
echo "Run: npm run dev"
echo ""
echo "Visit /dashboard/agency/candidates for the new look! 🎨"
