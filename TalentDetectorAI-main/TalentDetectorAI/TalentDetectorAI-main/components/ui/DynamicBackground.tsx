'use client'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useEffect, useState } from 'react'

const backgrounds: Record<string, string[]> = {
  dashboard: ['photo-1556761175-b413da4baf72', 'photo-1497366216548-37526070297c', 'photo-1522071820081-009f0129c71c'],
  jobs: ['photo-1454165804606-c3d57bc86b40', 'photo-1600880292089-90a7e086ee0c', 'photo-1542744173-8e7e53415bb0'],
  candidates: ['photo-1521737711867-e3b97375f902', 'photo-1573497019940-1c28c88b4f3e', 'photo-1507003211169-0a1dd7228f2d'],
  interviews: ['photo-1560439514-4e9645039924', 'photo-1542744173-8e7e53415bb0', 'photo-1515187029135-18ee286d815b'],
  analytics: ['photo-1460925895917-afdab827c52f', 'photo-1551288049-bebda4e38f71', 'photo-1551434678-e076c223a692']
}

export default function DynamicBackground({ page = 'dashboard' }: { page?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const images = backgrounds[page] || backgrounds.dashboard
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [images.length])
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0">
          <Image 
            src={'https://images.unsplash.com/' + images[currentIndex] + '?auto=format&fit=crop&w=2850&q=80'}
            alt="Background"
            fill
            className="object-cover"
            priority={currentIndex === 0}
          />
        </motion.div>
      </AnimatePresence>
      
      <div className="absolute inset-0 bg-gradient-to-br from-white/88 via-white/92 to-white/88 backdrop-blur-sm" />
      
      <motion.div
        animate={{ 
          x: [0, 150, 0], 
          y: [0, -150, 0],
          rotate: [0, 180, 360]
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-primary-300/15 to-emerald-300/15 rounded-full blur-3xl"
      />
      <motion.div
        animate={{ 
          x: [0, -150, 0], 
          y: [0, 150, 0],
          rotate: [360, 180, 0]
        }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-300/15 to-purple-300/15 rounded-full blur-3xl"
      />
    </div>
  )
}
