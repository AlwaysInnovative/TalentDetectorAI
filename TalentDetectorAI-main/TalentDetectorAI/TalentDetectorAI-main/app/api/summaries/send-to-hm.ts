// =========================================================================
// FILE 2: SEND SUMMARY TO HIRING MANAGER API
// =========================================================================
// Purpose: API endpoint to send candidate summary to hiring manager
// Location: pages/api/summaries/send-to-hm.ts
// =========================================================================

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import summaryGenerationService from '../../../services/summaryGenerationService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface SendSummaryRequest {
  summaryId: string;
  hiringManagerId: string;
  agencyId: string;
}

interface SendSummaryResponse {
  success: boolean;
  message: string;
  summaryId?: string;
  sentAt?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SendSummaryResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { summaryId, hiringManagerId, agencyId } = req.body as SendSummaryRequest;

    if (!summaryId || !hiringManagerId) {
      return res.status(400).json({
        success: false,
        message: 'summaryId and hiringManagerId are required',
      });
    }

    // Fetch the summary
    const { data: summary, error: summaryError } = await supabase
      .from('candidate_summaries')
      .select(`
        id,
        interest_id,
        candidate_id,
        job_id,
        agency_id,
        executive_summary,
        skills_match,
        key_strengths,
        recommendations,
        heat_map,
        ai_match_score,
        status
      `)
      .eq('id', summaryId)
      .single();

    if (summaryError || !summary) {
      return res.status(404).json({
        success: false,
        message: 'Summary not found',
      });
    }

    // Fetch candidate details
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, name, email, current_position, experience_years')
      .eq('id', summary.candidate_id)
      .single();

    // Fetch job details
    const { data: job } = await supabase
      .from('jobs')
      .select('id, title, department, salary_min, salary_max')
      .eq('id', summary.job_id)
      .single();

    // Fetch interest details
    const { data: interest } = await supabase
      .from('candidate_interests')
      .select('salary_range, right_to_represent_signed')
      .eq('id', summary.interest_id)
      .single();

    // Fetch hiring manager details
    const { data: hiringManager } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', hiringManagerId)
      .single();

    if (!candidate || !job || !hiringManager) {
      return res.status(404).json({
        success: false,
        message: 'Missing required data',
      });
    }

    // Create analytics record
    const { error: analyticsError } = await supabase
      .from('interest_analytics')
      .upsert([
        {
          interest_id: summary.interest_id,
          summary: {
            executive_summary: summary.executive_summary,
            skills_match: summary.skills_match,
            key_strengths: summary.key_strengths,
            recommendations: summary.recommendations,
            heat_map: summary.heat_map,
            ai_match_score: summary.ai_match_score,
            candidate_name: candidate?.name,
            candidate_email: candidate?.email,
            job_title: job?.title,
            salary_range: interest?.salary_range,
            rtr_signed: interest?.right_to_represent_signed,
          },
          sent_to_hiring_manager_at: new Date().toISOString(),
          hiring_manager_id: hiringManagerId,
        },
      ]);

    // Update summary status
    const { error: updateError } = await supabase
      .from('candidate_summaries')
      .update({
        status: 'sent',
        sent_to_hm_at: new Date().toISOString(),
        hiring_manager_id: hiringManagerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', summaryId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to update summary status',
      });
    }

    // Create notification
    await supabase
      .from('notifications')
      .insert([
        {
          user_id: hiringManagerId,
          title: `New Candidate Summary: ${candidate?.name}`,
          message: `Review summary for ${candidate?.name}`,
          type: 'summary_sent',
          action_type: 'view_summary',
          reference_id: summaryId,
          priority: 'high',
          read: false,
        },
      ]);

    return res.status(200).json({
      success: true,
      message: 'Summary sent to hiring manager successfully',
      summaryId: summaryId,
      sentAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sending summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
