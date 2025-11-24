// components/agency/CandidateSummaryCard.tsx
'use client'
import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  MapPin,
  ThumbsUp,
  ThumbsDown,
  Info,
  BarChart2,
  FileSignature
} from 'lucide-react'

type Skill = {
  name: string
  requiredLevel: number
  candidateLevel: number
  evidenceSnippet?: string
}

type SalaryInfo = {
  proposedMin: number
  proposedMax: number
  marketLow: number
  marketHigh: number
  currency: string
  confidence: 'low'|'medium'|'high'
  commentary: string
}

type CommissionInfo = {
  model: 'percentage' | 'flat'
  percentage?: number
  flatAmount?: number
  estimatedFee: number
  notes?: string
}

type SuitabilityInfo = {
  overallLabel: 'Strong' | 'Moderate' | 'Risky'
  pros: string[]
  cons: string[]
  riskFlags: string[]
}

type LogisticsInfo = {
  location: string
  remote: boolean
  noticePeriodDays: number
  availableFrom: string
}

type CandidateSummary = {
  aiMatchScore: number
  matchExplanation: string
  skills: Skill[]
  experienceHighlights: string[]
  yearsExperience: number
  seniorityLabel: string
  salary: SalaryInfo
  commission: CommissionInfo
  suitability: SuitabilityInfo
  logistics: LogisticsInfo
  interviewStatus: string
  rtrSigned: boolean
  referencesCount: number
}

type Props = {
  candidateName: string
  jobTitle: string
  summary: CandidateSummary
  onOpenFullReport?: () => void
}

