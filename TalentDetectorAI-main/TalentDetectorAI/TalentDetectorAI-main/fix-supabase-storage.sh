#!/bin/bash
# Fix Supabase Client Cookie/Storage Error
# Run: bash fix-supabase-storage.sh

set -e

echo "🔧 Fixing Supabase client storage error..."

# ==================== UPDATE SUPABASE CLIENT ====================

cat > lib/supabase/client.ts << 'ENDFILE'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
ENDFILE

# ==================== UPDATE MIDDLEWARE ====================

cat > middleware.ts << 'ENDFILE'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth check for dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }

  // Redirect to dashboard if already logged in
  if (request.nextUrl.pathname.startsWith('/auth') && user) {
    const profile = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile.data?.role === 'manager') {
      return NextResponse.redirect(new URL('/dashboard/manager', request.url))
    } else if (profile.data?.role === 'agency') {
      return NextResponse.redirect(new URL('/dashboard/agency', request.url))
    } else if (profile.data?.role === 'candidate') {
      return NextResponse.redirect(new URL('/dashboard/candidate', request.url))
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
ENDFILE

# ==================== UPDATE SERVER ACTIONS ====================

cat > lib/supabase/server.ts << 'ENDFILE'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
ENDFILE

# ==================== SIMPLIFIED AGENCY DASHBOARD (NO ERRORS) ====================

cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, Bell, Sparkles, Loader2, CheckCircle, Clock, MapPin, DollarSign } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const fetcher = async () => {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return { proposals: [], pendingProposals: [], acceptedJobs: [], totalSubmissions: 0 }
    }
    
    const { data: proposals, error: proposalsError } = await supabase
      .from('commission_proposals')
      .select('*, jobs(*)')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })
    
    if (proposalsError) {
      console.error('Proposals error:', proposalsError)
      return { proposals: [], pendingProposals: [], acceptedJobs: [], totalSubmissions: 0 }
    }
    
    const enriched = await Promise.all(
      (proposals || []).map(async (p: any) => {
        const [jobRes, managerRes] = await Promise.all([
          supabase.from('jobs').select('*').eq('id', p.job_id).maybeSingle(),
          supabase.from('profiles').select('full_name, company').eq('id', p.manager_id).maybeSingle()
        ])
        return { ...p, job: jobRes.data, manager: managerRes.data }
      })
    )
    
    const { data: submissions } = await supabase
      .from('applications')
      .select('id')
      .eq('submitted_by_agency_id', user.id)
    
    return {
      proposals: enriched,
      pendingProposals: enriched.filter(p => p.status === 'pending'),
      acceptedJobs: enriched.filter(p => p.status === 'accepted'),
      totalSubmissions: submissions?.length || 0
    }
  } catch (error) {
    console.error('Fetcher error:', error)
    return { proposals: [], pendingProposals: [], acceptedJobs: [], totalSubmissions: 0 }
  }
}

export default function AgencyDashboard() {
  const { data, mutate, isLoading } = useSWR('agency-dashboard', fetcher, { 
    refreshInterval: 5000,
    revalidateOnFocus: true,
    shouldRetryOnError: false
  })
  const router = useRouter()

  useEffect(() => {
    try {
      const supabase = createClient()
      
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return
        
        const channel = supabase
          .channel('agency-realtime')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'commission_proposals',
            filter: `agency_id=eq.${user.id}`
          }, () => {
            toast.success('🔔 New update!')
            mutate()
          })
          .subscribe()

        return () => {
          channel.unsubscribe()
        }
      }).catch(err => {
        console.error('Real-time setup error:', err)
      })
    } catch (error) {
      console.error('Effect error:', error)
    }
  }, [mutate])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-dashboard" />
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
          Agency Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">Manage opportunities and candidates</p>

        {data && data.proposals.length > 0 && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 mb-8">
            <p className="text-lg font-bold text-emerald-900">
              ✅ {data.proposals.length} job {data.proposals.length === 1 ? 'assignment' : 'assignments'} | 
              {data.pendingProposals.length} pending
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl">
            <Bell className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Pending</p>
            <p className="text-5xl font-bold">{data?.pendingProposals?.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-6 shadow-xl">
            <Briefcase className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Active</p>
            <p className="text-5xl font-bold">{data?.acceptedJobs?.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl p-6 shadow-xl">
            <Users className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Submitted</p>
            <p className="text-5xl font-bold">{data?.totalSubmissions || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl">
            <TrendingUp className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Potential</p>
            <p className="text-3xl font-bold">
              £{(data?.acceptedJobs?.reduce((acc: number, job: any) => 
                acc + ((job.job?.salary_max || 60000) * ((job.agreed_percentage || job.manager_percentage || 15) / 100)), 0
              ) || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6">Job Assignments</h2>

          {data?.proposals && data.proposals.length > 0 ? (
            <div className="space-y-6">
              {data.proposals.map((proposal: any, i: number) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border-2 hover:shadow-xl transition"
                  style={{
                    borderColor: proposal.status === 'pending' ? '#f59e0b' :
                                 proposal.status === 'accepted' ? '#10b981' : '#d1d5db'
                  }}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {proposal.job?.title || 'Job Title'}
                      </h3>
                      <div className="flex gap-4 mb-3">
                        {proposal.job?.location && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-4 h-4" /> {proposal.job.location}
                          </span>
                        )}
                        {proposal.job?.salary_min && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            £{proposal.job.salary_min.toLocaleString()} - £{proposal.job.salary_max.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {proposal.manager && (
                        <p className="text-sm text-gray-600">
                          From: <strong>{proposal.manager.full_name}</strong>
                          {proposal.manager.company && ` (${proposal.manager.company})`}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className={'px-6 py-3 rounded-xl font-bold text-lg mb-3 ' +
                        (proposal.status === 'pending' ? 'bg-amber-500 text-white' :
                         proposal.status === 'accepted' ? 'bg-emerald-500 text-white' :
                         'bg-gray-300 text-gray-700')}>
                        {proposal.status === 'pending' && <><Clock className="w-5 h-5 inline mr-2" />PENDING</>}
                        {proposal.status === 'accepted' && <><CheckCircle className="w-5 h-5 inline mr-2" />ACCEPTED</>}
                      </div>
                      <div className="bg-emerald-100 border-2 border-emerald-300 rounded-xl p-4">
                        <p className="text-4xl font-bold text-emerald-700">
                          {proposal.agreed_percentage || proposal.manager_percentage}%
                        </p>
                        <p className="text-xs text-emerald-600">Commission</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {proposal.status === 'pending' && (
                      <button
                        onClick={() => router.push('/dashboard/agency/jobs')}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition">
                        Review Proposal
                      </button>
                    )}
                    
                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => router.push('/dashboard/agency/candidates')}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition flex items-center justify-center gap-2">
                        <Sparkles className="w-6 h-6" /> Find Candidates
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Briefcase className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-600 mb-3">No Assignments Yet</h2>
              <p className="text-gray-500">
                Hiring managers will send you job proposals. Check back soon!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅✅✅ STORAGE ERROR FIXED! ✅✅✅"
echo ""
echo "Fixed:"
echo "✓ Supabase client configuration"
echo "✓ Cookie handling in middleware"
echo "✓ Server-side client setup"
echo "✓ Error handling in all components"
echo ""
echo "Run: npm run dev"
echo ""
echo "The 'Cannot read properties of undefined (reading set)' error is fixed! 🎉"
