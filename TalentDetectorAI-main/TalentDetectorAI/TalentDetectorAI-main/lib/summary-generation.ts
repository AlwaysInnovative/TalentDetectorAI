// =========================================================================
// FILE 1: SUMMARY GENERATION SERVICE
// =========================================================================
// Purpose: Generate AI summaries from candidate interest data
// Location: services/summaryGenerationService.ts
// =========================================================================

import { createClient } from '@supabase/supabase-js';

interface CandidateInterest {
  id: string;
  candidateid: string;
  jobid: string;
  agencyid: string;
  ai_match_score: number;
  ai_cv_analysis: any;
  salary_range: string;
  job_title: string;
  job_location: string;
  job_description: string;
  right_to_represent_signed: boolean;
  rtr_status: string;
}

interface SkillsMatch {
  matched_skills: string[];
  missing_skills: string[];
  additional_skills: string[];
  match_percentage: number;
}

interface HeatMap {
  technical_skills: number;
  cultural_fit: number;
  experience_level: number;
  communication_skills: number;
  leadership_potential: number;
}

interface CandidateSummary {
  interest_id: string;
  candidate_id: string;
  job_id: string;
  agency_id: string;
  executive_summary: string;
  skills_match: SkillsMatch;
  key_strengths: string[];
  recommendations: string;
  heat_map: HeatMap;
  ai_match_score: number;
  status: 'draft' | 'ready' | 'sent';
  created_at: string;
}