export function CandidateSummaryCard({ candidateName, jobTitle, summary, onOpenFullReport }: Props) {
  const [showSkills, setShowSkills] = useState(false)
  const [showSalary, setShowSalary] = useState(false)
  const [showSuitability, setShowSuitability] = useState(false)

  const matchColor =
    summary.aiMatchScore >= 80 ? 'text-emerald-600' :
    summary.aiMatchScore >= 60 ? 'text-amber-600' :
    'text-red-600'

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{candidateName}</h2>
          <p className="text-sm text-gray-600">Submitted for: <span className="font-semibold">{jobTitle}</span></p>
          <p className="mt-1 text-xs text-gray-500">AI-generated candidate overview for hiring managers</p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-extrabold ${matchColor}`}>{summary.aiMatchScore}%</p>
          <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
            <Activity className="w-3 h-3" />
            AI match score
          </p>
        </div>
      </header>

      {/* Match Explanation */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-gray-800 flex gap-2">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p>{summary.matchExplanation}</p>
      </div>

      {/* Skills Section */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowSkills(!showSkills)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
        >
          <span className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            Skill match & heat map
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {showSkills ? 'Hide' : 'View'} details
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>

        {showSkills && (
          <div className="mt-1 space-y-2">
            {summary.skills.map(skill => {
              const pct = Math.min(
                100,
                Math.round((skill.candidateLevel / Math.max(skill.requiredLevel || 1, 1)) * 100)
              )
              const barColor =
                pct >= 100 ? 'bg-emerald-500' :
                pct >= 70 ? 'bg-amber-500' :
                'bg-red-500'
              return (
                <button key={skill.name} type="button" className="w-full text-left text-xs bg-gray-50 border border-gray-100 rounded-lg p-2 hover:bg-gray-100">
                  <div className="flex justify-between mb-1">
                    <span className="font-semibold text-gray-800">{skill.name}</span>
                    <span className="text-gray-500">{skill.candidateLevel}/{skill.requiredLevel}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden mb-1">
                    <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                  </div>
                  {skill.evidenceSnippet && <p className="text-[11px] text-gray-600 line-clamp-2">Evidence: {skill.evidenceSnippet}</p>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Experience Highlights */}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-gray-800">Experience highlights</p>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          {summary.experienceHighlights.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
        <p className="text-xs text-gray-500 mt-1">
          {summary.yearsExperience}+ years total · {summary.seniorityLabel}
        </p>
      </div>

      {/* Interview & RTR Status */}
      <div className="space-y-1 border-t border-gray-200 pt-4 text-sm text-gray-600">
        <p><FileSignature className="inline w-4 h-4 mr-1" />RTR Signed: {summary.rtrSigned ? 'Yes' : 'No'}</p>
        <p>Interview Status: {summary.interviewStatus}</p>
        <p>References: {summary.referencesCount}</p>
      </div>

      {/* Salary & Commission */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowSalary(!showSalary)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
        >
          <span className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Proposed negotiable salary & fees
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {showSalary ? 'Hide' : 'View'} breakdown
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
        {showSalary && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs space-y-2">
            <p className="text-gray-800">
              Proposed: <span className="font-semibold">{summary.salary.currency}{summary.salary.proposedMin.toLocaleString()} – {summary.salary.currency}{summary.salary.proposedMax.toLocaleString()}</span>
            </p>
            <p className="text-gray-700">
              Market band: {summary.salary.currency}{summary.salary.marketLow.toLocaleString()} – {summary.salary.currency}{summary.salary.marketHigh.toLocaleString()} ({summary.salary.confidence} confidence)
            </p>
            <p className="text-gray-700">Commentary: {summary.salary.commentary}</p>
            <div className="h-px bg-emerald-100 my-1" />
            <p className="text-gray-800">
              Agency commission: {summary.commission.model === 'percentage' ? (
                <><span className="font-semibold">{summary.commission.percentage}%</span> of first-year salary</>
              ) : (
                <span className="font-semibold">{summary.salary.currency}{summary.commission.flatAmount?.toLocaleString()}</span>
              )}
            </p>
            <p className="text-gray-700">
              Estimated fee: <span className="font-semibold">{summary.salary.currency}{summary.commission.estimatedFee.toLocaleString()}</span>
            </p>
          </div>
        )}
      </div>

      {/* Suitability Flags */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowSuitability(!showSuitability)}
          className="w-full flex items-center justify-between text-sm font-semibold text-gray-800"
        >
          <span className="flex items-center gap-2">
            {summary.suitability.overallLabel === 'Strong' ? (
              <ThumbsUp className="w-4 h-4 text-emerald-600" />
            ) : summary.suitability.overallLabel === 'Risky' ? (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            ) : (
              <Activity className="w-4 h-4 text-amber-600" />
            )}
            Overall suitability: {summary.suitability.overallLabel}
          </span>
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {showSuitability ? 'Hide' : 'View'} rationale
            <ArrowRight className="w-3 h-3" />
          </span>
        </button>
        {showSuitability && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs space-y-2">
            <div>
              <p className="font-semibold text-gray-800">Strengths</p>
              <ul className="list-disc list-inside text-gray-700">
                {summary.suitability.pros.map((p, idx) => <li key={idx}>{p}</li>)}
              </ul>
            </div>
            {summary.suitability.cons.length > 0 && (
              <div>
                <p className="font-semibold text-gray-800">Concerns / Gaps</p>
                <ul className="list-disc list-inside text-gray-700">
                  {summary.suitability.cons.map((c, idx) => <li key={idx}>{c}</li>)}
                </ul>
              </div>
            )}
            {summary.suitability.riskFlags.length > 0 && (
              <div>
                <p className="font-semibold text-red-700 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Risk flags
                </p>
                <ul className="list-disc list-inside text-red-700">
                  {summary.suitability.riskFlags.map((r, idx) => <li key={idx}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Logistics Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3" />
          <span>{summary.logistics.location}</span>
          {summary.logistics.remote && <span>· Open to remote</span>}
        </div>
        <div>
          Available from: <span className="font-semibold">{summary.logistics.availableFrom}</span> · Notice: {summary.logistics.noticePeriodDays} days
        </div>
      </div>

      {/* Full report button */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onOpenFullReport}
          className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:text-blue-900"
        >
          Open full AI report
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </section>
  )
}
