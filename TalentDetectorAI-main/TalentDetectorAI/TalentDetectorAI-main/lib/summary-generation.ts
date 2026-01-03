import { createClient } from '@/lib/supabase/client'

interface CandidateSummary {
  id?: string
  interest_id: string
  candidate_id: string
  job_id: string
  agency_id: string
  executive_summary: string
  skills_match: {
    matched_skills: string[]
    missing_skills: string[]
    additional_skills: string[]
    match_percentage: number
  }
  key_strengths: string[]
  recommendations: string
  heat_map: {
    technical_skills: number
    cultural_fit: number
    experience_level: number
    communication_skills: number
    leadership_potential: number
  }
  ai_match_score: number
  status: 'draft' | 'ready' | 'sent' | 'reviewed'
  created_at?: string
  sent_to_hm_at?: string
  hm_feedback?: string
}

class SummaryGenerationService {
  private supabase = createClient()

  async generateCandidateSummary(
    interestId: string
  ): Promise<CandidateSummary | null> {
    try {
      console.log('🔍 Fetching interest:', interestId)

      // Fetch candidate interest
      const { data: interest, error: interestError } = await this.supabase
        .from('candidate_interests')
        .select('*')
        .eq('id', interestId)
        .single()

      if (interestError || !interest) {
        console.error('❌ Interest fetch failed:', interestError)
        return null
      }

      console.log('✅ Interest loaded:', interest.id)

      // Fetch candidate
      const { data: candidate, error: candidateError } = await this.supabase
        .from('candidates')
        .select('*')
        .eq('id', interest.candidate_id)
        .single()

      if (candidateError || !candidate) {
        console.error('❌ Candidate fetch failed:', candidateError)
        return null
      }

      // Fetch job
      const { data: job, error: jobError } = await this.supabase
        .from('jobs')
        .select('*')
        .eq('id', interest.job_id)
        .single()

      if (jobError || !job) {
        console.error('❌ Job fetch failed:', jobError)
        return null
      }

      console.log('✅ All data loaded successfully')

      // Parse skills (handle both array and string formats)
      const candidateSkills = Array.isArray(candidate.skills)
        ? candidate.skills
        : typeof candidate.skills === 'string'
        ? candidate.skills.split(',').map((s: string) => s.trim())
        : []

      const requiredSkills = Array.isArray(job.skills)
        ? job.skills
        : typeof job.skills === 'string'
        ? job.skills.split(',').map((s: string) => s.trim())
        : []

      // Calculate skills matching
      const matchedSkills = candidateSkills.filter((skill: string) =>
        requiredSkills.some((req: string) =>
          req.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(req.toLowerCase())
        )
      )

      const missingSkills = requiredSkills.filter((req: string) =>
        !candidateSkills.some((skill: string) =>
          req.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(req.toLowerCase())
        )
      )

      const additionalSkills = candidateSkills.filter((skill: string) =>
        !requiredSkills.some((req: string) =>
          req.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(req.toLowerCase())
        )
      )

      const matchPercentage =
        requiredSkills.length > 0
          ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
          : 0

      // Generate heat map based on match score
      const baseScore = interest.ai_match_score || 75
      const heatMap = {
        technical_skills: Math.min(100, baseScore + (matchPercentage - 50) / 2),
        cultural_fit: Math.min(100, baseScore + 10),
        experience_level: Math.min(
          100,
          candidate.experience_years
            ? Math.min(100, candidate.experience_years * 8)
            : baseScore
        ),
        communication_skills: Math.min(100, Math.max(0, baseScore - 5)),
        leadership_potential: Math.min(100, baseScore + 15),
      }

      // Generate executive summary
      const executiveSummary = `
CANDIDATE PROFILE ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━

Candidate: ${candidate.name || 'Unknown'}
Position: ${job.title || 'Unknown Position'}
Experience: ${candidate.experience_years || 'Unknown'} years
Overall Match Score: ${baseScore}/100

SKILLS ALIGNMENT
Skills Match: ${matchPercentage}% (${matchedSkills.length}/${requiredSkills.length} skills)
• Matched Skills: ${matchedSkills.length > 0 ? matchedSkills.join(', ') : 'None'}
• Missing Skills: ${missingSkills.length > 0 ? missingSkills.slice(0, 3).join(', ') : 'None'}

ASSESSMENT SUMMARY
This candidate shows ${matchPercentage >= 80 ? 'strong' : matchPercentage >= 60 ? 'moderate' : 'limited'} alignment with the position requirements. 
${matchPercentage >= 80 ? '✓ Ready for interview scheduling.' : '⏳ Recommend screening interview first.'}

RTR Status: ${interest.right_to_represent_signed ? '✓ SIGNED' : '⏳ PENDING'}
      `.trim()

      // Generate recommendations
      const recommendations =
        matchPercentage >= 80
          ? '✓ Proceed with interview scheduling\n• RTR agreement is signed and valid\n• Strong technical and soft skills alignment\n• Recommend prioritizing this candidate'
          : matchPercentage >= 60
          ? '⏳ Schedule screening interview\n• Discuss skill gaps with candidate\n• Assess willingness to learn\n• Explore transferable skills'
          : '⚠️ Consider for specialized roles only\n• Limited immediate match\n• May require training\n• Check for growth potential'

      // Extract key strengths
      const keyStrengths = [
        ...matchedSkills.slice(0, 3),
        matchPercentage >= 80
          ? 'Strong technical foundation'
          : 'Good learning attitude',
        'Professional background',
      ]
        .filter((s) => s && typeof s === 'string')
        .slice(0, 5)

      // Create summary object
      const summary: CandidateSummary = {
        interest_id: interestId,
        candidate_id: interest.candidate_id,
        job_id: interest.job_id,
        agency_id: interest.agency_id,
        executive_summary: executiveSummary,
        skills_match: {
          matched_skills: matchedSkills,
          missing_skills: missingSkills,
          additional_skills: additionalSkills,
          match_percentage: matchPercentage,
        },
        key_strengths: keyStrengths as string[],
        recommendations,
        heat_map: heatMap,
        ai_match_score: baseScore,
        status: 'draft',
      }

      // Save to database
      const { data: savedSummary, error: saveError } = await this.supabase
        .from('candidate_summaries')
        .insert([
          {
            interest_id: summary.interest_id,
            candidate_id: summary.candidate_id,
            job_id: summary.job_id,
            agency_id: summary.agency_id,
            executive_summary: summary.executive_summary,
            skills_match: summary.skills_match,
            key_strengths: summary.key_strengths,
            recommendations: summary.recommendations,
            heat_map: summary.heat_map,
            ai_match_score: summary.ai_match_score,
            status: summary.status,
          },
        ])
        .select()
        .single()

      if (saveError) {
        console.error('❌ Save error:', saveError)
        return null
      }

      console.log('✅ Summary created:', savedSummary.id)
      return {
        ...summary,
        id: savedSummary.id,
        created_at: savedSummary.created_at,
      }
    } catch (error) {
      console.error('❌ Error generating summary:', error)
      return null
    }
  }

  async getSummary(interestId: string): Promise<CandidateSummary | null> {
    try {
      const { data, error } = await this.supabase
        .from('candidate_summaries')
        .select('*')
        .eq('interest_id', interestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        console.error('Error getting summary:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error getting summary:', error)
      return null
    }
  }

  async updateSummaryStatus(
    summaryId: string,
    status: 'draft' | 'ready' | 'sent' | 'reviewed'
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('candidate_summaries')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', summaryId)

      if (error) {
        console.error('Error updating summary:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error updating summary:', error)
      return false
    }
  }
}

export default new SummaryGenerationService()