export class SummaryGenerationService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );

  async generateCandidateSummary(
    interestId: string
  ): Promise<CandidateSummary | null> {
    try {
      // Fetch candidate interest with all details
      const { data: interest, error: interestError } = await this.supabase
        .from('candidate_interests')
        .select(`
          id,
          candidate_id,
          job_id,
          agency_id,
          ai_match_score,
          ai_cv_analysis,
          salary_range,
          job_title,
          job_location,
          job_description,
          right_to_represent_signed,
          rtr_status
        `)
        .eq('id', interestId)
        .single();

      if (interestError || !interest) {
        console.error('Failed to fetch interest:', interestError);
        return null;
      }

      // Fetch candidate data
      const { data: candidate } = await this.supabase
        .from('candidates')
        .select('id, parsed_resume, skills, experience_years, ai_summary')
        .eq('id', interest.candidate_id)
        .single();

      // Fetch job details
      const { data: job } = await this.supabase
        .from('jobs')
        .select('id, title, description, required_skills, location')
        .eq('id', interest.job_id)
        .single();

      // Parse CV analysis
      const cvAnalysis = interest.ai_cv_analysis || {};
      const candidateSkills = candidate?.skills || [];
      const requiredSkills = job?.required_skills || [];

      // Calculate skills matching
      const matchedSkills = candidateSkills.filter((skill: string) =>
        requiredSkills.some((req: string) => 
          req.toLowerCase().includes(skill.toLowerCase())
        )
      );

      const missingSkills = requiredSkills.filter((req: string) =>
        !candidateSkills.some((skill: string) =>
          req.toLowerCase().includes(skill.toLowerCase())
        )
      );

      const additionalSkills = candidateSkills.filter((skill: string) =>
        !requiredSkills.some((req: string) =>
          req.toLowerCase().includes(skill.toLowerCase())
        )
      );

      const matchPercentage = requiredSkills.length > 0
        ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
        : 0;

      // Generate heat map scores
      const heatMap: HeatMap = {
        technical_skills: interest.ai_match_score,
        cultural_fit: Math.min(100, interest.ai_match_score + 10),
        experience_level: Math.min(100, candidate?.experience_years ? (candidate.experience_years * 5) : 50),
        communication_skills: Math.min(100, interest.ai_match_score - 5),
        leadership_potential: Math.min(100, interest.ai_match_score + 15),
      };

      // Generate executive summary
      const executiveSummary = this.generateExecutiveSummary(
        interest,
        candidate,
        job,
        matchPercentage
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        interest,
        matchPercentage,
        missingSkills
      );

      // Extract key strengths
      const keyStrengths = this.extractKeyStrengths(
        cvAnalysis,
        matchedSkills,
        heatMap
      );

      // Create summary record
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
        key_strengths: keyStrengths,
        recommendations,
        heat_map: heatMap,
        ai_match_score: interest.ai_match_score,
        status: 'draft',
        created_at: new Date().toISOString(),
      };

      // Save summary to database
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
            created_at: summary.created_at,
          },
        ])
        .select()
        .single();

      if (saveError) {
        console.error('Failed to save summary:', saveError);
        return null;
      }

      return summary;
    } catch (error) {
      console.error('Error generating summary:', error);
      return null;
    }
  }

  private generateExecutiveSummary(
    interest: CandidateInterest,
    candidate: any,
    job: any,
    matchPercentage: number
  ): string {
    const verdict = matchPercentage >= 80 ? 'EXCELLENT' : 
                   matchPercentage >= 60 ? 'GOOD' : 
                   matchPercentage >= 40 ? 'MODERATE' : 'LIMITED';

    return `
${verdict} FIT - ${matchPercentage}% Skills Match

Candidate has ${interest.ai_match_score}/100 AI match score for the ${job?.title || 'position'} role.

Experience: ${candidate?.experience_years || 'Unknown'} years of professional experience
Location: ${interest.job_location}
Salary Range: ${interest.salary_range}
RTR Status: ${interest.rtr_status === 'signed' ? '✓ SIGNED' : '⏳ PENDING'}

This candidate demonstrates strong alignment with the position requirements.

${interest.right_to_represent_signed ? '✓ Right to Represent agreement is signed.' : '⚠️ Right to Represent agreement pending.'}

Recommended for: ${verdict === 'EXCELLENT' ? 'Interview scheduling' : 'Further review'}
    `.trim();
  }

  private generateRecommendations(
    interest: CandidateInterest,
    matchPercentage: number,
    missingSkills: string[]
  ): string {
    const recommendations: string[] = [];

    if (matchPercentage >= 80) {
      recommendations.push('Proceed with interview scheduling');
    } else if (matchPercentage >= 60) {
      recommendations.push('Consider for screening interview');
    } else {
      recommendations.push('Discuss skill gaps with candidate');
    }

    if (interest.right_to_represent_signed) {
      recommendations.push('RTR agreement is signed');
    } else {
      recommendations.push('Obtain RTR signature before proceeding');
    }

    return recommendations.join('\n• ');
  }

  private extractKeyStrengths(
    cvAnalysis: any,
    matchedSkills: string[],
    heatMap: HeatMap
  ): string[] {
    const strengths: string[] = [];

    strengths.push(...matchedSkills.slice(0, 3));

    if (heatMap.technical_skills >= 80) {
      strengths.push('Strong technical foundation');
    }
    if (heatMap.leadership_potential >= 75) {
      strengths.push('Leadership potential');
    }

    return strengths.slice(0, 5);
  }

  async getSummary(interestId: string): Promise<CandidateSummary | null> {
    try {
      const { data, error } = await this.supabase
        .from('candidate_summaries')
        .select('*')
        .eq('interest_id', interestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching summary:', error);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error getting summary:', error);
      return null;
    }
  }

  async updateSummaryStatus(
    summaryId: string,
    status: 'draft' | 'ready' | 'sent' | 'reviewed',
    hiringManagerId?: string
  ): Promise<boolean> {
    try {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (status === 'sent' && hiringManagerId) {
        updateData.sent_to_hm_at = new Date().toISOString();
        updateData.hiring_manager_id = hiringManagerId;
      }

      const { error } = await this.supabase
        .from('candidate_summaries')
        .update(updateData)
        .eq('id', summaryId);

      if (error) {
        console.error('Error updating summary status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating summary:', error);
      return false;
    }
  }
}

export default new SummaryGenerationService();
