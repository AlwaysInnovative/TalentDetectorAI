'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Users, DollarSign, Clock } from 'lucide-react'

interface RoleInsightsProps {
  role: string
  data: {
    applications: number
    avgMatchScore: number
    timeToFill: number
    costPerHire: number
  }
}

export default function RoleInsightsCard({ role, data }: RoleInsightsProps) {
  const [rotateX, setRotateX] = useState(0)
  const [rotateY, setRotateY] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    
    const rotateXValue = ((y - centerY) / centerY) * -10
    const rotateYValue = ((x - centerX) / centerX) * 10
    
    setRotateX(rotateXValue)
    setRotateY(rotateYValue)
  }

  const handleMouseLeave = () => {
    setRotateX(0)
    setRotateY(0)
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        rotateX,
        rotateY,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative w-full h-64 cursor-pointer">
      
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-2xl p-6"
        style={{ transform: 'translateZ(20px)' }}>
        
        <div style={{ transform: 'translateZ(40px)' }}>
          <h3 className="text-2xl font-bold text-white mb-4">{role}</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Applications</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.applications}</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Avg Match</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.avgMatchScore}%</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Time to Fill</span>
              </div>
              <p className="text-2xl font-bold text-white">{data.timeToFill}d</p>
            </div>

            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-white" />
                <span className="text-xs text-white/80">Cost/Hire</span>
              </div>
              <p className="text-2xl font-bold text-white">£{data.costPerHire}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
