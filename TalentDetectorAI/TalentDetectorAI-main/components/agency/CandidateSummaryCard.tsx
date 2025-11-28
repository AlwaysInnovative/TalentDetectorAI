'use client'
import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  MapPin,
  ThumbsUp,
  Info,
  BarChart2,
  CheckCircle,
  FileText
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
  confidence: 'low' | 'medium' | 'high'
  commentary: string
}

type CommissionInfo = {
  model: 'percentage' | 'flat'
  percentage?: number
  flatAmount?: number
  estimatedFee: number
  notes?: string
}

type Suitability = {
  overallLabel: 'Strong' | 'Moderate' | 'Risky'
  pros: string[]
  cons: string[]
  riskFlags: string[]
}

type Logistics = {
  location: string
  remote: boolean
  noticePeriodDays: number
  availableFrom: string
}

type InterviewOutcome = {
  date: string
  status: 'passed' | 'failed' | 'pending'
  feedback: string
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
  suitability: Suitability
  logistics: Logistics
  interviewOutcomes: InterviewOutcome[]
  rtrStatus: 'unsigned' | 'ready' | 'signed'
}

type Props = {
  candidateName: string
  jobTitle: string
  summary: CandidateSummary
  onOpenFullReport?: () => void
}

export default function CandidateSummaryCard({ candidateName, jobTitle, summary, onOpenFullReport }: Props) {
  const [showSkills, setShowSkills] = useState(false)
  const [showSalary, setShowSalary] = useState(false)
  const [showSuitability, setShowSuitability] = useState(false)
  const [showInterview, setShowInterview] = useState(false)

  const matchColor =
    summary.aiMatchScore >= 80 ? 'text-emerald-600' :
    summary.aiMatchScore >= 60 ? 'text-amber-600' :
    'text-red-600'

  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{candidateName}</h2>
          <p className="text-sm text-gray-600">Submitted for: <span className="font-semibold">{jobTitle}</span></p>
          <p className="text-xs text-gray-500 mt-1">AI-powered summary for hiring managers</p>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-extrabold ${matchColor}`}>{summary.aiMatchScore}%</p>
          <p className="text-xs text-gray-500 flex items-center justify-end gap-1"><Activity className="w-3 h-3" /> AI match score</p>
        </div>
      </header>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-gray-800 flex gap-2">
        <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <p>{summary.matchExplanation}</p>
      </div>

      {/* Skill Heat Map */}
      <div>
        <button
          type="button"
          onClick={() => setShowSkills(!showSkills)}
          className="flex justify-between w-full font-semibold text-gray-800 mb-2"
        >
          <span className="flex items-center gap-2 text-sm"><BarChart2 className="w-5 h-5 text-indigo-600" />Skill Heat Map</span>
          <span className="text-xs text-gray-500">{showSkills ? 'Hide' : 'Show'} details <ArrowRight className="w-3 h-3 inline" /></span>
        </button>
        {showSkills && (
          <div className="space-y-2 text-sm">
            {summary.skills.map(skill => {
              const percent = Math.min(100, Math.round(skill.candidateLevel / (skill.requiredLevel || 1) * 100))
              const barColor = percent >= 100 ? 'bg-emerald-500' : percent >= 70 ? 'bg-amber-400' : 'bg-red-500'
              return (
                <div key={skill.name} className="border border-gray-200 rounded p-2 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between mb-1">
                    <span>{skill.name}</span>
                    <span>{skill.candidateLevel}/{skill.requiredLevel}</span>
                  </div>
                  <div className="h-2 bg-gray-300 rounded overflow-hidden">
                    <div className={`${barColor} h-full`} style={{ width: `${percent}%` }} />
                  </div>
                  {skill.evidenceSnippet && <p className="mt-1 text-xs italic text-gray-600 truncate">{skill.evidenceSnippet}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Experience Highlights */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-1">Experience Highlights</h3>
        <ul className="list-disc list-inside text-gray-700 text-sm space-y-1">
          {summary.experienceHighlights.map((highlight, i) => (
            <li key={i}>{highlight}</li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 mt-2">{summary.yearsExperience}+ years · {summary.seniorityLabel}</p>
      </div>

      {/* Interview & RTR Status */}
      <div>
        <button
          type="button"
          onClick={() => setShowInterview(!showInterview)}
          className="flex justify-between w-full font-semibold text-gray-800 mb-2"
        >
          <span className="flex items-center gap-2 text-sm"><FileText className="w-5 h-5 text-purple-600" />Interview & RTR Status</span>
          <span className="text-xs text-gray-500">{showInterview ? 'Hide' : 'Show'} details <ArrowRight className="w-3 h-3 inline" /></span>
        </button>
        {showInterview && (
          <div className="border border-gray-200 rounded p-2 space-y-2 text-sm text-gray-700">
            <p>RTR Status: <strong>{summary.rtrStatus === 'signed' ? 'Signed' : summary.rtrStatus === 'ready' ? 'Ready to sign' : 'Unsigned'}</strong></p>
            <div>
              {summary.interviewOutcomes.length === 0 ? (
                <p>No interview outcomes yet</p>
              ) : (
                summary.interviewOutcomes.map((outcome, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{new Date(outcome.date).toLocaleDateString()}</span>
                    <span className={outcome.status === 'passed' ? 'text-green-600' : outcome.status === 'failed' ? 'text-red-600' : 'text-amber-600'}>
                      {outcome.status.charAt(0).toUpperCase() + outcome.status.slice(1)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Salary & Commission */}
      <div>
        <button
          type="button"
          onClick={() => setShowSalary(!showSalary)}
          className="flex justify-between w-full font-semibold text-gray-800 mb-2"
        >
          <span className="flex items-center gap-2 text-sm"><DollarSign className="w-5 h-5 text-emerald-600" />Salary & Commission</span>
          <span className="text-xs text-gray-500">{showSalary ? 'Hide' : 'Show'} details <ArrowRight className="w-3 h-3 inline" /></span>
        </button>
        {showSalary && (
          <div className="border border-gray-200 rounded p-2 space-y-2 text-sm text-gray-700">
            <p>Proposed salary range: <strong>{summary.salary.currency}{summary.salary.proposedMin.toLocaleString()} - {summary.salary.currency}{summary.salary.proposedMax.toLocaleString()}</strong> ({summary.salary.confidence} confidence)</p>
            <p>Market salary band: {summary.salary.currency}{summary.salary.marketLow.toLocaleString()} - {summary.salary.currency}{summary.salary.marketHigh.toLocaleString()}</p>
            <p>Commission model: {summary.commission.model === 'percentage' ? `${summary.commission.percentage}%` : `${summary.commission.flatAmount}`}<br />Total estimated fee: {summary.salary.currency}{summary.commission.estimatedFee.toLocaleString()}</p>
            <p className="italic text-gray-600">{summary.salary.commentary}</p>
            {summary.commission.notes && <p><em>{summary.commission.notes}</em></p>}
          </div>
        )}
      </div>

      {/* Suitability */}
      <div>
        <button
          type="button"
          onClick={() => setShowSuitability(!showSuitability)}
          className="flex justify-between w-full font-semibold text-gray-800"
        >
          <span className="flex items-center gap-2 text-sm">
            {summary.suitability.overallLabel === 'Strong' ? (
              <ThumbsUp className="w-5 h-5 text-emerald-600" />
            ) : summary.suitability.overallLabel === 'Risky' ? (
              <AlertTriangle className="w-5 h-5 text-red-600" />
            ) : (
              <Activity className="w-5 h-5 text-amber-600" />
            )}
            Overall suitability: {summary.suitability.overallLabel}
          </span>
          <span className="text-xs text-gray-500">{showSuitability ? 'Hide' : 'Show'} details <ArrowRight className="w-3 h-3 inline" /></span>
        </button>
        {showSuitability && (
          <div className="border border-gray-200 rounded p-2 text-sm text-gray-700 space-y-2">
            <div>
              <p className="font-semibold">Strengths</p>
              <ul className="list-disc ml-5">{summary.suitability.pros.map((p, i) => <li key={i}>{p}</li>)}</ul>
            </div>
            {summary.suitability.cons.length > 0 && <div>
              <p className="font-semibold">Concerns / Gaps</p>
              <ul className="list-disc ml-5">{summary.suitability.cons.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </div>}
            {summary.suitability.riskFlags.length > 0 && <div>
              <p className="font-semibold text-red-700 flex items-center gap-1"><AlertTriangle className="w-4 h-4" /> Risk Flags</p>
              <ul className="list-disc ml-5 text-red-700">{summary.suitability.riskFlags.map((r, i) => <li key={i}>{r}</li>)}</ul>
            </div>}
          </div>
        )}
      </div>

      {/* Logistics Footer */}
      <div className="pt-3 border-t border-gray-200 text-xs text-gray-600 flex flex-wrap justify-between gap-2">
        <div className="flex items-center space-x-1"><MapPin className="w-4 h-4" /><span>{summary.logistics.location}</span>{summary.logistics.remote && <span>· Open to remote</span>}</div>
        <div>Available from <strong>{summary.logistics.availableFrom}</strong> · Notice period: {summary.logistics.noticePeriodDays} days</div>
      </div>
    </section>
  )
}
