'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, Award, Target, MessageSquare, Bookmark, XCircle, CheckCircle, Users } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { generateCandidateScorecard } from '@/lib/ai/evaluation/candidate-evaluator'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: applications } = await supabase
    .from('applications')
    .select('*, candidates(*), jobs!inner(manager_id, *)')
    .eq('jobs.manager_id', user?.id || '')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  
  return applications || []
}

export default function CandidateEvaluation() {
  const { data: candidates, mutate } = useSWR('candidates-evaluate', fetcher)
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [evaluation, setEvaluation] = useState<any>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [comment, setComment] = useState('')
  const [showComments, setShowComments] = useState(false)

  async function evaluateCandidate(candidate: any) {
    setEvaluating(true)
    setSelectedCandidate(candidate)
    try {
      const result = await generateCandidateScorecard(candidate.candidates, candidate.jobs)
      setEvaluation(result)
      
      // Update match score
      const supabase = createClient()
      await supabase.from('applications')
        .update({ ai_match_score: result.matchScore })
        .eq('id', candidate.id)
      
      toast.success('✨ AI evaluation complete!')
      mutate()
    } catch (error) {
      toast.error('Evaluation failed')
    } finally {
      setEvaluating(false)
    }
  }

  async function handleAction(candidateId: string, action: 'shortlist' | 'reject' | 'interview') {
    const supabase = createClient()
    const status = action === 'shortlist' ? 'screening' : action === 'reject' ? 'rejected' : 'interview'
    
    const { error } = await supabase.from('applications')
      .update({ status })
      .eq('id', candidateId)
    
    if (error) {
      toast.error('Failed to update')
    } else {
      toast.success(`Candidate ${action}ed!`)
      mutate()
      setSelectedCandidate(null)
      setEvaluation(null)
    }
  }

  async function addComment() {
    if (!comment.trim() || !selectedCandidate) return
    
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase.from('candidate_comments').insert({
      application_id: selectedCandidate.id,
      user_id: user?.id,
      comment: comment.trim()
    })
    
    if (error) {
      toast.error('Failed to add comment')
    } else {
      toast.success('Comment added')
      setComment('')
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="candidates" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          AI-Powered Candidate Evaluation
        </h1>
        <p className="text-gray-600">Comprehensive assessment with AI insights</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Candidate List */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Pending Evaluation ({candidates?.length || 0})</h2>
            <Link href="/dashboard/manager/candidates">
              <button className="btn-secondary text-sm">View All</button>
            </Link>
          </div>
          
          {candidates && candidates.length > 0 ? (
            <div className="space-y-4">
              {candidates.map((candidate: any, i: number) => (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => evaluateCandidate(candidate)}
                  className={'card cursor-pointer transition-all ' + 
                    (selectedCandidate?.id === candidate.id ? 'ring-2 ring-purple-600 bg-purple-50' : 'hover:shadow-lg')}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {candidate.candidates?.name?.charAt(0) || 'C'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{candidate.candidates?.name}</p>
                      <p className="text-sm text-gray-600">{candidate.candidates?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Applied for: {candidate.jobs?.title}
                      </p>
                      {candidate.ai_match_score && (
                        <div className="mt-2">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded font-semibold">
                            {candidate.ai_match_score}% Match
                          </span>
                        </div>
                      )}
                    </div>
                    <Sparkles className="w-6 h-6 text-purple-600" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-20">
              <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No candidates pending evaluation</p>
            </div>
          )}
        </div>

        {/* Evaluation Panel */}
        <div>
          {evaluating ? (
            <div className="card text-center py-20">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">AI analyzing candidate...</p>
            </div>
          ) : evaluation && selectedCandidate ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6">
              {/* Scorecard */}
              <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold">AI Scorecard</h3>
                  <div className="text-center">
                    <div className={'w-24 h-24 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg bg-gradient-to-br ' +
                      (evaluation.matchScore >= 80 ? 'from-emerald-500 to-emerald-600' :
                       evaluation.matchScore >= 60 ? 'from-blue-500 to-blue-600' :
                       'from-gray-400 to-gray-500')}>
                      <span className="text-4xl font-bold">{evaluation.matchScore}</span>
                      <span className="text-xs">Match</span>
                    </div>
                  </div>
                </div>

                {/* Fit Scores */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: 'Technical Fit', value: evaluation.technicalFit, color: 'blue' },
                    { label: 'Experience', value: evaluation.experienceFit, color: 'purple' },
                    { label: 'Cultural Fit', value: evaluation.culturalFit, color: 'emerald' },
                    { label: 'Salary Fit', value: evaluation.salaryFit, color: 'yellow' }
                  ].map((item, i) => (
                    <div key={i} className={'p-4 bg-' + item.color + '-50 rounded-xl border border-' + item.color + '-200'}>
                      <p className={'text-sm font-semibold text-' + item.color + '-900 mb-2'}>{item.label}</p>
                      <div className={'h-2 bg-' + item.color + '-200 rounded-full overflow-hidden'}>
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: item.value + '%' }}
                          className={'h-full bg-' + item.color + '-600'} />
                      </div>
                      <p className={'text-lg font-bold text-' + item.color + '-700 mt-2'}>{item.value}%</p>
                    </div>
                  ))}
                </div>

                {/* Recommendation */}
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-emerald-600" />
                    <p className="font-bold text-emerald-900">Hiring Recommendation</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 mb-2">{evaluation.hiringRecommendation}</p>
                  <p className="text-sm text-gray-700">{evaluation.nextSteps}</p>
                </div>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="card">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <h4 className="font-bold text-emerald-900 text-lg">Strengths</h4>
                    </div>
                    <ul className="space-y-2">
                      {evaluation.strengths.map((s: string, i: number) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="text-sm flex items-start gap-2">
                          <span className="text-emerald-600 text-lg">✓</span>
                          <span>{s}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <h4 className="font-bold text-yellow-900 text-lg">Development Areas</h4>
                    </div>
                    <ul className="space-y-2">
                      {evaluation.weaknesses.map((w: string, i: number) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="text-sm flex items-start gap-2">
                          <span className="text-yellow-600 text-lg">!</span>
                          <span>{w}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Skill Gaps */}
              <div className="card">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-blue-600" />
                  <h4 className="font-bold text-lg">Skill Gap Analysis</h4>
                </div>
                <div className="space-y-3">
                  {evaluation.skillGaps.map((skill: any, i: number) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold">{skill.skill}</span>
                        <span className={'px-2 py-1 rounded text-xs font-bold ' +
                          (skill.proficiency >= 80 ? 'bg-emerald-100 text-emerald-700' :
                           skill.proficiency >= 60 ? 'bg-blue-100 text-blue-700' :
                           'bg-yellow-100 text-yellow-700')}>
                          {skill.proficiency}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: skill.proficiency + '%' }}
                          className={'h-full ' +
                            (skill.proficiency >= 80 ? 'bg-emerald-600' :
                             skill.proficiency >= 60 ? 'bg-blue-600' :
                             'bg-yellow-600')} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interview Questions */}
              <div className="card bg-purple-50 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-purple-600" />
                  <h4 className="font-bold text-purple-900 text-lg">AI-Generated Interview Questions</h4>
                </div>
                <ol className="space-y-2">
                  {evaluation.recommendedQuestions.map((q: string, i: number) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-sm text-purple-900 font-medium p-2 bg-white rounded">
                      {i + 1}. {q}
                    </motion.li>
                  ))}
                </ol>
              </div>

              {/* Actions */}
              <div className="card bg-gradient-to-r from-blue-50 to-emerald-50">
                <h4 className="font-bold mb-4">Take Action</h4>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleAction(selectedCandidate.id, 'shortlist')}
                    className="bg-blue-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-blue-700 flex items-center justify-center gap-2">
                    <Bookmark className="w-5 h-5" /> Shortlist
                  </button>
                  <button
                    onClick={() => handleAction(selectedCandidate.id, 'interview')}
                    className="bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-emerald-700 flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Interview
                  </button>
                  <button
                    onClick={() => handleAction(selectedCandidate.id, 'reject')}
                    className="bg-red-600 text-white px-4 py-3 rounded-xl font-semibold hover:bg-red-700 flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" /> Reject
                  </button>
                </div>
              </div>

              {/* Comments */}
              <div className="card">
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="flex items-center gap-2 mb-4 font-bold">
                  <MessageSquare className="w-5 h-5" /> Collaboration Comments
                </button>
                {showComments && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="input h-24 mb-3"
                      placeholder="Add your thoughts about this candidate..." />
                    <button onClick={addComment} className="btn-primary">
                      Post Comment
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="card text-center py-20">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a candidate to view AI evaluation</p>
            </div>
          )}
        </div>
      </div>

      {/* Compare Button */}
      {candidates && candidates.length > 1 && (
        <Link href="/dashboard/manager/candidates/compare">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="fixed bottom-8 right-8 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-2xl font-bold shadow-2xl flex items-center gap-2">
            <Users className="w-5 h-5" /> Compare Candidates
          </motion.button>
        </Link>
      )}
    </div>
  )
}
