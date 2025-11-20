'use client'
import { motion } from 'framer-motion'
import { User, Building2, Briefcase, ArrowRight } from 'lucide-react'

interface NetworkNode {
  id: string
  type: 'manager' | 'job' | 'agency' | 'candidate'
  name: string
  data?: any
}

interface NetworkVisualizationProps {
  manager: any
  jobs: any[]
  agencies: any[]
  candidates: any[]
}

export default function NetworkVisualization({ manager, jobs, agencies, candidates }: NetworkVisualizationProps) {
  return (
    <div className="bg-white rounded-xl p-8 shadow-lg overflow-x-auto">
      <h3 className="text-2xl font-bold mb-6 text-center">Complete Hiring Network</h3>
      
      <div className="flex items-start gap-12 min-w-max">
        {/* Manager */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-xl">
            <User className="w-12 h-12 text-white" />
          </motion.div>
          <p className="mt-3 font-bold text-gray-900">You</p>
          <p className="text-xs text-gray-600">Hiring Manager</p>
        </div>

        <ArrowRight className="w-8 h-8 text-gray-400 mt-8" />

        {/* Jobs */}
        <div className="flex flex-col gap-8">
          {jobs.map((job, i) => (
            <div key={job.id} className="flex items-center gap-8">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.2 }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <Briefcase className="w-10 h-10 text-white" />
              </motion.div>
              
              <ArrowRight className="w-6 h-6 text-gray-400" />
              
              {/* Agencies for this job */}
              <div className="flex gap-6">
                {job.agencies?.map((agency: any, j: number) => (
                  <div key={agency.id} className="flex items-center gap-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.2 + j * 0.1 }}
                      className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg">
                      <Building2 className="w-8 h-8 text-white" />
                    </motion.div>
                    
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                    
                    {/* Candidates from this agency */}
                    <div className="flex gap-4">
                      {agency.candidates?.slice(0, 3).map((candidate: any, k: number) => (
                        <motion.div
                          key={candidate.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.2 + j * 0.1 + k * 0.05 }}
                          className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                          <User className="w-6 h-6 text-white" />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t flex justify-center gap-8 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded-full" />
          <span className="text-gray-700">Manager</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-600 rounded" />
          <span className="text-gray-700">Jobs</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-indigo-600 rounded" />
          <span className="text-gray-700">Agencies</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-600 rounded-full" />
          <span className="text-gray-700">Candidates</span>
        </div>
      </div>
    </div>
  )
}
