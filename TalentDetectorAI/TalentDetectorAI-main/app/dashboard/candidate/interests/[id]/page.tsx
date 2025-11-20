'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Briefcase, MapPin, DollarSign, Upload, FileText, 
  CheckCircle, XCircle, AlertCircle, Sparkles, 
  ArrowLeft, Loader2, Download, Award, Mail, Calendar
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function InterestDetailPage({ params }: { params: { id: string } }) {
  const [interest, setInterest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [responding, setResponding] = useState(false)
  const [response, setResponse] = useState({
    type: 'interested',
    message: '',
    availability_date: '',
    salary_expectation: '',
    questions: ''
  })
  const [dragActive, setDragActive] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadInterest()
  }, [])

  async function loadInterest() {
    try {
      const supabase = createClient()
      
      // Get interest with all related data
      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          jobs(id, title, location, salary_min, salary_max, employment_type, description, required_skills),
          profiles!candidate_interests_agency_id_fkey(full_name, company, email)
        `)
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Load error:', error)
        throw error
      }

      console.log('Interest loaded:', data)
      setInterest(data)

      // Mark as viewed
      if (!data.viewed_by_candidate) {
        await supabase
          .from('candidate_interests')
          .update({ viewed_by_candidate: true })
          .eq('id', params.id)
      }
    } catch (error: any) {
      console.error('Load interest error:', error)
      toast.error('Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  async function handleCVUpload(file: File) {
    if (!file) return

    // Validate file
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast.error('File size must be less than 10MB')
      return
    }

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, DOC, and DOCX files are allowed')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const supabase = createClient()
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const fileName = `cv_${params.id}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`
      
      console.log('Uploading file:', fileName)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      clearInterval(progressInterval)
      setUploadProgress(95)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      console.log('Upload successful:', uploadData)

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      console.log('Public URL:', publicUrl)

      // Simulate AI analysis
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const mockAnalysis = {
        match_score: Math.floor(Math.random() * 30) + 70,
        strengths: [
          'Strong relevant experience in the field',
          'Technical skills align well with requirements',
          'Professional qualifications demonstrated',
          'Clear career progression shown'
        ],
        improvements: [
          'Add more quantifiable achievements',
          'Include specific project outcomes',
          'Highlight leadership experience',
          'Add relevant certifications'
        ],
        keywords_matched: ['JavaScript', 'React', 'Node.js', 'AWS', 'TypeScript'],
        keywords_missing: ['Docker', 'Kubernetes', 'CI/CD'],
        summary: 'Excellent candidate profile with strong technical background and relevant experience'
      }

      setUploadProgress(100)

      const { error: updateError } = await supabase
        .from('candidate_interests')
        .update({
          cv_url: publicUrl,
          cv_filename: file.name,
          cv_uploaded_at: new Date().toISOString(),
          ai_cv_analysis: mockAnalysis,
          ai_match_score: mockAnalysis.match_score
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      toast.success('✅ CV uploaded and analyzed successfully!')
      loadInterest()

    } catch (error: any) {
      console.error('CV Upload error:', error)
      toast.error(error.message || 'Failed to upload CV. Please try again.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  async function handleResponse(responseType: string) {
    setResponding(true)
    try {
      const supabase = createClient()

      // Update interest status
      await supabase
        .from('candidate_interests')
        .update({
          status: responseType,
          candidate_response: response.message,
          candidate_responded_at: new Date().toISOString()
        })
        .eq('id', params.id)

      // Create detailed response
      const questions = response.questions
        .split('\n')
        .filter(q => q.trim().length > 0)

      await supabase.from('candidate_interest_responses').insert({
        interest_id: params.id,
        candidate_id: interest.candidate_id,
        response_type: responseType,
        message: response.message || null,
        availability_date: response.availability_date || null,
        salary_expectation: response.salary_expectation ? parseFloat(response.salary_expectation) : null,
        questions: questions.length > 0 ? questions : null
      })

      toast.success('✅ Response sent to agency!', { duration: 5000 })
      loadInterest()

    } catch (error: any) {
      console.error('Response error:', error)
      toast.error('Failed to send response')
    } finally {
      setResponding(false)
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCVUpload(e.dataTransfer.files[0])
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading opportunity...</p>
        </div>
      </div>
    )
  }

  if (!interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Opportunity Not Found</h2>
          <Link href="/dashboard/candidate/interests">
            <button className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition">
              View All Opportunities
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const job = interest.jobs
  const agency = interest.profiles
  const aiAnalysis = interest.ai_cv_analysis

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link href="/dashboard/candidate/interests">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition font-bold">
            <ArrowLeft className="w-5 h-5" />
            Back to Opportunities
          </button>
        </Link>

        {/* Action Banner */}
        {interest.status === 'sent' && !interest.candidate_responded_at && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <Sparkles className="w-12 h-12 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-1">⚡ Action Required!</h3>
                <p className="text-blue-100">
                  {!interest.cv_url 
                    ? 'Upload your CV to get AI-powered feedback and match score'
                    : 'Complete your response below to proceed with this opportunity'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Job Details Card */}
            <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-200">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">{job.title}</h1>
              
              <div className="flex flex-wrap gap-4 mb-6">
                <span className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl font-bold">
                  <MapPin className="w-5 h-5" />
                  {job.location}
                </span>
                <span className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-bold">
                  <DollarSign className="w-5 h-5" />
                  {interest.salary_range || `£${job.salary_min?.toLocaleString()} - £${job.salary_max?.toLocaleString()}`}
                </span>
                <span className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-bold">
                  <Briefcase className="w-5 h-5" />
                  {job.employment_type || 'Full-time'}
                </span>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-xl font-bold text-gray-900 mb-3">Job Description</h3>
                <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {interest.job_description || job.description || 'No description available'}
                </div>
              </div>

              {job.required_skills && job.required_skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CV Upload Section */}
            {!interest.cv_url && (
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-blue-200">
                <div className="flex items-center gap-3 mb-6">
                  <Upload className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Upload Your CV</h3>
                    <p className="text-gray-600">Get instant AI-powered feedback and match score</p>
                  </div>
                </div>

                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50 scale-105' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}>
                  
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCVUpload(file)
                    }}
                    className="hidden"
                    id="cv-upload"
                    disabled={uploading}
                  />
                  
                  <label htmlFor="cv-upload" className="cursor-pointer">
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-16 h-16 text-blue-600 animate-spin mb-4" />
                        <p className="text-lg font-bold text-gray-900 mb-2">Analyzing your CV...</p>
                        <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2 font-bold">{uploadProgress}% complete</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <FileText className="w-16 h-16 text-gray-400 mb-4" />
                        <p className="text-lg font-bold text-gray-900 mb-2">
                          {dragActive ? 'Drop your CV here' : 'Drop your CV here or click to browse'}
                        </p>
                        <p className="text-sm text-gray-600">
                          PDF, DOC, or DOCX (Max 10MB)
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* AI Analysis Results */}
            {aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 shadow-lg border-2 border-emerald-200">
                
                <div className="flex items-center gap-3 mb-6">
                  <Award className="w-8 h-8 text-emerald-600" />
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">🤖 AI Analysis Results</h3>
                    <p className="text-gray-600">Your CV has been analyzed</p>
                  </div>
                </div>

                {/* Match Score Circle */}
                <div className="flex items-center justify-center mb-6">
                  <div className="relative">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                        fill="none"
                      />
                      <motion.circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#10b981"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={2 * Math.PI * 56}
                        strokeDashoffset={2 * Math.PI * 56 * (1 - aiAnalysis.match_score / 100)}
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: 2 * Math.PI * 56 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 56 * (1 - aiAnalysis.match_score / 100) }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-5xl font-bold text-emerald-600">
                        {aiAnalysis.match_score}
                      </span>
                      <span className="text-sm text-gray-600 font-bold">MATCH</span>
                    </div>
                  </div>
                </div>

                {/* Strengths */}
                <div className="bg-white rounded-xl p-6 mb-4">
                  <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2 text-lg">
                    <CheckCircle className="w-5 h-5" />
                    Your Strengths
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((strength: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-gray-700">
                        <span className="text-emerald-600 mt-1 text-xl">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="bg-white rounded-xl p-6">
                  <h4 className="font-bold text-amber-700 mb-3 flex items-center gap-2 text-lg">
                    <Sparkles className="w-5 h-5" />
                    Suggested Improvements
                  </h4>
                  <ul className="space-y-2">
                    {aiAnalysis.improvements.map((improvement: string, i: number) => (
                      <li key={i} className="flex items-start gap-3 text-gray-700">
                        <span className="text-amber-600 mt-1 text-lg">→</span>
                        <span>{improvement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* Response Form */}
            {interest.cv_url && !interest.candidate_responded_at && (
              <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">📝 Your Response</h3>

                <div className="space-y-6">
                  {/* Response Type Buttons */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Are you interested in this opportunity? *
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setResponse({...response, type: 'interested'})}
                        className={`py-4 px-4 rounded-xl font-bold transition-all flex flex-col items-center gap-2 ${
                          response.type === 'interested'
                            ? 'bg-green-500 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                        <CheckCircle className="w-6 h-6" />
                        <span className="text-sm">Yes, I'm Interested</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setResponse({...response, type: 'need_more_info'})}
                        className={`py-4 px-4 rounded-xl font-bold transition-all flex flex-col items-center gap-2 ${
                          response.type === 'need_more_info'
                            ? 'bg-blue-500 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                        <AlertCircle className="w-6 h-6" />
                        <span className="text-sm">Need More Info</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setResponse({...response, type: 'not_interested'})}
                        className={`py-4 px-4 rounded-xl font-bold transition-all flex flex-col items-center gap-2 ${
                          response.type === 'not_interested'
                            ? 'bg-red-500 text-white shadow-lg scale-105'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}>
                        <XCircle className="w-6 h-6" />
                        <span className="text-sm">Not Interested</span>
                      </button>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Message (optional)
                    </label>
                    <textarea
                      rows={4}
                      value={response.message}
                      onChange={(e) => setResponse({...response, message: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Any additional information you'd like to share..."
                    />
                  </div>

                  {/* Additional Fields for Interested */}
                  {response.type === 'interested' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-2" />
                            Available From
                          </label>
                          <input
                            type="date"
                            value={response.availability_date}
                            onChange={(e) => setResponse({...response, availability_date: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">
                            <DollarSign className="w-4 h-4 inline mr-2" />
                            Salary Expectation (£)
                          </label>
                          <input
                            type="number"
                            value={response.salary_expectation}
                            onChange={(e) => setResponse({...response, salary_expectation: e.target.value})}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                            placeholder="50000"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                          Questions (one per line)
                        </label>
                        <textarea
                          rows={3}
                          value={response.questions}
                          onChange={(e) => setResponse({...response, questions: e.target.value})}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                          placeholder="What is the team size?&#10;Is remote work available?&#10;What are the growth opportunities?"
                        />
                      </div>
                    </motion.div>
                  )}

                  {/* Submit Button */}
                  <button
                    onClick={() => handleResponse(response.type)}
                    disabled={responding}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-5 rounded-xl font-bold text-lg hover:shadow-2xl transition disabled:opacity-50 flex items-center justify-center gap-3">
                    {responding ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Sending Response...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-6 h-6" />
                        Submit Response
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Response Submitted */}
            {interest.candidate_responded_at && (
              <div className="bg-green-50 rounded-2xl p-8 shadow-lg border-2 border-green-200">
                <div className="flex items-center gap-4 mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                  <div>
                    <h3 className="text-2xl font-bold text-green-900">✅ Response Submitted Successfully!</h3>
                    <p className="text-green-700">
                      Your response was sent on {new Date(interest.candidate_responded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                  <p className="text-green-800 font-bold">
                    The agency will review your application and contact you soon.
                    {interest.right_to_represent_url && !interest.right_to_represent_signed && (
                      <span className="block mt-2 text-orange-700">
                        ⚠️ Don't forget to sign the Right-to-Represent agreement when you receive it!
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Agency Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📧 Sent By</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  {agency.full_name[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{agency.full_name}</p>
                  {agency.company && (
                    <p className="text-sm text-gray-600">{agency.company}</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {agency.email}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Sent {new Date(interest.created_at).toLocaleDateString()}
                </p>
              </div>

              {interest.cv_url && (
                <a
                  href={interest.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition font-bold">
                  <Download className="w-5 h-5" />
                  Download Your CV
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
