'use client'
import { motion } from 'framer-motion'
import { Award, AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react'

export default function CandidateScorecard({ match }: { match: any }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-600'
    if (score >= 60) return 'from-blue-500 to-blue-600'
    return 'from-gray-400 to-gray-500'
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">AI Match Analysis</h3>
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className={'w-24 h-24 rounded-2xl flex flex-col items-center justify-center text-white bg-gradient-to-br shadow-lg ' + getScoreColor(match.matchScore)}>
          <span className="text-4xl font-bold">{match.matchScore}</span>
          <span className="text-xs">Match Score</span>
        </motion.div>
      </div>
      
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Technical Fit', value: match.technicalFit, color: 'blue' },
          { label: 'Experience', value: match.experienceFit, color: 'purple' },
          { label: 'Cultural Fit', value: match.culturalFit, color: 'emerald' }
        ].map((item, i) => (
          <div key={i} className={'p-4 bg-' + item.color + '-50 rounded-xl border border-' + item.color + '-200'}>
            <p className={'text-sm font-semibold text-' + item.color + '-900 mb-2'}>{item.label}</p>
            <div className={'h-3 bg-' + item.color + '-200 rounded-full overflow-hidden'}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: item.value + '%' }}
                transition={{ delay: i * 0.2, duration: 0.8 }}
                className={'h-full bg-' + item.color + '-600'}
              />
            </div>
            <p className={'text-lg font-bold text-' + item.color + '-700 mt-2'}>{item.value}%</p>
          </div>
        ))}
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-emerald-600" />
            <p className="font-bold text-emerald-900">Key Strengths</p>
          </div>
          <ul className="space-y-2">
            {match.strengths?.map((s: string, i: number) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-emerald-600 text-lg">✓</span>
                <span>{s}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <p className="font-bold text-yellow-900">Development Areas</p>
          </div>
          <ul className="space-y-2">
            {match.weaknesses?.map((w: string, i: number) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-yellow-600 text-lg">!</span>
                <span>{w}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          <p className="font-bold text-purple-900">AI-Generated Interview Questions</p>
        </div>
        <ul className="space-y-2">
          {match.recommendedQuestions?.map((q: string, i: number) => (
            <motion.li 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + i * 0.1 }}
              className="text-sm text-purple-800 font-medium">
              {i + 1}. {q}
            </motion.li>
          ))}
        </ul>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Hiring Recommendation</p>
            <p className="text-2xl font-bold text-emerald-600">{match.hiringRecommendation}</p>
            <p className="text-sm text-gray-600 mt-1">{match.nextSteps}</p>
          </div>
          <TrendingUp className="w-12 h-12 text-emerald-600" />
        </div>
      </motion.div>
    </motion.div>
  )
}
