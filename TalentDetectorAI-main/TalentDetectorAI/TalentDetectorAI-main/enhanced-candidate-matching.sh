#!/bin/bash
# Complete AI Candidate Matching System for Agencies
# Run: bash enhanced-candidate-matching.sh

set -e

echo "🚀 Building Enhanced AI Candidate Matching System..."

cat > app/dashboard/agency/candidates/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Users, Sparkles, Loader2, Mail, Phone, MapPin, Briefcase, Award, TrendingUp, Star, CheckCircle, Filter, Search, ArrowRight } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get accepted jobs
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*, jobs(*)')
    .eq('agency_id', user?.id || '')
    .eq('status', 'accepted')
  
  // Get all candidates
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })
  
  // Get submission history
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

export default function CandidatesPage() {
  const { data, mutate } = useSWR('agency-candidates', fetcher, { refreshInterval: 5000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [matching, setMatching] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [skillFilter, setSkillFilter] = useState<string[]>([])
  const [minScore, setMinScore] = useState(60)

  // AI Matching Algorithm
  async function handleAIMatch() {
    if (!selectedJob) {
      toast.error('Select a job first')
      return
    }

    setMatching(true)
    try {
      const candidateMatches = (data?.candidates || []).map((candidate: any) => {
        let score = 0
        const strengths: string[] = []
        const gaps: string[] = []
        
        // Location match (20 points)
        if (candidate.location && selectedJob.location) {
          if (candidate.location.toLowerCase().includes(selectedJob.location.toLowerCase()) ||
              selectedJob.location.toLowerCase().includes(candidate.location.toLowerCase())) {
            score += 20
            strengths.push('Location match')
          } else {
            gaps.push('Different location')
          }
        }

        // Skills match (40 points)
        const candidateSkills = candidate.skills || []
        const requiredSkills = selectedJob.required_skills || []
        
        if (requiredSkills.length > 0) {
          const matchedSkills = candidateSkills.filter((skill: string) => 
            requiredSkills.some((req: string) => 
              skill.toLowerCase().includes(req.toLowerCase()) ||
              req.toLowerCase().includes(skill.toLowerCase())
            )
          )
          
          const skillMatchRate = matchedSkills.length / requiredSkills.length
          score += Math.round(skillMatchRate * 40)
          
          if (matchedSkills.length > 0) {
            strengths.push(`${matchedSkills.length}/${requiredSkills.length} skills match`)
          }
          if (matchedSkills.length < requiredSkills.length) {
            const missingSkills = requiredSkills.filter((req: string) => 
              !candidateSkills.some((skill: string) => 
                skill.toLowerCase().includes(req.toLowerCase())
              )
            )
            gaps.push(`Missing: ${missingSkills.slice(0, 3).join(', ')}`)
          }
        }

        // Experience level (20 points)
        if (candidate.years_of_experience) {
          const minExp = selectedJob.min_experience || 0
          const maxExp = selectedJob.max_experience || 20
          
          if (candidate.years_of_experience >= minExp && candidate.years_of_experience <= maxExp) {
            score += 20
            strengths.push(`${candidate.years_of_experience} years experience`)
          } else if (candidate.years_of_experience < minExp) {
            gaps.push('Less experience than required')
          }
        }

        // Salary expectations (10 points)
        if (candidate.expected_salary && selectedJob.salary_max) {
          if (candidate.expected_salary <= selectedJob.salary_max) {
            score += 10
            strengths.push('Salary expectations aligned')
          } else {
            gaps.push('Salary expectations too high')
          }
        }

        // Availability (10 points)
        if (candidate.available_from) {
          const availDate = new Date(candidate.available_from)
          const now = new Date()
          const daysUntilAvailable = Math.ceil((availDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          
          if (daysUntilAvailable <= 30) {
            score += 10
            strengths.push('Available soon')
          } else {
            gaps.push(`Available in ${daysUntilAvailable} days`)
          }
        }

        // Determine recommendation
        let recommendation = ''
        if (score >= 80) {
          recommendation = '🌟 Strong Match - Highly Recommended'
        } else if (score >= 60) {
          recommendation = '✅ Good Match - Recommended'
        } else if (score >= 40) {
          recommendation = '⚠️ Moderate Match - Consider with caution'
        } else {
          recommendation = '❌ Weak Match - Not recommended'
        }

        return {
          ...candidate,
          matchScore: score,
          recommendation,
          strengths,
          gaps
        }
      })

      // Sort by match score
      const sorted = candidateMatches.sort((a, b) => b.matchScore - a.matchScore)
      setMatches(sorted)
      toast.success(`✨ Matched ${sorted.length} candidates!`)
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setMatching(false)
    }
  }

  async function handleSubmitCandidate(candidate: any) {
    if (!selectedJob) {
      toast.error('No job selected')
      return
    }

    setSubmitting(candidate.id)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('applications').insert({
        job_id: selectedJob.id,
        candidate_id: candidate.id,
        submitted_by_agency_id: user?.id,
        status: 'pending',
        ai_match_score: candidate.matchScore || 0
      })

      if (error) throw error
      
      toast.success(`✅ ${candidate.name} submitted successfully!`)
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Submission failed')
    } finally {
      setSubmitting(null)
    }
  }

  // Filter candidates
  const filteredCandidates = (matches.length > 0 ? matches : data?.candidates || [])
    .filter((c: any) => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (matches.length > 0 && c.matchScore < minScore) return false
      if (skillFilter.length > 0 && !skillFilter.some(skill => c.skills?.includes(skill))) return false
      return true
    })

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="candidates" />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3">
            AI Candidate Matching
          </h1>
          <p className="text-xl text-gray-600">Find perfect candidates with intelligent matching</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Left Sidebar - Job Selection */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg sticky top-4">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-blue-600" />
                Select Job
              </h2>

              {data?.jobs && data.jobs.length > 0 ? (
                <div className="space-y-3">
                  {data.jobs.map((job: any) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`p-4 rounded-xl cursor-pointer transition border-2 ${
                        selectedJob?.id === job.id
                          ? 'border-blue-600 bg-blue-50 shadow-lg'
                          : 'border-gray-200 hover:border-blue-300 hover:shadow'
                      }`}>
                      <p className="font-bold text-gray-900 text-sm mb-1">{job.title}</p>
                      <p className="text-xs text-gray-600">{job.location}</p>
                      {selectedJob?.id === job.id && (
                        <div className="mt-2 flex items-center gap-1 text-blue-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-xs font-semibold">Selected</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No accepted jobs yet</p>
              )}

              {selectedJob && (
                <button
                  onClick={handleAIMatch}
                  disabled={matching}
                  className="w-full mt-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {matching ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Matching...</>
                  ) : (
                    <><Sparkles className="w-5 h-5" /> AI Match</>
                  )}
                </button>
              )}

              {/* Filters */}
              {matches.length > 0 && (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    Filters
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 mb-1 block">Min Match Score</label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={minScore}
                        onChange={(e) => setMinScore(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-600 mt-1">{minScore}%+</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Candidates */}
          <div className="md:col-span-3">
            {/* Search Bar */}
            <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidates by name..."
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-900">{filteredCandidates.length}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            {matches.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl p-4">
                  <Star className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{matches.filter(m => m.matchScore >= 80).length}</p>
                  <p className="text-xs opacity-90">Strong Matches</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl p-4">
                  <Award className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{matches.filter(m => m.matchScore >= 60 && m.matchScore < 80).length}</p>
                  <p className="text-xs opacity-90">Good Matches</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-xl p-4">
                  <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{Math.round(matches.reduce((acc, m) => acc + m.matchScore, 0) / matches.length) || 0}%</p>
                  <p className="text-xs opacity-90">Avg Score</p>
                </div>
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
                    className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition border-l-4"
                    style={{
                      borderLeftColor: candidate.matchScore >= 80 ? '#10b981' :
                                       candidate.matchScore >= 60 ? '#3b82f6' :
                                       candidate.matchScore >= 40 ? '#f59e0b' : '#ef4444'
                    }}>
                    
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{candidate.name}</h3>
                          {candidate.matchScore >= 80 && (
                            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                              ⭐ TOP MATCH
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                          {candidate.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" /> {candidate.email}
                            </span>
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

                        {/* Skills */}
                        {candidate.skills && candidate.skills.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {candidate.skills.slice(0, 8).map((skill: string, i: number) => {
                              const isMatched = selectedJob?.required_skills?.some((req: string) => 
                                skill.toLowerCase().includes(req.toLowerCase()) ||
                                req.toLowerCase().includes(skill.toLowerCase())
                              )
                              return (
                                <span
                                  key={i}
                                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                    isMatched
                                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                  {skill}
                                  {isMatched && ' ✓'}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* Match Details */}
                        {candidate.matchScore !== undefined && (
                          <div className="space-y-2">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-bold text-gray-900 mb-1">{candidate.recommendation}</p>
                              {candidate.strengths && candidate.strengths.length > 0 && (
                                <div className="text-xs text-emerald-700">
                                  <strong>✓ Strengths:</strong> {candidate.strengths.join(', ')}
                                </div>
                              )}
                              {candidate.gaps && candidate.gaps.length > 0 && (
                                <div className="text-xs text-amber-700 mt-1">
                                  <strong>⚠ Gaps:</strong> {candidate.gaps.join(', ')}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Match Score Circle */}
                      {candidate.matchScore !== undefined && (
                        <div className="text-center ml-4">
                          <div
                            className={'w-24 h-24 rounded-full flex flex-col items-center justify-center font-bold border-4 ' +
                              (candidate.matchScore >= 80 ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
                               candidate.matchScore >= 60 ? 'bg-blue-50 border-blue-500 text-blue-700' :
                               candidate.matchScore >= 40 ? 'bg-amber-50 border-amber-500 text-amber-700' :
                               'bg-red-50 border-red-500 text-red-700')}>
                            <span className="text-3xl">{candidate.matchScore}</span>
                            <span className="text-xs">MATCH</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submit Button */}
                    {selectedJob && (
                      <button
                        onClick={() => handleSubmitCandidate(candidate)}
                        disabled={submitting === candidate.id}
                        className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                        {submitting === candidate.id ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                        ) : (
                          <><CheckCircle className="w-5 h-5" /> Submit to {selectedJob.title}</>
                        )}
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {filteredCandidates.length === 0 && (
                <div className="bg-white rounded-2xl p-16 text-center shadow-lg">
                  <Users className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-gray-600 mb-3">
                    {matches.length > 0 ? 'No matches found' : 'No candidates available'}
                  </h3>
                  <p className="text-gray-500">
                    {matches.length > 0
                      ? 'Try adjusting your filters or select a different job'
                      : 'Start by selecting a job and running AI matching'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅✅✅ ENHANCED AI CANDIDATE MATCHING CREATED! ✅✅✅"
echo ""
echo "Features:"
echo "✓ AI-powered matching algorithm (100-point system)"
echo "✓ Location, skills, experience, salary matching"
echo "✓ Match score with color-coded visual indicators"
echo "✓ Strengths & gaps analysis"
echo "✓ Top match badges for 80%+ scores"
echo "✓ Real-time search & filters"
echo "✓ Skill highlighting (matched skills shown with ✓)"
echo "✓ Stats dashboard (strong/good matches)"
echo "✓ One-click candidate submission"
echo "✓ Responsive design with animations"
echo ""
echo "Matching Criteria:"
echo "• Location match: 20 points"
echo "• Skills match: 40 points"
echo "• Experience level: 20 points"
echo "• Salary alignment: 10 points"
echo "• Availability: 10 points"
echo ""
echo "Run: npm run dev"
echo ""
echo "Visit /dashboard/agency/candidates to start matching! 🎯"
