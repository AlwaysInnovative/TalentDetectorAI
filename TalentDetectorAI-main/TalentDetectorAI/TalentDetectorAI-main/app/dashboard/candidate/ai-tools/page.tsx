'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, FileText, MessageSquare, TrendingUp, Target, Lightbulb } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { enhanceResume, generateCoverLetter, generateInterviewQuestions, predictMarketRate, analyzeSkillGaps, generateCareerPlan } from '@/lib/candidate/ai-tools/engine'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [candidateRes, jobsRes] = await Promise.all([
    supabase.from('candidates').select('*').eq('user_id', user?.id || '').single(),
    supabase.from('jobs').select('*').eq('status', 'open').limit(1).single()
  ])
  
  return { candidate: candidateRes.data, sampleJob: jobsRes.data }
}

export default function AITools() {
  const { data } = useSWR('ai-tools', fetcher)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [generating, setGenerating] = useState(false)

  async function handleToolClick(tool: string) {
    setActiveTool(tool)
    setGenerating(true)
    setResult(null)
    
    try {
      let output
      
      switch(tool) {
        case 'resume':
          output = await enhanceResume(data?.candidate)
          break
        case 'cover':
          output = await generateCoverLetter(data?.candidate, data?.sampleJob)
          break
        case 'interview':
          output = await generateInterviewQuestions(data?.sampleJob)
          break
        case 'salary':
          output = await predictMarketRate(data?.candidate, data?.sampleJob)
          break
        case 'skills':
          output = await analyzeSkillGaps(data?.candidate, data?.sampleJob)
          break
        case 'career':
          output = await generateCareerPlan(data?.candidate)
          break
      }
      
      setResult(output)
      toast.success('✨ AI analysis complete!')
    } catch (error) {
      toast.error('Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  const tools = [
    { id: 'resume', name: 'Resume Enhancer', icon: FileText, color: 'blue', desc: 'AI-powered resume optimization' },
    { id: 'cover', name: 'Cover Letter Generator', icon: MessageSquare, color: 'purple', desc: 'Personalized cover letters' },
    { id: 'interview', name: 'Interview Prep', icon: Lightbulb, color: 'emerald', desc: 'Practice questions & tips' },
    { id: 'salary', name: 'Market Rate Predictor', icon: TrendingUp, color: 'yellow', desc: 'Salary insights & negotiation' },
    { id: 'skills', name: 'Skill Gap Analysis', icon: Target, color: 'pink', desc: 'Identify improvement areas' },
    { id: 'career', name: 'Career Action Plan', icon: Sparkles, color: 'indigo', desc: 'Personalized growth roadmap' }
  ]

  return (
    <div className="relative">
      <DynamicBackground page="ai" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          AI Career Tools
        </h1>
        <p className="text-gray-600">Powered by advanced AI to accelerate your career</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {tools.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            onClick={() => handleToolClick(tool.id)}
            className={'card cursor-pointer bg-gradient-to-br from-' + tool.color + '-50 to-white border-2 border-' + tool.color + '-200'}>
            <div className={'w-12 h-12 bg-gradient-to-br from-' + tool.color + '-500 to-' + tool.color + '-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg'}>
              <tool.icon className="w-6 h-6" />
            </div>
            <h3 className="font-bold mb-2">{tool.name}</h3>
            <p className="text-sm text-gray-600">{tool.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Results */}
      {generating ? (
        <div className="card text-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">AI generating insights...</p>
        </div>
      ) : result && activeTool ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6">
          {activeTool === 'resume' && (
            <>
              <div className="card">
                <h3 className="text-xl font-bold mb-4">✨ Improved Summary</h3>
                <p className="text-gray-700 bg-blue-50 p-4 rounded-xl">{result.improvedSummary}</p>
              </div>
              
              <div className="card">
                <h3 className="text-xl font-bold mb-4">💪 Strengthened Points</h3>
                <ul className="space-y-2">
                  {result.strengthenedPoints.map((point: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span className="text-gray-700">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">🎯 Keyword Optimization</h3>
                <ul className="space-y-2">
                  {result.keywordOptimization.map((tip: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700 bg-purple-50 p-3 rounded-lg">
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeTool === 'cover' && (
            <div className="card">
              <h3 className="text-xl font-bold mb-4">📄 Generated Cover Letter</h3>
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6 font-serif whitespace-pre-line">
                {result.content}
              </div>
              <div className="bg-blue-50 p-4 rounded-xl">
                <p className="font-semibold mb-2">💡 Customization Tips:</p>
                <ul className="space-y-1 text-sm">
                  {result.tips.map((tip: string, i: number) => (
                    <li key={i} className="text-gray-700">• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {activeTool === 'interview' && (
            <>
              <div className="card">
                <h3 className="text-xl font-bold mb-4">🔧 Technical Questions</h3>
                <ol className="space-y-2">
                  {result.technical.map((q: string, i: number) => (
                    <li key={i} className="p-3 bg-blue-50 rounded-lg">
                      <strong>{i + 1}.</strong> {q}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">🤝 Behavioral Questions</h3>
                <ol className="space-y-2">
                  {result.behavioral.map((q: string, i: number) => (
                    <li key={i} className="p-3 bg-purple-50 rounded-lg">
                      <strong>{i + 1}.</strong> {q}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="card bg-emerald-50 border-2 border-emerald-200">
                <h3 className="text-xl font-bold mb-4">📚 Preparation Tips</h3>
                <ul className="space-y-2">
                  {result.prepTips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeTool === 'salary' && (
            <>
              <div className="card bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-300">
                <h3 className="text-xl font-bold mb-4">💰 Predicted Market Rate</h3>
                <p className="text-5xl font-bold text-emerald-600 mb-2">
                  £{result.predictedSalary.toLocaleString()}
                </p>
                <p className="text-gray-700">
                  Range: £{result.range.min.toLocaleString()} - £{result.range.max.toLocaleString()}
                </p>
                <p className="text-sm text-emerald-700 mt-2">
                  You're in the {result.percentile}th percentile for this role
                </p>
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">📊 Contributing Factors</h3>
                <ul className="space-y-2">
                  {result.factors.map((factor: string, i: number) => (
                    <li key={i} className="text-sm text-gray-700">• {factor}</li>
                  ))}
                </ul>
              </div>

              <div className="card bg-blue-50 border-2 border-blue-200">
                <h3 className="text-xl font-bold mb-4">🎯 Negotiation Tips</h3>
                <ul className="space-y-2">
                  {result.negotiationTips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-600">✓</span>
                      <span className="text-sm">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {activeTool === 'skills' && (
            <>
              <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
                <h3 className="text-xl font-bold mb-4">🎯 Match Analysis</h3>
                <div className="text-center mb-6">
                  <p className="text-5xl font-bold text-blue-600 mb-2">{result.matchPercentage}%</p>
                  <p className="text-gray-700">Skills Match</p>
                </div>
                
                {result.hasSkills.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold mb-2 text-emerald-700">✓ Skills You Have:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.hasSkills.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {result.missingSkills.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2 text-yellow-700">📚 Skills to Develop:</p>
                    <div className="flex flex-wrap gap-2">
                      {result.missingSkills.map((skill: string, i: number) => (
                        <span key={i} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="card">
                <h3 className="text-xl font-bold mb-4">📖 Learning Recommendations</h3>
                {result.recommendations.map((rec: any, i: number) => (
                  <div key={i} className="mb-4 p-4 bg-gray-50 rounded-xl">
                    <p className="font-bold text-purple-600 mb-2">{rec.skill}</p>
                    <ul className="space-y-1 text-sm">
                      {rec.resources.map((resource: string, ri: number) => (
                        <li key={ri} className="text-gray-700">• {resource}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTool === 'career' && (
            <>
              <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
                <h3 className="text-xl font-bold mb-4">🚀 Career Progression</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Current</p>
                    <p className="text-xl font-bold text-blue-600">{result.currentLevel}</p>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-3xl">→</span>
                  </div>
                  <div className="text-center p-4 bg-white rounded-xl">
                    <p className="text-sm text-gray-600 mb-1">Target</p>
                    <p className="text-xl font-bold text-purple-600">{result.nextLevel}</p>
                  </div>
                </div>
                <p className="text-center mt-4 text-gray-700">
                  Timeline: <strong>{result.timeline}</strong>
                </p>
              </div>

              <div className="space-y-4">
                {result.milestones.map((milestone: any, i: number) => (
                  <div key={i} className="card">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-lg mb-1">{milestone.title}</h4>
                        <p className="text-sm text-gray-600 mb-3">{milestone.duration}</p>
                        <ul className="space-y-1">
                          {milestone.actions.map((action: string, ai: number) => (
                            <li key={ai} className="text-sm text-gray-700 flex items-start gap-2">
                              <span className="text-purple-600">✓</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      ) : (
        <div className="card text-center py-20">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Select a tool above to get AI-powered insights</p>
        </div>
      )}
    </div>
  )
}
