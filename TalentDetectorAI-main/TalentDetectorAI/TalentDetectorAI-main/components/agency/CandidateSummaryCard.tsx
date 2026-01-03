'use client'

import React, { useState } from 'react'
import { ChevronDown, TrendingUp, AlertCircle, CheckCircle2, Users, Target } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface SummarySection {
  title: string
  content: string | string[]
  icon: React.ReactNode
  badge?: string
  badgeColor?: string
}

interface HeatMap {
  technical_skills: number
  cultural_fit: number
  experience_level: number
  communication: number
  leadership_potential: number
}

interface SalaryBand {
  currency: string
  floor: number
  target: number
  stretch: number
  confidence: number
  demand_level: 'high' | 'medium' | 'low'
  market_trend: 'upward' | 'stable' | 'downward'
}

interface Commission {
  percentage: number
  estimated_fee: number
  salary_base: number
  currency: string
}

interface CandidateSummaryCardProps {
  candidateName: string
  jobTitle: string
  companyName?: string
  matchScore: number
  executiveSummary: string
  skillsMatch?: {
    matched_skills: string[]
    missing_skills: string[]
    additional_skills: string[]
  }
  keyStrengths?: string[]
  concerns?: string[]
  recommendations?: string
  heatMap?: HeatMap
  salaryBand?: SalaryBand
  commission?: Commission
  onOpenFullReport?: () => void
  status?: 'draft' | 'ready' | 'submitted'
}

