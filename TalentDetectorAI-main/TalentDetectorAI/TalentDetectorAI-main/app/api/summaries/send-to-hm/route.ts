import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { summaryId, hiringManagerId, agencyId } = await req.json()

    if (!summaryId || !hiringManagerId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createClient()

    // Update summary status and hiring manager
    const { data: updatedSummary, error: updateError } = await supabase
      .from('candidate_summaries')
      .update({
        status: 'sent',
        sent_to_hm_at: new Date().toISOString(),
        hiring_manager_id: hiringManagerId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', summaryId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      return NextResponse.json(
        { success: false, message: 'Failed to update summary' },
        { status: 500 }
      )
    }

    console.log('✅ Summary updated:', updatedSummary.id)

    // Create notification for hiring manager
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: hiringManagerId,
          title: 'New Candidate Summary',
          message: `A new candidate summary is ready for your review`,
          type: 'summary_sent',
          action_type: 'view_summary',
          reference_id: summaryId,
          read: false,
          created_at: new Date().toISOString(),
        },
      ])

    if (notificationError) {
      console.warn('⚠️ Notification creation warning:', notificationError)
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Summary sent successfully',
      summaryId: updatedSummary.id,
      sentAt: updatedSummary.sent_to_hm_at,
    })
  } catch (error) {
    console.error('❌ Server error:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
