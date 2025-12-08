'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Building, Mail, Phone, Save, Camera } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'

export default function ManagerProfile() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    department: '',
    title: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setProfile({
        name: user.user_metadata?.name || '',
        company: user.user_metadata?.company || '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        department: user.user_metadata?.department || '',
        title: user.user_metadata?.title || ''
      })
    }
  }

  async function handleSave() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, ...profile }
        })
        
        if (error) throw error
        toast.success('Profile updated!')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="profile" />
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-primary-600 mb-8">My Profile</h1>

        <div className="card mb-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              <div className="w-32 h-32 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center text-white text-5xl font-bold">
                {profile.name.charAt(0) || 'U'}
              </div>
              <button className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50">
                <Camera className="w-5 h-5 text-gray-700" />
              </button>
            </div>
            <div>
              <h2 className="text-3xl font-bold">{profile.name || 'Your Name'}</h2>
              <p className="text-gray-600">{profile.title || 'Hiring Manager'}</p>
              <p className="text-gray-500">{profile.company || 'Company Name'}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <User className="w-6 h-6" /> Personal Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Full Name *</label>
                <input type="text" value={profile.name} 
                  onChange={e => setProfile({...profile, name: e.target.value})}
                  className="input" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Email
                </label>
                <input type="email" value={profile.email} disabled className="input bg-gray-100" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" /> Phone Number
                </label>
                <input type="tel" value={profile.phone}
                  onChange={e => setProfile({...profile, phone: e.target.value})}
                  className="input" />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Building className="w-6 h-6" /> Company Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Company Name</label>
                <input type="text" value={profile.company}
                  onChange={e => setProfile({...profile, company: e.target.value})}
                  className="input" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Job Title</label>
                <input type="text" value={profile.title}
                  onChange={e => setProfile({...profile, title: e.target.value})}
                  className="input" placeholder="e.g., Senior Hiring Manager" />
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2">Department</label>
                <input type="text" value={profile.department}
                  onChange={e => setProfile({...profile, department: e.target.value})}
                  className="input" placeholder="e.g., Human Resources" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button onClick={handleSave} disabled={loading} className="btn-primary flex items-center gap-2">
            <Save className="w-5 h-5" />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
