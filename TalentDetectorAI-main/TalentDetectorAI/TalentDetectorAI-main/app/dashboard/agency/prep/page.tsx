'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Lightbulb, FileText, Calendar, MessageSquare } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [submissionsRes, prepNotesRes] = await Promise.all([
    supabase.from('agency_submissions')
      .select('*, agency_candidates(*), jobs(*)')
      .eq('agency_id', user?.id || '')
      .in('status', ['shortlisted', 'interview']),
    supabase.from('candidate_prep_notes')
      .select('*')
      .eq('agency_id', user?.id || '')
  ])
  
  return {
    submissions: submissionsRes.data || [],
    prepNotes: prepNotesRes.data || []
  }
}

export default function CandidatePrep() {
  const { data, mutate } = useSWR('candidate-prep', fetcher)
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any>(null)
  const [customNotes, setCustomNotes] = useState('')

  async function generateAISuggestions(submission: any) {
    setGenerating(true)
    setSelectedSubmission(submission)
    
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const suggestions = {
        interviewTips: [
          `Research ${submission.jobs.title} role requirements thoroughly`,
          'Prepare STAR method examples for behavioral questions',
          'Review your recent projects and achievements',
          'Practice technical questions relevant to the role',
          'Prepare questions to ask the interviewer'
        ],
        keyTopics: [
          submission.jobs.ai_keywords?.[0] || 'Core technology',
          'Problem-solving approach',
          'Team collaboration experience',
          'Project management skills',
          'Communication abilities'
        ],
        commonQuestions: [
          'Tell me about yourself and your background',
          `Describe your experience with ${submission.jobs.ai_keywords?.[0] || 'relevant technologies'}`,
          'What interests you about this position?',
          'Describe a challenging project you worked on',
          'Where do you see yourself in 5 years?'
        ],
        salaryNegotiation: {
          range: `£${submission.jobs.salary_min?.toLocaleString()} - £${submission.jobs.salary_max?.toLocaleString()}`,
          suggestion: 'Position yourself at the higher end based on your experience',
          tips: [
            'Let them make the first offer',
            'Highlight your unique value proposition',
            'Be prepared to discuss total compensation package'
          ]
        }
      }
      
      setAiSuggestions(suggestions)
      
      // Save to database
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('candidate_prep_notes').upsert({
        agency_id: user?.id,
        candidate_id: submission.candidate_id,
        job_id: submission.job_id,
        ai_suggestions: suggestions
      }, {
        onConflict: 'agency_id,candidate_id,job_id'
      })
      
      toast.success('✨ AI prep notes generated!')
      mutate()
    } catch (error) {
      toast.error('Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function saveCustomNotes() {
    if (!customNotes.trim() || !selectedSubmission) return
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('candidate_prep_notes').upsert({
        agency_id: user?.id,
        candidate_id: selectedSubmission.candidate_id,
        job_id: selectedSubmission.job_id,
        custom_notes: customNotes,
        ai_suggestions: aiSuggestions
      }, {
        onConflict: 'agency_id,candidate_id,job_id'
      })
      
      toast.success('Notes saved!')
      setCustomNotes('')
      mutate()
    } catch (error) {
      toast.error('Failed to save')
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="prep" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Candidate Preparation
        </h1>
        <p className="text-gray-600">AI-powered interview prep and engagement</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Candidates List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Candidates</h2>
          {data && data.submissions.length > 0 ? (
            <div className="space-y-3">
              {data.submissions.map((submission: any) => (
                <motion.div
                  key={submission.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => generateAISuggestions(submission)}
                  className={'card cursor-pointer transition ' +
                    (selectedSubmission?.id === submission.id ? 'ring-2 ring-purple-600 bg-purple-50' : 'hover:shadow-lg')}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                      {submission.agency_candidates.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold">{submission.agency_candidates.name}</p>
                      <p className="text-sm text-gray-600">{submission.jobs.title}</p>
                      <span className={'px-2 py-1 rounded text-xs font-semibold mt-1 inline-block ' +
                        (submission.status === 'interview' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700')}>
                        {submission.status}
                      </span>
                    </div>
                    <Lightbulb className="w-5 h-5 text-purple-600" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-20">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No active candidates</p>
            </div>
          )}
        </div>

        {/* AI Suggestions */}
        <div>
          {generating ? (
            <div className="card text-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Generating AI prep notes...</p>
            </div>
          ) : aiSuggestions && selectedSubmission ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6">
              <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-6 h-6 text-purple-600" />
                  <h3 className="text-xl font-bold">AI Interview Preparation</h3>
                </div>
                <p className="text-sm text-purple-900">
                  For {selectedSubmission.agency_candidates.name} • {selectedSubmission.jobs.title}
                </p>
              </div>

              <div className="card">
                <h4 className="font-bold mb-3">📝 Interview Tips</h4>
                <ul className="space-y-2">
                  {aiSuggestions.interviewTips.map((tip: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h4 className="font-bold mb-3">🎯 Key Topics to Prepare</h4>
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.keyTopics.map((topic: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card">
                <h4 className="font-bold mb-3">❓ Common Questions</h4>
                <ol className="space-y-2">
                  {aiSuggestions.commonQuestions.map((q: string, i: number) => (
                    <li key={i} className="text-sm p-2 bg-gray-50 rounded">
                      {i + 1}. {q}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card bg-emerald-50 border-2 border-emerald-200">
                <h4 className="font-bold mb-3 text-emerald-900">💰 Salary Negotiation</h4>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Range:</strong> {aiSuggestions.salaryNegotiation.range}</p>
                  <p className="text-sm"><strong>Suggestion:</strong> {aiSuggestions.salaryNegotiation.suggestion}</p>
                  <div className="mt-3">
                    <p className="text-sm font-semibold mb-2">Tips:</p>
                    <ul className="space-y-1">
                      {aiSuggestions.salaryNegotiation.tips.map((tip: string, i: number) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="text-emerald-600">✓</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="card">
                <h4 className="font-bold mb-3 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" /> Custom Notes
                </h4>
                <textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  className="input h-24 mb-3"
                  placeholder="Add your own notes for the candidate..." />
                <button onClick={saveCustomNotes} className="btn-primary w-full">
                  Save Notes
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="card text-center py-20">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a candidate to generate prep notes</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
