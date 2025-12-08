'use client'
import { motion } from 'framer-motion'
import { FileText, Sparkles } from 'lucide-react'

interface ResumeViewerProps {
  candidate: any
  aiHighlights?: string[]
}

export default function InteractiveResumeViewer({ candidate, aiHighlights = [] }: ResumeViewerProps) {
  const highlights = aiHighlights.length > 0 ? aiHighlights : [
    'Strong technical skills',
    'Excellent communication',
    'Leadership experience'
  ]

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 flex items-center gap-3">
        <FileText className="w-6 h-6" />
        <div>
          <h3 className="font-bold">Interactive Resume</h3>
          <p className="text-sm text-blue-100">AI-highlighted key points</p>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6 pb-6 border-b-2 border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{candidate.name}</h1>
          <p className="text-lg text-gray-600">{candidate.current_position || 'Professional'}</p>
          <div className="flex justify-center gap-4 mt-3 text-sm text-gray-600">
            <span>{candidate.email}</span>
            <span>•</span>
            <span>{candidate.phone || 'Contact Available'}</span>
            <span>•</span>
            <span>{candidate.location || 'Location TBD'}</span>
          </div>
        </div>

        {/* AI Highlights */}
        <div className="mb-6 p-4 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border-2 border-violet-200">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h4 className="font-bold text-violet-900">AI Key Highlights</h4>
          </div>
          <div className="space-y-2">
            {highlights.map((highlight, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2">
                <span className="w-2 h-2 bg-violet-600 rounded-full" />
                <span className="text-sm text-violet-900 font-semibold">{highlight}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Professional Summary */}
        {candidate.professional_summary && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Professional Summary</h3>
            <p className="text-gray-700 leading-relaxed">{candidate.professional_summary}</p>
          </div>
        )}

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map((skill: string, i: number) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm hover:bg-blue-200 transition cursor-pointer">
                  {skill}
                </motion.span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {candidate.current_company && (
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Experience</h3>
            <div className="border-l-4 border-blue-600 pl-4 py-2">
              <h4 className="font-bold text-gray-900">{candidate.current_position}</h4>
              <p className="text-sm text-gray-600">{candidate.current_company}</p>
              <p className="text-xs text-gray-500 mt-1">{candidate.experience_years} years</p>
            </div>
          </div>
        )}

        {/* Education */}
        {candidate.education && candidate.education.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Education</h3>
            <div className="space-y-3">
              {candidate.education.map((edu: any, i: number) => (
                <div key={i} className="border-l-4 border-emerald-600 pl-4 py-2">
                  <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                  <p className="text-sm text-gray-600">{edu.institution}</p>
                  <p className="text-xs text-gray-500">{edu.year}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
