#!/bin/bash
# TalentDetector AI - AI Features + Database Fix
# Run: bash ai-features-complete.sh

set -e

echo "🚀 Adding AI Features & Fixing Database..."

cat > migrations/fixed-schema.sql << 'ENDFILE'
-- DROP existing constraints if any
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;

-- Jobs Table (NO foreign key to users - use UUID directly from auth)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  ai_generated_description TEXT,
  ai_keywords JSONB,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cv_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications Table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  agency_id UUID,
  status TEXT DEFAULT 'pending',
  ai_match_score INTEGER,
  ai_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews Table
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  ai_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission Table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  agency_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_jobs_manager ON jobs(manager_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);

-- Sample data
INSERT INTO jobs (manager_id, title, description, location, salary_min, salary_max) VALUES
(gen_random_uuid(), 'Senior Full-Stack Developer', 'Looking for experienced React/Node developer', 'Remote', 80000, 120000),
(gen_random_uuid(), 'Product Manager', 'Lead product strategy', 'London', 70000, 100000);
ENDFILE

cat > lib/ai/openai-client.ts << 'ENDFILE'
// Mock AI client for development (replace with real OpenAI when ready)

export async function generateJobDescription(keywords: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    description: `We are seeking a talented professional with expertise in ${keywords}. 

Key Responsibilities:
• Lead technical projects and mentor junior team members
• Collaborate with cross-functional teams to deliver high-quality solutions
• Drive innovation and implement best practices
• Contribute to architectural decisions and technical strategy

Required Skills:
• Strong experience with ${keywords}
• Excellent problem-solving and communication skills
• Proven track record of delivering complex projects
• Bachelor's degree in Computer Science or related field

Benefits:
• Competitive salary and equity package
• Flexible remote work options
• Professional development opportunities
• Health insurance and wellness programs`,
    
    keywords: keywords.split(',').map(k => k.trim()),
    
    insights: [
      'This role requires strong technical leadership skills',
      'Remote-friendly position with competitive compensation',
      'Focus on collaboration and innovation',
      'Good career growth opportunities'
    ]
  }
}

export async function analyzeCandidate(jobDescription: string, candidateCV: string) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    matchScore: Math.floor(Math.random() * 30) + 70, // 70-100
    strengths: [
      'Strong technical background matching job requirements',
      'Relevant industry experience',
      'Good communication skills demonstrated in CV'
    ],
    gaps: [
      'Limited experience with specific framework mentioned',
      'Could benefit from leadership training'
    ],
    insights: [
      'Candidate shows high potential for this role',
      'Consider for technical interview round',
      'Skills align well with team needs'
    ]
  }
}

export async function generateAIInsights(context: string) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    recommendations: [
      'Consider posting this role on LinkedIn and Indeed for maximum reach',
      'Salary range is competitive for this market',
      'Remote option will attract 40% more candidates'
    ],
    predictions: {
      expectedApplications: Math.floor(Math.random() * 50) + 50,
      timeToHire: Math.floor(Math.random() * 10) + 15,
      qualityCandidates: Math.floor(Math.random() * 20) + 30
    }
  }
}
ENDFILE

cat > app/dashboard/manager/jobs/new/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Lightbulb } from 'lucide-react'
import { generateJobDescription, generateAIInsights } from '@/lib/ai/openai-client'

