#!/bin/bash
# TalentDetector AI - Fixed Production
# Run: bash fixed-setup.sh

set -e

echo "🚀 TalentDetector AI - Fixed Setup"

rm -rf app node_modules .next package-lock.json 2>/dev/null || true

mkdir -p app/{api,auth/{signin,signup},dashboard/manager/{jobs,candidates,pipeline,interviews,analytics,offers}} lib/supabase migrations

cat > package.json << 'ENDFILE'
{
  "name": "talentdetectorai",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "@supabase/ssr": "^0.1.0",
    "next": "^14.2.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^11.0.8",
    "recharts": "^2.12.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.344.0",
    "swr": "^2.2.5"
  },
  "devDependencies": {
    "@types/node": "^20.11.19",
    "@types/react": "^18.2.57",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "@tailwindcss/forms": "^0.5.7"
  }
}
ENDFILE

cat > tsconfig.json << 'ENDFILE'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
ENDFILE

cat > next.config.js << 'ENDFILE'
module.exports = { reactStrictMode: true, images: { domains: ['images.unsplash.com'] } }
ENDFILE

cat > tailwind.config.js << 'ENDFILE'
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' },
      },
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
ENDFILE

cat > postcss.config.js << 'ENDFILE'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
ENDFILE

cat > .env.local << 'ENDFILE'
NEXT_PUBLIC_SUPABASE_URL=https://demo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo
ENDFILE

cat > app/globals.css << 'ENDFILE'
@tailwind base;
@tailwind components;
@tailwind utilities;
.btn-primary { @apply bg-gradient-to-r from-brand-600 to-brand-700 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-xl; }
.card { @apply bg-white rounded-xl shadow-lg p-6 border hover:shadow-2xl transition-all; }
ENDFILE

cat > app/layout.tsx << 'ENDFILE'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = { title: 'TalentDetector AI' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}<Toaster /></body>
    </html>
  )
}
ENDFILE

cat > app/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Brain } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-600 to-orange-600">
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-brand-600">TalentDetector AI</div>
          <div className="flex gap-4">
            <Link href="/auth/signin"><button className="px-6 py-2 font-semibold text-brand-700">Sign In</button></Link>
            <Link href="/auth/signup"><button className="btn-primary">Start Free</button></Link>
          </div>
        </div>
      </nav>

      <div className="min-h-screen flex items-center justify-center text-white pt-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <Brain className="w-20 h-20 mx-auto mb-8" />
            <h1 className="text-7xl font-bold mb-6">AI-Powered Hiring</h1>
            <p className="text-2xl mb-8">Smart matching • Real-time analytics</p>
            <Link href="/auth/signup">
              <button className="bg-white text-brand-700 px-12 py-5 rounded-xl font-bold text-xl hover:shadow-2xl">
                Get Started <ArrowRight className="inline ml-2" />
              </button>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

cat > lib/supabase/client.ts << 'ENDFILE'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Add Supabase credentials')
  return createBrowserClient(url, key)
}
ENDFILE

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      const role = data.user?.user_metadata?.role || 'manager'
      toast.success('Welcome!')
      
      if (role === 'manager') router.push('/dashboard/manager')
      else if (role === 'candidate') router.push('/dashboard/candidate')
      else if (role === 'agency') router.push('/dashboard/agency')
      else router.push('/dashboard/manager')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-brand-600">Sign In</h1>
        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg" required />
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm">
          No account? <Link href="/auth/signup" className="text-brand-600 font-semibold">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
ENDFILE

cat > app/auth/signup/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('manager')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-brand-600">Create Account</h1>
        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Role</label>
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full px-4 py-3 border rounded-lg">
              <option value="manager">Hiring Manager</option>
              <option value="candidate">Candidate</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full btn-primary">
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center mt-6 text-sm">
          Have account? <Link href="/auth/signin" className="text-brand-600 font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/layout.tsx << 'ENDFILE'
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Briefcase, Users, LogOut } from 'lucide-react'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { user: authUser }, error } = await createClient().auth.getUser()
      if (error || !authUser) return router.push('/auth/signin')
      
      const userRole = authUser.user_metadata?.role || 'manager'
      if (userRole !== 'manager') return router.push('/auth/signin')
      
      setUser({ id: authUser.id, name: authUser.user_metadata?.name || authUser.email?.split('@')[0], role: userRole })
    } catch {
      router.push('/auth/signin')
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (!user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b fixed w-full z-30">
        <div className="px-6 flex justify-between h-16 items-center">
          <div className="text-2xl font-bold text-brand-600">Manager Dashboard</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold">{user.name}</span>
            <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="w-64 bg-white border-r fixed h-full">
          <div className="p-4 space-y-1">
            <Link href="/dashboard/manager">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-brand-50">
                <Briefcase className="w-5 h-5" />
                <span>Jobs</span>
              </div>
            </Link>
            <Link href="/dashboard/manager/candidates">
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-brand-50">
                <Users className="w-5 h-5" />
                <span>Candidates</span>
              </div>
            </Link>
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/page.tsx << 'ENDFILE'
'use client'
export default function ManagerDashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-brand-600 mb-8">Manager Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="font-bold mb-2">Active Jobs</h3>
          <p className="text-3xl font-bold text-brand-600">0</p>
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Candidates</h3>
          <p className="text-3xl font-bold text-orange-600">0</p>
        </div>
        <div className="card">
          <h3 className="font-bold mb-2">Interviews</h3>
          <p className="text-3xl font-bold text-green-600">0</p>
        </div>
      </div>
    </div>
  )
}
ENDFILE

cat > migrations/schema.sql << 'ENDFILE'
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ENDFILE

cat > README.md << 'ENDFILE'
# TalentDetector AI

## Setup
1. Create Supabase project
2. Run migrations/schema.sql
3. Add credentials to .env.local
4. npm install
5. npm run dev

## Features
✅ Role-based auth (manager, candidate, agency)
✅ Fixed syntax errors
✅ Clean landing page
✅ Manager dashboard
ENDFILE

echo ""
echo "✅ FIXED SETUP COMPLETE!"
echo ""
echo "Run: npm install && npm run dev"
