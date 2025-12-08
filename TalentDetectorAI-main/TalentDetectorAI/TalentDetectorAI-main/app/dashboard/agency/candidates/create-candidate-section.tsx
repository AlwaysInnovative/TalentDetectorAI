'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function CreateCandidateSection({ onSuccess }: { onSuccess: () => void }) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [candidate, setCandidate] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    skills: '',
    years_of_experience: '',
    expected_salary: '',
    create_credentials: false,
    password: ''
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be logged in')
      }

      const skillsArray = candidate.skills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      let candidateUserId = null

      // Create credentials if requested
      if (candidate.create_credentials && candidate.password) {
        console.log('Creating credentials for:', candidate.email)
        
        const response = await fetch('/api/create-candidate-user', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            email: candidate.email,
            password: candidate.password,
            name: candidate.name
          })
        })

        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('API error response:', errorText)
          
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            throw new Error(`Server error: ${response.status} - ${errorText}`)
          }
          
          throw new Error(errorData.error || 'Failed to create user credentials')
        }

        const result = await response.json()
        console.log('API result:', result)
        
        if (!result.success || !result.userId) {
          throw new Error('Failed to get user ID from response')
        }

        candidateUserId = result.userId
        console.log('User created with ID:', candidateUserId)
      }

      // Create candidate record
      console.log('Creating candidate record...')
      const { error: candidateError } = await supabase.from('candidates').insert({
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone || null,
        location: candidate.location || null,
        skills: skillsArray.length > 0 ? skillsArray : null,
        years_of_experience: candidate.years_of_experience ? parseInt(candidate.years_of_experience) : null,
        expected_salary: candidate.expected_salary ? parseFloat(candidate.expected_salary) : null,
        user_id: candidateUserId,
        created_by_agency_id: user.id
      })

      if (candidateError) {
        console.error('Candidate creation error:', candidateError)
        throw candidateError
      }

      console.log('Candidate created successfully!')
      toast.success(`✅ ${candidate.name} created successfully!`, { duration: 5000 })
      
      setShowForm(false)
      setCandidate({
        name: '', email: '', phone: '', location: '', skills: '',
        years_of_experience: '', expected_salary: '', create_credentials: false, password: ''
      })
      
      onSuccess()

    } catch (error: any) {
      console.error('Create candidate error:', error)
      toast.error(error.message || 'Failed to create candidate', { duration: 6000 })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        Add New Candidate
      </button>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Add New Candidate</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={candidate.name}
                      onChange={(e) => setCandidate({...candidate, name: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={candidate.email}
                      onChange={(e) => setCandidate({...candidate, email: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="john@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={candidate.phone}
                      onChange={(e) => setCandidate({...candidate, phone: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="+44 7700 900123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={candidate.location}
                      onChange={(e) => setCandidate({...candidate, location: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="London, UK"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Years Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={candidate.years_of_experience}
                      onChange={(e) => setCandidate({...candidate, years_of_experience: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Expected Salary (£)</label>
                    <input
                      type="number"
                      min="0"
                      value={candidate.expected_salary}
                      onChange={(e) => setCandidate({...candidate, expected_salary: e.target.value})}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="50000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Skills (comma-separated)</label>
                  <textarea
                    rows={3}
                    value={candidate.skills}
                    onChange={(e) => setCandidate({...candidate, skills: e.target.value})}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="React, TypeScript, Node.js"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candidate.create_credentials}
                      onChange={(e) => setCandidate({...candidate, create_credentials: e.target.checked})}
                      className="w-5 h-5"
                    />
                    <span className="text-gray-900 font-bold">Create login credentials</span>
                  </label>
                  
                  {candidate.create_credentials && (
                    <div className="mt-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2">Password *</label>
                      <input
                        type="password"
                        required={candidate.create_credentials}
                        minLength={6}
                        value={candidate.password}
                        onChange={(e) => setCandidate({...candidate, password: e.target.value})}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                        placeholder="Minimum 6 characters"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                    ) : (
                      <><UserPlus className="w-5 h-5" /> Create Candidate</>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    disabled={loading}
                    className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
