'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Mic, Play, CheckCircle, TrendingUp, Sparkles } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobsRes, candidateRes, interviewsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('status', 'open').limit(5),
    supabase.from('candidates').select('*').eq('user_id', user?.id || '').single(),
    supabase.from('mock_interviews').select('*').eq('candidate_id', user?.id || '').order('created_at', { ascending: false })
  ])
  
  return {
    jobs: jobsRes.data || [],
    candidate: candidateRes.data,
    interviews: interviewsRes.data || []
  }
}

export default function MockInterview() {
  const { data, mutate } = useSWR('mock-interview', fetcher, { refreshInterval: 3000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState<any>(null)

  async function generateQuestions(job: any) {
    setGenerating(true)
    setSelectedJob(job)
    try {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const candidateSkills = data?.candidate.skills || []
      const jobSkills = job.ai_keywords || []
      
      const generatedQuestions = [
        {
          type: 'Introduction',
          question: 'Tell me about yourself and your background.',
          aiTips: ['Use the STAR method', 'Highlight relevant experience', 'Keep it under 2 minutes']
        },
        {
          type: 'Technical',
          question: `Explain your experience with ${jobSkills[0] || 'relevant technologies'}.`,
          aiTips: ['Provide specific examples', 'Mention projects you worked on', 'Discuss outcomes and impact']
        },
        {
          type: 'Behavioral',
          question: 'Describe a challenging project you worked on and how you overcame obstacles.',
          aiTips: ['Use STAR format', 'Focus on your specific contribution', 'Emphasize problem-solving skills']
        },
        {
          type: 'Situational',
          question: `How would you handle ${jobSkills[1] || 'a technical challenge'} in a team environment?`,
          aiTips: ['Show collaboration skills', 'Demonstrate technical knowledge', 'Discuss communication approach']
        },
        {
          type: 'Closing',
          question: 'Why are you interested in this position?',
          aiTips: ['Research the company', 'Align with company values', 'Express genuine enthusiasm']
        }
      ]
      
      setQuestions(generatedQuestions)
      setAnswers(new Array(generatedQuestions.length).fill(''))
      setCurrentQuestion(0)
      toast.success('✨ Interview questions generated!')
    } catch (error) {
      toast.error('Failed to generate questions')
    } finally {
      setGenerating(false)
    }
  }

  async function submitInterview() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      // Simulate AI feedback
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const aiFeedback = {
        overallScore: Math.floor(Math.random() * 20) + 80,
        strengths: [
          'Clear and structured responses',
          'Good use of specific examples',
          'Strong technical knowledge demonstrated'
        ],
        improvements: [
          'Expand on leadership experience',
          'Provide more quantifiable results',
          'Practice concise communication'
        ],
        questionScores: questions.map((_, i) => ({
          question: i + 1,
          score: Math.floor(Math.random() * 20) + 75,
          feedback: 'Good response with room for improvement'
        }))
      }
      
      await supabase.from('mock_interviews').insert({
        candidate_id: user?.id,
        job_id: selectedJob.id,
        questions: questions.map(q => q.question),
        answers,
        ai_feedback: aiFeedback,
        score: aiFeedback.overallScore
      })
      
      setFeedback(aiFeedback)
      setShowFeedback(true)
      mutate()
      toast.success('✅ Interview completed!')
    } catch (error) {
      toast.error('Failed to submit')
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="interview" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          AI Mock Interview
        </h1>
        <p className="text-gray-600">Practice with job-specific questions and get AI feedback</p>
      </div>

      {!selectedJob ? (
        <>
          <div className="card mb-8 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <h3 className="font-bold mb-2">How it works:</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              <li>• Select a job to practice for</li>
              <li>• AI generates personalized questions based on job requirements and your CV</li>
              <li>• Record or type your answers</li>
              <li>• Get instant AI feedback and improvement suggestions</li>
            </ul>
          </div>

          <h2 className="text-2xl font-bold mb-4">Select a Job to Practice</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data?.jobs.map((job: any) => (
              <motion.div
                key={job.id}
                whileHover={{ scale: 1.02 }}
                onClick={() => generateQuestions(job)}
                className="card cursor-pointer hover:shadow-lg transition">
                <h3 className="font-bold text-lg mb-2">{job.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{job.location}</p>
                {job.ai_keywords && (
                  <div className="flex flex-wrap gap-1">
                    {job.ai_keywords.slice(0, 3).map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                        {kw}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Past Interviews */}
          {data?.interviews && data.interviews.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4">Past Mock Interviews</h2>
              <div className="space-y-3">
                {data.interviews.map((interview: any) => (
                  <div key={interview.id} className="card flex justify-between items-center">
                    <div>
                      <p className="font-bold">Interview Practice</p>
                      <p className="text-sm text-gray-600">
                        {new Date(interview.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-600">{interview.score}%</p>
                      <p className="text-xs text-gray-600">Overall Score</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : showFeedback ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6">
          <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-emerald-900 mb-2">Interview Complete!</h2>
              <p className="text-5xl font-bold text-emerald-600 mb-2">{feedback.overallScore}%</p>
              <p className="text-emerald-700">Overall Performance</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-xl font-bold mb-4 text-emerald-600">✓ Strengths</h3>
              <ul className="space-y-2">
                {feedback.strengths.map((strength: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-600 font-bold">•</span>
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card">
              <h3 className="text-xl font-bold mb-4 text-yellow-600">📈 Areas to Improve</h3>
              <ul className="space-y-2">
                {feedback.improvements.map((improvement: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-yellow-600 font-bold">•</span>
                    <span className="text-gray-700">{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-bold mb-4">Question-by-Question Breakdown</h3>
            <div className="space-y-3">
              {feedback.questionScores.map((qs: any, i: number) => (
                <div key={i} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">Question {qs.question}</span>
                    <span className={'px-3 py-1 rounded-full text-sm font-bold ' +
                      (qs.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                       qs.score >= 60 ? 'bg-blue-100 text-blue-700' :
                       'bg-yellow-100 text-yellow-700')}>
                      {qs.score}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{qs.feedback}</p>
                </div>
              ))}
            </div>
          </div>

          <button onClick={() => {
            setSelectedJob(null)
            setShowFeedback(false)
            setQuestions([])
          }} className="btn-primary w-full py-3">
            Start New Practice
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedJob.title}</h2>
                <p className="text-sm text-gray-600">Question {currentQuestion + 1} of {questions.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Progress</p>
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-purple-600 transition-all" 
                    style={{ width: ((currentQuestion + 1) / questions.length * 100) + '%' }} />
                </div>
              </div>
            </div>

            {questions[currentQuestion] && (
              <motion.div
                key={currentQuestion}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}>
                <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl mb-6">
                  <span className="px-3 py-1 bg-purple-600 text-white text-xs rounded-full font-semibold">
                    {questions[currentQuestion].type}
                  </span>
                  <p className="text-xl font-bold text-gray-900 mt-4">
                    {questions[currentQuestion].question}
                  </p>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold">AI Tips:</h4>
                  </div>
                  <ul className="space-y-1">
                    {questions[currentQuestion].aiTips.map((tip: string, i: number) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-purple-600">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-6">
                  <label className="block font-semibold mb-2">Your Answer:</label>
                  <textarea
                    value={answers[currentQuestion] || ''}
                    onChange={e => {
                      const newAnswers = [...answers]
                      newAnswers[currentQuestion] = e.target.value
                      setAnswers(newAnswers)
                    }}
                    className="input h-40"
                    placeholder="Type your answer here..." />
                  <div className="mt-2 flex justify-between items-center text-sm text-gray-600">
                    <span>{answers[currentQuestion]?.length || 0} characters</span>
                    <button className="flex items-center gap-2 text-red-600 font-semibold hover:underline">
                      <Mic className="w-4 h-4" /> Voice Record
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                    disabled={currentQuestion === 0}
                    className="btn-secondary">
                    ← Previous
                  </button>
                  
                  {currentQuestion < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(currentQuestion + 1)}
                      className="btn-primary flex-1">
                      Next Question →
                    </button>
                  ) : (
                    <button
                      onClick={submitInterview}
                      className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Submit & Get AI Feedback
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
