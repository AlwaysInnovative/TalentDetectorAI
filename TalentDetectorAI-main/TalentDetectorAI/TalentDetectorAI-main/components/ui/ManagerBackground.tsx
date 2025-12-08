'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

const backgrounds: Record<string, string> = {
  dashboard: 'photo-1556761175-b413da4baf72',
  jobs: 'photo-1454165804606-c3d57bc86b40',
  candidates: 'photo-1521737711867-e3b97375f902',
  analytics: 'photo-1460925895917-afdab827c52f'
}

export default function ManagerBackground({ page = 'dashboard' }: { page?: string }) {
  const imageId = backgrounds[page] || backgrounds.dashboard
  
  return (
    <div className="fixed inset-0 -z-10">
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="absolute inset-0">
        <Image 
          src={'https://images.unsplash.com/' + imageId + '?auto=format&fit=crop&w=2850&q=80'}
          alt="Background"
          fill
          className="object-cover opacity-10"
          priority
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-white/90 to-white/80" />
    </div>
  )
}
