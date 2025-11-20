'use client'
import { motion } from 'framer-motion'
import Image from 'next/image'

const images = [
  'photo-1600880292203-757bb62b4baf',
  'photo-1542744173-8e7e53415bb0',
  'photo-1552664730-d307ca884978'
]

export default function AnimatedBg({ index = 0 }: { index?: number }) {
  const imgIndex = index % images.length
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 2, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute inset-0">
        <Image 
          src={'https://images.unsplash.com/' + images[imgIndex] + '?auto=format&fit=crop&w=2850&q=80'}
          alt="Background"
          fill
          className="object-cover opacity-5"
          priority
        />
      </motion.div>
      
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -100, 0],
        }}
        transition={{ duration: 20, repeat: Infinity }}
        className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-primary-200/20 to-emerald-200/20 rounded-full blur-3xl"
      />
      
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
        }}
        transition={{ duration: 25, repeat: Infinity }}
        className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-3xl"
      />
    </div>
  )
}