const CandidateSummaryCard: React.FC<CandidateSummaryCardProps> = ({
  candidateName,
  jobTitle,
  companyName = 'Company',
  matchScore,
  executiveSummary,
  skillsMatch,
  keyStrengths,
  concerns,
  recommendations,
  heatMap,
  salaryBand,
  commission,
  onOpenFullReport,
  status = 'ready'
}) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary'])
  const [showFullRecommendations, setShowFullRecommendations] = useState(false)

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const isExpanded = (section: string) => expandedSections.includes(section)

  // Score color based on value
  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600'
    if (score >= 6) return 'text-blue-600'
    if (score >= 4) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Match score color
  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-green-600'
    if (score >= 60) return 'from-blue-500 to-blue-600'
    if (score >= 40) return 'from-yellow-500 to-yellow-600'
    return 'from-red-500 to-red-600'
  }

  // Circular progress component
  const CircularProgress = ({ score, size = 120 }: { score: number; size?: number }) => {
    const circumference = 2 * Math.PI * (size / 2 - 8)
    const strokeDashoffset = circumference - (score / 100) * circumference
    const bgColor = getMatchScoreColor(score)

    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-gray-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 8}
            stroke="url(#scoreGradient)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">{Math.round(score)}%</span>
          <span className="text-xs text-gray-500">Match</span>
        </div>
      </div>
    )
  }

  // Heat map visualization
  const HeatMapDisplay = ({ data }: { data: HeatMap }) => {
    const items = [
      { label: 'Technical', value: data.technical_skills },
      { label: 'Cultural', value: data.cultural_fit },
      { label: 'Experience', value: data.experience_level },
      { label: 'Communication', value: data.communication },
      { label: 'Leadership', value: data.leadership_potential }
    ]

    return (
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-700">{item.label}</span>
              <span className={`text-sm font-semibold ${getScoreColor(item.value)}`}>
                {item.value}/10
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className={`h-2 rounded-full ${getScoreColor(item.value).replace('text-', 'bg-')}`}
                initial={{ width: 0 }}
                animate={{ width: `${(item.value / 10) * 100}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Expandable section component
  const ExpandableSection = ({
    id,
    title,
    icon,
    badge,
    badgeColor = 'bg-blue-100 text-blue-800',
    children
  }: {
    id: string
    title: string
    icon: React.ReactNode
    badge?: string
    badgeColor?: string
    children: React.ReactNode
  }) => (
    <motion.div
      className="border border-gray-200 rounded-lg overflow-hidden"
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <button
        onClick={() => toggleSection(id)}
        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <div className="text-gray-600">{icon}</div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {badge && <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>{badge}</span>}
        </div>
        <motion.div
          animate={{ rotate: isExpanded(id) ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={20} className="text-gray-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isExpanded(id) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-3 bg-white border-t border-gray-200"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">{candidateName}</h2>
            <p className="text-lg text-gray-600 mt-1">
              for <span className="font-semibold">{jobTitle}</span> at {companyName}
            </p>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                status === 'ready'
                  ? 'bg-green-100 text-green-800'
                  : status === 'submitted'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {status === 'ready' ? '✓ Ready' : status === 'submitted' ? '📤 Submitted' : '⏳ Draft'}
            </span>
          </div>
        </div>

        {/* Match Score & Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="flex justify-center md:col-span-1">
            <CircularProgress score={matchScore} size={140} />
          </div>
          <div className="md:col-span-3 space-y-3">
            <div className="text-sm text-gray-600 leading-relaxed italic">
              "{executiveSummary}"
            </div>
            {salaryBand && (
              <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Floor</p>
                  <p className="text-lg font-bold text-gray-900">
                    {salaryBand.currency}
                    {(salaryBand.floor / 100000).toFixed(1)}L
                  </p>
                </div>
                <div className="text-center border-l border-r border-gray-200">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Target</p>
                  <p className="text-lg font-bold text-gray-900">
                    {salaryBand.currency}
                    {(salaryBand.target / 100000).toFixed(1)}L
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Stretch</p>
                  <p className="text-lg font-bold text-gray-900">
                    {salaryBand.currency}
                    {(salaryBand.stretch / 100000).toFixed(1)}L
                  </p>
                </div>
              </div>
            )}
            {commission && (
              <div className="bg-blue-50 rounded-lg p-3 flex items-center gap-3">
                <TrendingUp size={20} className="text-blue-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-600 font-semibold">Est. Commission</p>
                  <p className="text-lg font-bold text-blue-900">
                    {commission.currency}
                    {(commission.estimated_fee / 100000).toFixed(1)}L ({commission.percentage}%)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {/* Summary Section */}
        <ExpandableSection
          id="summary"
          title="Executive Summary"
          icon={<Target size={20} />}
          badge="Key Insights"
          badgeColor="bg-blue-100 text-blue-800"
        >
          <p className="text-gray-700 leading-relaxed">{executiveSummary}</p>
        </ExpandableSection>

        {/* Skills Match */}
        {skillsMatch && (
          <ExpandableSection
            id="skills"
            title="Skills Analysis"
            icon={<CheckCircle2 size={20} />}
            badge={`${skillsMatch.matched_skills.length} Matched`}
            badgeColor="bg-green-100 text-green-800"
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                  <CheckCircle2 size={16} /> Matched Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {skillsMatch.matched_skills.map(skill => (
                    <span
                      key={skill}
                      className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {skillsMatch.missing_skills.length > 0 && (
                <div>
                  <h4 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> Skills Gap
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsMatch.missing_skills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {skillsMatch.additional_skills.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} /> Bonus Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skillsMatch.additional_skills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ExpandableSection>
        )}

        {/* Key Strengths */}
        {keyStrengths && keyStrengths.length > 0 && (
          <ExpandableSection
            id="strengths"
            title="Key Strengths"
            icon={<CheckCircle2 size={20} />}
            badge={`${keyStrengths.length} Points`}
            badgeColor="bg-green-100 text-green-800"
          >
            <ul className="space-y-2">
              {keyStrengths.map((strength, idx) => (
                <li key={idx} className="flex gap-3">
                  <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{strength}</span>
                </li>
              ))}
            </ul>
          </ExpandableSection>
        )}

        {/* Concerns */}
        {concerns && concerns.length > 0 && (
          <ExpandableSection
            id="concerns"
            title="Areas for Discussion"
            icon={<AlertCircle size={20} />}
            badge={`${concerns.length} Points`}
            badgeColor="bg-yellow-100 text-yellow-800"
          >
            <ul className="space-y-2">
              {concerns.map((concern, idx) => (
                <li key={idx} className="flex gap-3">
                  <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{concern}</span>
                </li>
              ))}
            </ul>
          </ExpandableSection>
        )}

        {/* Competency Heatmap */}
        {heatMap && (
          <ExpandableSection
            id="heatmap"
            title="Competency Assessment"
            icon={<Users size={20} />}
            badge="5 Dimensions"
            badgeColor="bg-purple-100 text-purple-800"
          >
            <HeatMapDisplay data={heatMap} />
          </ExpandableSection>
        )}

        {/* Recommendations */}
        {recommendations && (
          <ExpandableSection
            id="recommendations"
            title="Next Steps"
            icon={<TrendingUp size={20} />}
            badge="Action Items"
            badgeColor="bg-blue-100 text-blue-800"
          >
            <div className="text-gray-700 leading-relaxed">
              {showFullRecommendations || recommendations.length < 300 ? (
                <p>{recommendations}</p>
              ) : (
                <>
                  <p>{recommendations.substring(0, 300)}...</p>
                  <button
                    onClick={() => setShowFullRecommendations(true)}
                    className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Read More
                  </button>
                </>
              )}
            </div>
          </ExpandableSection>
        )}

        {/* Market Insights */}
        {salaryBand && (
          <ExpandableSection
            id="market"
            title="Market Insights"
            icon={<TrendingUp size={20} />}
            badge={`${salaryBand.confidence}% Confidence`}
            badgeColor="bg-indigo-100 text-indigo-800"
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-indigo-600 font-semibold">Demand Level</p>
                  <p className="text-lg font-bold text-indigo-900 capitalize mt-1">
                    {salaryBand.demand_level}
                  </p>
                </div>
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-sm text-indigo-600 font-semibold">Market Trend</p>
                  <p className="text-lg font-bold text-indigo-900 capitalize mt-1">
                    {salaryBand.market_trend}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Based on {salaryBand.confidence}% confidence level from market analysis
              </p>
            </div>
          </ExpandableSection>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
        <button
          onClick={onOpenFullReport}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Ready to Submit Candidate
        </button>
        <button className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors">
          Export Summary
        </button>
      </div>
    </div>
  )
}

export default CandidateSummaryCard
