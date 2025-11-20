'use client'
import { useEffect, useState } from 'react'
import { Sparkles, Award, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { motion } from 'framer-motion'

interface AIRecommendationsProps {
  candidate: any
  job?: any
}

export default function AIRecommendations({ candidate, job }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any>(null)

  useEffect(() => {
    generateRecommendations()
  }, [candidate])

  async function generateRecommendations() {
    // Simulate AI recommendation generation
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const skills = candidate.skills || []
    const experience = candidate.experience_years || 0
    const location = candidate.location || 'London'

    setRecommendations({
      certifications: [
        { name: 'AWS Certified Solutions Architect', boost: '+12%', priority: 'high' },
        { name: 'Professional Scrum Master', boost: '+8%', priority: 'medium' },
        { name: 'Google Cloud Professional', boost: '+10%', priority: 'high' }
      ],
      resumeImprovements: [
        'Add quantifiable achievements (e.g., "Increased efficiency by 35%")',
        'Include specific project outcomes and metrics',
        'Highlight leadership and collaboration skills',
        'Add relevant keywords for ATS optimization'
      ],
      salaryRange: {
        min: 50000 + (experience * 5000),
        max: 70000 + (experience * 7000),
        market: 'Competitive',
        confidence: 85
      },
      interviewSlots: [
        { day: 'Monday', time: '10:00 AM - 11:00 AM', optimal: true },
        { day: 'Tuesday', time: '2:00 PM - 3:00 PM', optimal: true },
        { day: 'Wednesday', time: '3:00 PM - 4:00 PM', optimal: false },
        { day: 'Thursday', time: '11:00 AM - 12:00 PM', optimal: true }
      ]
    })
  }

  if (!recommendations) {
    return (
      <div className="bg-white rounded-xl p-8 text-center shadow-lg">
        <Sparkles className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
        <p className="text-gray-600">Generating AI recommendations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Recommended Certifications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-6 h-6 text-amber-600" />
          <h3 className="text-xl font-bold">Recommended Certifications</h3>
        </div>
        <div className="space-y-3">
          {recommendations.certifications.map((cert: any, i: number) => (
            <div key={i} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border-l-4 border-amber-500">
              <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-gray-900">{cert.name}</p>
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">
                  {cert.boost} match
                </span>
              </div>
              <span className={'px-2 py-1 text-xs rounded-full ' +
                (cert.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700')}>
                {cert.priority} priority
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Resume Improvements */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-6 h-6 text-blue-600" />
          <h3 className="text-xl font-bold">Resume Improvements</h3>
        </div>
        <ul className="space-y-2">
          {recommendations.resumeImprovements.map((improvement: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-blue-600 font-bold">•</span>
              <span>{improvement}</span>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Salary Recommendation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 shadow-lg border-2 border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          <h3 className="text-xl font-bold">Expected Salary Range</h3>
        </div>
        <div className="text-center mb-4">
          <p className="text-4xl font-bold text-emerald-600">
            £{recommendations.salaryRange.min.toLocaleString()} - £{recommendations.salaryRange.max.toLocaleString()}
          </p>
          <p className="text-sm text-emerald-700 mt-2">
            Based on {candidate.location}, skills, and {candidate.experience_years} years experience
          </p>
        </div>
        <div className="flex justify-center gap-2">
          <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-semibold">
            {recommendations.salaryRange.market} Market Position
          </span>
          <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
            {recommendations.salaryRange.confidence}% Confidence
          </span>
        </div>
      </motion.div>

      {/* Best Interview Times */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-xl p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-6 h-6 text-indigo-600" />
          <h3 className="text-xl font-bold">Optimal Interview Times</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {recommendations.interviewSlots.map((slot: any, i: number) => (
            <div key={i} className={'p-4 rounded-lg border-2 ' +
              (slot.optimal ? 'bg-indigo-50 border-indigo-300' : 'bg-gray-50 border-gray-200')}>
              <p className="font-bold text-gray-900">{slot.day}</p>
              <p className="text-sm text-gray-600">{slot.time}</p>
              {slot.optimal && (
                <span className="inline-block mt-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
                  ⭐ Optimal
                </span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
