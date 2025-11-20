'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Brain, Zap, Users, TrendingUp, Star, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Landing() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 300], [0, 150])
  const y2 = useTransform(scrollY, [0, 300], [0, -150])
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = [
    { title: 'AI Matching', desc: '95% accuracy', image: 'photo-1485827404703-89b55fcc595e' },
    { title: 'Smart Screening', desc: '10x faster', image: 'photo-1551434678-e076c223a692' },
    { title: 'Real-time Analytics', desc: 'Live insights', image: 'photo-1460925895917-afdab827c52f' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen overflow-hidden">
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>
          <div className="flex gap-4">
            <Link href="/auth/signin"><button className="px-6 py-2 font-semibold">Sign In</button></Link>
            <Link href="/auth/signup"><button className="btn-primary">Start Free</button></Link>
          </div>
        </div>
      </nav>

      <section className="min-h-screen flex items-center justify-center relative">
        <Image 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80" 
          alt="Professional team collaboration" 
          fill 
          className="object-cover" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/95 to-emerald-600/95" />
        
        <motion.div style={{ y: y1 }} className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
        <motion.div style={{ y: y2 }} className="absolute bottom-20 right-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl animate-float" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center text-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Brain className="w-12 h-12" />
            </motion.div>
            <h1 className="text-7xl font-bold mb-6">AI-Powered Recruitment</h1>
            <p className="text-2xl mb-8 max-w-3xl mx-auto">Smart matching • Automated workflows • Real-time insights</p>
            <Link href="/auth/signup">
              <button className="bg-white text-primary-700 px-12 py-5 rounded-xl font-bold text-xl shadow-2xl">
                Get Started Free <ArrowRight className="inline ml-2" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16 text-primary-600">AI Features</h2>
          <div className="relative h-96">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 100 }}
                animate={{ 
                  opacity: i === currentFeature ? 1 : 0,
                  x: i === currentFeature ? 0 : 100,
                  zIndex: i === currentFeature ? 10 : 0
                }}
                className="absolute inset-0 flex items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-4xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-2xl text-gray-600">{feature.desc}</p>
                </div>
                <div className="flex-1 relative h-80">
                  <Image src={`https://images.unsplash.com/${feature.image}?auto=format&fit=crop&w=800&q=80`}
                    alt={feature.title} fill className="object-cover rounded-2xl shadow-2xl" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-100 overflow-hidden">
        <div className="flex animate-slide whitespace-nowrap">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="inline-flex items-center mx-8">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 mr-2" />
              <span className="font-semibold">Trusted by 1000+ Companies</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
