import { createClient } from '@/lib/supabase/client'

export class RealtimeEngine {
  private supabase = createClient()
  private subscriptions: any[] = []

  subscribeToSubmissions(jobId: string, callback: (payload: any) => void) {
    const channel = this.supabase
      .channel('submissions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'agency_submissions',
          filter: `job_id=eq.${jobId}`
        },
        callback
      )
      .subscribe()

    this.subscriptions.push(channel)
    return channel
  }

  subscribeToRTRStatus(candidateId: string, callback: (payload: any) => void) {
    const channel = this.supabase
      .channel('rtr_status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rtr_tracking',
          filter: `candidate_id=eq.${candidateId}`
        },
        callback
      )
      .subscribe()

    this.subscriptions.push(channel)
    return channel
  }

  subscribeToInterviews(userId: string, callback: (payload: any) => void) {
    const channel = this.supabase
      .channel('interviews')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interviews'
        },
        callback
      )
      .subscribe()

    this.subscriptions.push(channel)
    return channel
  }

  unsubscribeAll() {
    this.subscriptions.forEach(sub => sub.unsubscribe())
    this.subscriptions = []
  }
}

export const realtimeEngine = new RealtimeEngine()
