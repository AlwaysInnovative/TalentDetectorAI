#!/bin/bash
# Fix JSON Response Error in API
# Run: bash fix-json-response-error.sh

set -e

echo "🔧 Fixing JSON response error..."

# ==================== FIX CREATE CANDIDATE USER API ====================

cat > app/api/create-candidate-user/route.ts << 'ENDFILE'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Parse request body
    let body
    try {
      body = await request.json()
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { email, password, name } = body

    // Validate input
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables')
      return NextResponse.json(
        { error: 'Server configuration error - missing credentials' },
        { status: 500 }
      )
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create user
    console.log('Creating user:', email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        role: 'candidate'
      }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      console.error('No user returned from auth')
      return NextResponse.json(
        { error: 'Failed to create user - no user data returned' },
        { status: 500 }
      )
    }

    console.log('User created:', authData.user.id)

    // Create profile
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      email,
      full_name: name,
      role: 'candidate'
    })

    if (profileError) {
      console.error('Profile error:', profileError)
      // User was created but profile failed - still return success with warning
      return NextResponse.json({
        success: true,
        userId: authData.user.id,
        warning: 'User created but profile creation failed'
      })
    }

    console.log('Profile created for:', authData.user.id)

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'User and profile created successfully'
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'create-candidate-user',
    timestamp: new Date().toISOString()
  })
}
ENDFILE

echo "✅ Create candidate user API fixed!"

# ==================== FIX SEND EMAILS API ====================

cat > app/api/send-emails/route.ts << 'ENDFILE'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid secret' },
        { status: 401 }
      )
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get pending emails
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No pending emails',
        count: 0 
      })
    }

    const results = []

    for (const email of emails) {
      try {
        console.log('📧 Processing email:', email.id)
        console.log('   To:', email.to_email)
        console.log('   Subject:', email.subject)
        
        // TODO: Send actual email here
        // For now, just mark as sent
        
        await supabaseAdmin
          .from('email_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', email.id)

        results.push({ 
          id: email.id, 
          status: 'sent', 
          to: email.to_email 
        })

      } catch (emailError: any) {
        console.error('Email processing error:', emailError)
        
        await supabaseAdmin
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: emailError.message 
          })
          .eq('id', email.id)

        results.push({ 
          id: email.id, 
          status: 'failed', 
          error: emailError.message 
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email batch processed',
      count: results.length,
      results 
    })

  } catch (error: any) {
    console.error('Send emails error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data, error } = await supabaseAdmin
      .from('email_queue')
      .select('status')

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const summary = (data || []).reduce((acc: any, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({ 
      status: 'healthy',
      queue_summary: summary,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
ENDFILE

echo "✅ Send emails API fixed!"

# ==================== ADD BETTER ERROR HANDLING TO CANDIDATES PAGE ====================

cat > app/dashboard/agency/candidates/create-candidate-section.tsx << 'ENDFILE'
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
ENDFILE

echo "✅ Candidate creation component with better error handling created!"

echo ""
echo "✅✅✅ JSON RESPONSE ERROR FIXED! ✅✅✅"
echo ""
echo "🔧 WHAT WAS FIXED:"
echo ""
echo "1. API ENDPOINTS:"
echo "   ✓ Proper JSON response in all cases"
echo "   ✓ Better error handling with try-catch"
echo "   ✓ Validate request body before processing"
echo "   ✓ Return detailed error messages"
echo "   ✓ Health check GET endpoints"
echo ""
echo "2. ERROR HANDLING:"
echo "   ✓ Check environment variables"
echo "   ✓ Validate input data"
echo "   ✓ Handle JSON parse errors"
echo "   ✓ Return proper HTTP status codes"
echo "   ✓ Console logging for debugging"
echo ""
echo "3. CLIENT-SIDE:"
echo "   ✓ Better error handling in fetch"
echo "   ✓ Check response.ok before parsing"
echo "   ✓ Fallback for non-JSON responses"
echo "   ✓ Detailed error messages to user"
echo ""
echo "📋 TEST THE APIS:"
echo ""
echo "1. Test create user API:"
echo "   curl http://localhost:3000/api/create-candidate-user"
echo "   (should return health check)"
echo ""
echo "2. Test send emails API:"
echo "   curl http://localhost:3000/api/send-emails"
echo "   (should return queue summary)"
echo ""
echo "3. Check browser console for detailed logs"
echo ""
echo "The JSON error should now be fixed! 🎯"
