'use client'
import { motion } from 'framer-motion'

interface CinematicBackgroundProps {
  variant?: 'office' | 'tech' | 'meeting' | 'default'
}

export default function CinematicBackground({ variant = 'default' }: CinematicBackgroundProps) {
  const backgrounds = {
    office: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    tech: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    meeting: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    default: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
  }

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute inset-0"
        style={{ background: backgrounds[variant] }}
        animate={{
          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear'
        }}
      />

      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-white/20 rounded-full"
          initial={{
            x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
            y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: Math.random() * 5 + 5,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/5 to-black/10" />
    </div>
  )
}
