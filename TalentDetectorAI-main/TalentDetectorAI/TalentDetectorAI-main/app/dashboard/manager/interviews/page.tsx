'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Calendar, Clock, Video, MapPin, Plus, User } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data } = await supabase
    .from('interviews')
    .select('*, applications(*, candidates(*), jobs!inner(manager_id, title))')
    .eq('applications.jobs.manager_id', user?.id || '')
    .order('scheduled_at', { ascending: true })
  
  return data || []
}

export default function Interviews() {
  const { data: interviews, mutate } = useSWR('manager-interviews', fetcher, { refreshInterval: 3000 })
  const [showNew, setShowNew] = useState(false)

  const now = new Date()
  const upcoming = interviews?.filter((i: any) => new Date(i.scheduled_at) > now) || []
  const past = interviews?.filter((i: any) => new Date(i.scheduled_at) <= now) || []

  return (
    <div className="relative">
      <DynamicBackground page="interviews" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Interview Schedule</h1>
          <p className="text-gray-600">{upcoming.length} upcoming • {past.length} completed</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Upcoming Interviews</h2>
          {upcoming.length > 0 ? (
            <div className="space-y-4">
              {upcoming.map((interview: any) => (
                <div key={interview.id} className="card hover:shadow-xl transition">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                      <User className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{interview.applications?.candidates?.name || 'Candidate'}</p>
                      <p className="text-sm text-gray-600">{interview.applications?.jobs?.title}</p>
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                        {interview.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-primary-600" />
                      <span>{new Date(interview.scheduled_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-primary-600" />
                      <span>{new Date(interview.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-700 col-span-2">
                      {interview.type === 'video' ? <Video className="w-4 h-4 text-primary-600" /> : <MapPin className="w-4 h-4 text-primary-600" />}
                      <span>{interview.location || 'Video Call'}</span>
                    </div>
                  </div>

                  {interview.ai_questions && interview.ai_questions.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <p className="text-sm font-semibold text-purple-900 mb-2">AI Suggested Questions:</p>
                      <ul className="text-xs text-purple-800 space-y-1">
                        {interview.ai_questions.slice(0, 3).map((q: string, i: number) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-20">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming interviews</p>
              <p className="text-gray-400 text-sm mt-2">Schedule interviews from candidate pages</p>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4">Past Interviews</h2>
          {past.length > 0 ? (
            <div className="space-y-4">
              {past.slice(0, 5).map((interview: any) => (
                <div key={interview.id} className="card opacity-75">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold">{interview.applications?.candidates?.name || 'Candidate'}</p>
                      <p className="text-sm text-gray-600">{interview.applications?.jobs?.title}</p>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(interview.scheduled_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-20">
              <p className="text-gray-500">No past interviews</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
