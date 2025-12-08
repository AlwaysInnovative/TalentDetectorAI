'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { User, Building, Mail, Phone, Globe, Save } from 'lucide-react'
import AnimatedBg from '@/components/ui/AnimatedBg'

export default function AgencyProfile() {
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    website: '',
    description: '',
    specialization: '',
    yearsInBusiness: ''
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
        website: user.user_metadata?.website || '',
        description: user.user_metadata?.description || '',
        specialization: user.user_metadata?.specialization || '',
        yearsInBusiness: user.user_metadata?.yearsInBusiness || ''
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
        toast.success('Profile updated successfully!')
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <AnimatedBg index={1} />
      
      <h1 className="text-4xl font-bold text-primary-600 mb-8">Agency Profile</h1>

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
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Website
              </label>
              <input type="url" value={profile.website}
                onChange={e => setProfile({...profile, website: e.target.value})}
                className="input" placeholder="https://..." />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Years in Business</label>
              <input type="number" value={profile.yearsInBusiness}
                onChange={e => setProfile({...profile, yearsInBusiness: e.target.value})}
                className="input" />
            </div>
          </div>
        </div>

        <div className="card md:col-span-2">
          <h2 className="text-2xl font-bold mb-6">Professional Details</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Specialization</label>
              <input type="text" value={profile.specialization}
                onChange={e => setProfile({...profile, specialization: e.target.value})}
                className="input" placeholder="e.g., Tech Recruitment, Healthcare, Finance" />
            </div>
            
            <div>
              <label className="block text-sm font-semibold mb-2">Company Description</label>
              <textarea value={profile.description}
                onChange={e => setProfile({...profile, description: e.target.value})}
                className="input h-32" placeholder="Tell us about your agency..." />
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
    </div>
  )
}
