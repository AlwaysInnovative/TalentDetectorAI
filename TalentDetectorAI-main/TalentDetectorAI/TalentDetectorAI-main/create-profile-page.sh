#!/bin/bash
# Create Main Profile Page + Fix Routing
# Run: bash create-profile-page.sh

set -e

echo "🔧 Creating main profile page..."

# ==================== MAIN PROFILE PAGE (VIEW MODE) ====================

cat > app/dashboard/candidate/profile/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Edit, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase, Award, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) throw new Error('Not authenticated')
  
  // Try to get candidate
  let { data: candidate, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  // If no candidate exists, create one with defaults
  if (error && error.code === 'PGRST116') {
    const { data: newCandidate, error: createError } = await supabase
      .from('candidates')
      .insert({
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        skills: [],
        education: [],
        certifications: [],
        languages: [],
        experience_years: 0
      })
      .select()
      .single()
    
    if (createError) throw createError
    candidate = newCandidate
  } else if (error) {
    throw error
  }
  
  return candidate
}

export default function CandidateProfile() {
  const { data: candidate, error, isLoading } = useSWR('candidate-profile', fetcher)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 font-bold mb-4">Error loading profile</p>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Link href="/dashboard/candidate/profile/edit">
            <button className="btn-primary">Create Profile</button>
          </Link>
        </div>
      </div>
    )
  }

  const profileComplete = candidate && (
    !!(candidate.name && candidate.email && candidate.phone) &&
    !!(candidate.current_company && candidate.current_position) &&
    (candidate.skills?.length || 0) >= 3 &&
    (candidate.professional_summary?.length || 0) > 50 &&
    (candidate.education?.length || 0) > 0
  )

  return (
    <div className="relative">
      <DynamicBackground page="profile" />
      
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary-600">My Profile</h1>
        <Link href="/dashboard/candidate/profile/edit">
          <button className="btn-primary flex items-center gap-2">
            <Edit className="w-5 h-5" /> Edit Profile
          </button>
        </Link>
      </div>

      {!profileComplete && (
        <div className="card bg-yellow-50 border-2 border-yellow-200 mb-8">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
              ⚠
            </div>
            <div className="flex-1">
              <p className="font-bold text-yellow-900 mb-1">Complete Your Profile</p>
              <p className="text-sm text-yellow-800 mb-3">
                A complete profile increases your chances of getting noticed by recruiters!
              </p>
              <Link href="/dashboard/candidate/profile/edit">
                <button className="btn-primary">Complete Now</button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="card">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-4xl font-bold">
                {candidate?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{candidate?.name || 'Complete your name'}</h2>
                <p className="text-lg text-gray-600">{candidate?.current_position || 'Add your position'}</p>
                {candidate?.current_company && (
                  <p className="text-sm text-gray-500">at {candidate.current_company}</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {candidate?.email && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Mail className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{candidate.email}</span>
                </div>
              )}
              {candidate?.phone && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{candidate.phone}</span>
                </div>
              )}
              {candidate?.location && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <span className="text-gray-700">{candidate.location}</span>
                </div>
              )}
            </div>

            {(candidate?.linkedin_url || candidate?.github_url || candidate?.portfolio_url) && (
              <div className="flex gap-3 mt-4">
                {candidate.linkedin_url && (
                  <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Linkedin className="w-5 h-5" /> LinkedIn
                  </a>
                )}
                {candidate.github_url && (
                  <a href={candidate.github_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900">
                    <Github className="w-5 h-5" /> GitHub
                  </a>
                )}
                {candidate.portfolio_url && (
                  <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    <Globe className="w-5 h-5" /> Portfolio
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Professional Summary */}
          {candidate?.professional_summary && (
            <div className="card">
              <h3 className="text-xl font-bold mb-4">Professional Summary</h3>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {candidate.professional_summary}
              </p>
            </div>
          )}

          {/* Skills */}
          {candidate?.skills && candidate.skills.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-bold mb-4">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill: string, i: number) => (
                  <span key={i} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full font-semibold">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {candidate?.education && candidate.education.length > 0 && (
            <div className="card">
              <h3 className="text-xl font-bold mb-4">Education</h3>
              <div className="space-y-4">
                {candidate.education.map((edu: any, i: number) => (
                  <div key={i} className="border-l-4 border-blue-600 pl-4">
                    <h4 className="font-bold text-lg">{edu.degree}</h4>
                    <p className="text-gray-600">{edu.institution}</p>
                    <p className="text-sm text-gray-500">{edu.year}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!candidate?.professional_summary && 
           (!candidate?.skills || candidate.skills.length === 0) &&
           (!candidate?.education || candidate.education.length === 0) && (
            <div className="card text-center py-20">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg mb-4">Your profile is empty</p>
              <p className="text-gray-400 mb-6">Add your professional information to get started</p>
              <Link href="/dashboard/candidate/profile/edit">
                <button className="btn-primary">Complete Profile</button>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="card bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
            <h3 className="font-bold mb-4">Profile Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Experience</span>
                <span className="font-bold text-blue-600">{candidate?.experience_years || 0} years</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Skills</span>
                <span className="font-bold text-purple-600">{candidate?.skills?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-700">Education</span>
                <span className="font-bold text-emerald-600">{candidate?.education?.length || 0}</span>
              </div>
            </div>
          </div>

          {/* Profile Strength */}
          <div className="card">
            <h3 className="font-bold mb-4">Profile Strength</h3>
            <div className="space-y-3">
              {[
                { label: 'Personal Info', complete: !!(candidate?.name && candidate?.email && candidate?.phone) },
                { label: 'Professional', complete: !!(candidate?.current_company && candidate?.current_position) },
                { label: 'Skills', complete: (candidate?.skills?.length || 0) >= 3 },
                { label: 'Summary', complete: (candidate?.professional_summary?.length || 0) > 50 },
                { label: 'Education', complete: (candidate?.education?.length || 0) > 0 }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm">{item.label}</span>
                  {item.complete ? (
                    <span className="text-emerald-600 font-bold text-lg">✓</span>
                  ) : (
                    <span className="text-gray-300 text-lg">○</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold">Overall</span>
                <span className="text-sm font-bold text-primary-600">
                  {[
                    !!(candidate?.name && candidate?.email && candidate?.phone),
                    !!(candidate?.current_company && candidate?.current_position),
                    (candidate?.skills?.length || 0) >= 3,
                    (candidate?.professional_summary?.length || 0) > 50,
                    (candidate?.education?.length || 0) > 0
                  ].filter(Boolean).length * 20}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all"
                  style={{ width: [
                    !!(candidate?.name && candidate?.email && candidate?.phone),
                    !!(candidate?.current_company && candidate?.current_position),
                    (candidate?.skills?.length || 0) >= 3,
                    (candidate?.professional_summary?.length || 0) > 50,
                    (candidate?.education?.length || 0) > 0
                  ].filter(Boolean).length * 20 + '%' }} />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-bold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href="/dashboard/candidate/cv-builder">
                <button className="w-full btn-secondary text-left">
                  Build CV
                </button>
              </Link>
              <Link href="/dashboard/candidate/jobs">
                <button className="w-full btn-secondary text-left">
                  Browse Jobs
                </button>
              </Link>
              <Link href="/dashboard/candidate/ai-tools">
                <button className="w-full btn-secondary text-left">
                  AI Career Tools
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Main profile page created!"
echo ""
echo "Now you have:"
echo "- /dashboard/candidate/profile (VIEW mode) ← You were here"
echo "- /dashboard/candidate/profile/edit (EDIT mode)"
echo ""
echo "🚀 Restart server:"
echo "npm run dev"
echo ""
echo "Visit: /dashboard/candidate/profile"