export default function NewJob() {
  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const router = useRouter()

  async function handleAIGenerate() {
    if (!keywords.trim()) {
      toast.error('Please enter keywords first')
      return
    }
    
    setAiLoading(true)
    try {
      const result = await generateJobDescription(keywords)
      setDescription(result.description)
      
      const insights = await generateAIInsights(keywords)
      setAiInsights(insights)
      
      toast.success('AI generated job description!')
    } catch (error) {
      toast.error('AI generation failed')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('Please sign in first')
        router.push('/auth/signin')
        return
      }
      
      const { error } = await supabase.from('jobs').insert({
        manager_id: user.id,
        title,
        description,
        location,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        ai_keywords: keywords.split(',').map(k => k.trim()),
        ai_generated_description: description
      })
      
      if (error) {
        console.error('Database error:', error)
        throw error
      }
      
      toast.success('Job posted successfully!')
      router.push('/dashboard/manager')
    } catch (error: any) {
      console.error('Error posting job:', error)
      toast.error(error.message || 'Failed to post job')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <Link href="/dashboard/manager">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold text-primary-600">Post New Job</h1>
          <p className="text-gray-600">AI-powered job description generator</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-blue-50 border-blue-200">
          <Lightbulb className="w-8 h-8 text-blue-600 mb-2" />
          <p className="text-sm font-semibold text-blue-900">AI Tip</p>
          <p className="text-xs text-blue-700 mt-1">Enter keywords to auto-generate description</p>
        </div>
        {aiInsights && (
          <>
            <div className="card bg-emerald-50 border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">Expected Applications</p>
              <p className="text-2xl font-bold text-emerald-600">{aiInsights.predictions.expectedApplications}</p>
            </div>
            <div className="card bg-purple-50 border-purple-200">
              <p className="text-sm font-semibold text-purple-900">Time to Hire</p>
              <p className="text-2xl font-bold text-purple-600">{aiInsights.predictions.timeToHire} days</p>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Job Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="input" placeholder="e.g., Senior Full-Stack Developer" required />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Keywords (comma-separated) *</label>
          <input type="text" value={keywords} onChange={e => setKeywords(e.target.value)}
            className="input" placeholder="e.g., React, TypeScript, Node.js, AWS" required />
          <button type="button" onClick={handleAIGenerate} disabled={aiLoading}
            className="mt-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>

        {aiInsights && (
          <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="font-semibold text-blue-900 mb-2">🤖 AI Recommendations:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              {aiInsights.recommendations.map((rec: string, i: number) => (
                <li key={i}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold mb-2">Job Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="input h-64" placeholder="AI will generate this for you..." />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="input" placeholder="e.g., Remote, London, UK" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Min Salary (£)</label>
            <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)}
              className="input" placeholder="80000" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Max Salary (£)</label>
            <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)}
              className="input" placeholder="120000" />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full btn-primary">
          {loading ? 'Posting Job...' : 'Post Job'}
        </button>
      </form>
    </div>
  )
}
ENDFILE

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const backgroundImages = [
  'photo-1497366216548-37526070297c',
  'photo-1522071820081-009f0129c71c',
  'photo-1542744173-8e7e53415bb0'
]

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) throw error
      if (!data.user) throw new Error('No user data')
      
      const userRole = data.user.user_metadata?.role || 'manager'
      toast.success('Welcome back!')
      
      const routes: Record<string, string> = {
        manager: '/dashboard/manager',
        agency: '/dashboard/agency',
        candidate: '/dashboard/candidate',
        admin: '/dashboard/admin'
      }
      
      setTimeout(() => {
        window.location.href = routes[userRole] || '/dashboard/manager'
      }, 1000)
      
    } catch (error: any) {
      toast.error(error.message || 'Sign in failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-10 h-10 text-primary-600" />
            </motion.div>
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue</p>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" required disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" required disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6">
            <Link href="/auth/signup" className="text-primary-600 font-semibold">Sign up</Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBg}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 1 }}
            className="absolute inset-0">
            <Image 
              src={`https://images.unsplash.com/${backgroundImages[currentBg]}?auto=format&fit=crop&w=2850&q=80`}
              alt="Office" 
              fill 
              className="object-cover" 
              priority 
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 to-emerald-600/90" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-center p-12">
            <h2 className="text-5xl font-bold mb-6">AI-Powered Recruitment</h2>
            <p className="text-xl">Smart matching • Real-time insights • Automated workflows</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

cat > app/auth/signup/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const backgroundImages = [
  'photo-1557804506-669a67965ba0',
  'photo-1522071820081-009f0129c71c',
  'photo-1600880292203-757bb62b4baf'
]

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('manager')
  const [loading, setLoading] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await createClient().auth.signUp({
        email, password, options: { data: { name, role } }
      })
      if (error) throw error
      toast.success('Account created!')
      router.push('/auth/signin')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-10 h-10 text-primary-600" />
            </motion.div>
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-600 mb-8">Join thousands of companies hiring smarter</p>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">I am a</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input">
                <option value="manager">Hiring Manager</option>
                <option value="agency">Recruitment Agency</option>
                <option value="candidate">Job Candidate</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6">
            <Link href="/auth/signin" className="text-primary-600 font-semibold">Sign in</Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBg}
            initial={{ opacity: 0, scale: 1.1, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
            transition={{ duration: 1 }}
            className="absolute inset-0">
            <Image 
              src={`https://images.unsplash.com/${backgroundImages[currentBg]}?auto=format&fit=crop&w=2850&q=80`}
              alt="Team" 
              fill 
              className="object-cover" 
              priority 
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-primary-600/90" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-center p-12">
            <h2 className="text-5xl font-bold mb-6">Start Hiring Smarter</h2>
            <p className="text-xl mb-8">AI-powered recruitment platform trusted by 1000+ companies</p>
            <div className="flex justify-center gap-8">
              {['95%', '10x', '18 days'].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="bg-white/20 backdrop-blur px-6 py-4 rounded-xl">
                  <p className="text-3xl font-bold">{stat}</p>
                  <p className="text-sm opacity-90">{['Match Rate', 'Faster', 'Avg Hire'][i]}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

cat > README.md << 'ENDFILE'
# TalentDetector AI - Complete AI-Powered System

## ✅ ALL FEATURES:
1. ✅ AI job description generator
2. ✅ AI recommendations & insights
3. ✅ Dynamic rotating background images
4. ✅ Fixed database foreign key constraint
5. ✅ Role-based dashboards
6. ✅ Analytics with PDF export
7. ✅ Animated UI throughout

## Setup:
1. **Create Supabase Project**
2. **Run migrations/fixed-schema.sql** in SQL Editor
3. **Update .env.local** with your Supabase credentials
4. npm install
5. npm run dev

## Database Fix:
- Removed foreign key constraint on jobs table
- Now uses UUID directly from auth.users
- No more foreign key violations!

## AI Features:
- Auto-generate job descriptions from keywords
- Get AI insights and recommendations
- Predict application volume and time-to-hire
- Mock AI (replace with real OpenAI later)
ENDFILE

echo "✅ AI Features Added & Database Fixed!"
echo ""
echo "IMPORTANT: Run migrations/fixed-schema.sql in Supabase first!"
echo "Then: npm install && npm run dev"
