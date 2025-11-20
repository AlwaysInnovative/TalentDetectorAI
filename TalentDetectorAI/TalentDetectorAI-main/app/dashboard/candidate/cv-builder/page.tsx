'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Eye, Save, Sparkles } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [candidateRes, versionsRes] = await Promise.all([
    supabase.from('candidates').select('*').eq('user_id', user?.id || '').single(),
    supabase.from('cv_versions').select('*').eq('candidate_id', user?.id || '').order('created_at', { ascending: false })
  ])
  
  return {
    candidate: candidateRes.data,
    versions: versionsRes.data || []
  }
}

export default function CVBuilder() {
  const { data, mutate } = useSWR('cv-builder', fetcher)
  const [selectedTemplate, setSelectedTemplate] = useState('professional')
  const [generating, setGenerating] = useState(false)
  const [preview, setPreview] = useState(false)

  const templates = [
    { id: 'professional', name: 'Professional', color: 'blue', desc: 'Clean and modern' },
    { id: 'creative', name: 'Creative', color: 'purple', desc: 'Stand out design' },
    { id: 'minimal', name: 'Minimal', color: 'gray', desc: 'Simple and elegant' },
    { id: 'executive', name: 'Executive', color: 'emerald', desc: 'Senior roles' }
  ]

  async function generateCV() {
    setGenerating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const cvContent = {
        template: selectedTemplate,
        personalInfo: {
          name: data?.candidate.name,
          email: data?.candidate.email,
          phone: data?.candidate.phone,
          location: data?.candidate.location
        },
        summary: data?.candidate.professional_summary,
        experience: [
          {
            position: data?.candidate.current_position,
            company: data?.candidate.current_company,
            duration: `${data?.candidate.experience_years} years`,
            highlights: [
              'Led cross-functional teams to deliver high-impact projects',
              'Implemented solutions that increased efficiency by 35%',
              'Mentored junior team members and improved team productivity'
            ]
          }
        ],
        education: data?.candidate.education || [],
        skills: data?.candidate.skills || []
      }
      
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.from('cv_versions').insert({
        candidate_id: user?.id,
        version_name: `CV - ${new Date().toLocaleDateString()}`,
        content: cvContent
      })
      
      toast.success('✨ CV generated successfully!')
      mutate()
      setPreview(true)
    } catch (error) {
      toast.error('Failed to generate CV')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="documents" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          AI CV Builder
        </h1>
        <p className="text-gray-600">Create a professional CV in minutes</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Templates */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Choose Template</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {templates.map(template => (
              <motion.div
                key={template.id}
                whileHover={{ scale: 1.05 }}
                onClick={() => setSelectedTemplate(template.id)}
                className={'card cursor-pointer transition ' +
                  (selectedTemplate === template.id ? 
                    'ring-2 ring-' + template.color + '-600 bg-' + template.color + '-50' : 
                    'hover:shadow-lg')}>
                <div className={'w-full h-32 bg-gradient-to-br from-' + template.color + '-100 to-' + template.color + '-200 rounded-lg mb-3'} />
                <h3 className="font-bold">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.desc}</p>
              </motion.div>
            ))}
          </div>

          <button onClick={generateCV} disabled={generating}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 text-lg">
            <Sparkles className="w-6 h-6" />
            {generating ? 'Generating...' : 'Generate CV with AI'}
          </button>

          {/* Saved Versions */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Saved Versions ({data?.versions.length || 0})</h2>
            {data?.versions && data.versions.length > 0 ? (
              <div className="space-y-3">
                {data.versions.map((version: any) => (
                  <div key={version.id} className="card flex justify-between items-center">
                    <div>
                      <p className="font-bold">{version.version_name}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(version.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary p-2">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="btn-primary p-2">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No saved versions yet</p>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-4">
          {preview ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">CV Preview</h3>
                <button className="btn-primary flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
              
              <div className="bg-white border-2 border-gray-200 rounded-xl p-8 shadow-inner">
                <div className="text-center mb-6 pb-6 border-b">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{data?.candidate.name}</h1>
                  <p className="text-gray-600">{data?.candidate.current_position}</p>
                  <div className="flex justify-center gap-4 mt-2 text-sm text-gray-600">
                    <span>{data?.candidate.email}</span>
                    <span>•</span>
                    <span>{data?.candidate.phone}</span>
                    <span>•</span>
                    <span>{data?.candidate.location}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-2">Professional Summary</h2>
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {data?.candidate.professional_summary}
                  </p>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {data?.candidate.skills?.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-3">Experience</h2>
                  <div className="border-l-2 border-blue-600 pl-4">
                    <h3 className="font-bold">{data?.candidate.current_position}</h3>
                    <p className="text-sm text-gray-600">{data?.candidate.current_company}</p>
                    <p className="text-xs text-gray-500">{data?.candidate.experience_years} years</p>
                  </div>
                </div>

                {data?.candidate.education && data.candidate.education.length > 0 && (
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-3">Education</h2>
                    {data.candidate.education.map((edu: any, i: number) => (
                      <div key={i} className="mb-2">
                        <h3 className="font-bold text-sm">{edu.degree}</h3>
                        <p className="text-sm text-gray-600">{edu.institution}</p>
                        <p className="text-xs text-gray-500">{edu.year}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="card text-center py-20">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Generate a CV to see preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
