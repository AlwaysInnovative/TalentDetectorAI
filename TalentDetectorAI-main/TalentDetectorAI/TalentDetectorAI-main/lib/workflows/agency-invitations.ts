import { createClient } from '@/lib/supabase/client'

export async function sendAgencyInvitation(email: string, managerName: string) {
  const supabase = createClient()
  
  // Generate invite token
  const inviteToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // Store invitation in database
  const { error: dbError } = await supabase.from('agency_invitations').insert({
    email,
    invited_by_name: managerName,
    invite_token: inviteToken,
    status: 'pending',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
  })
  
  if (dbError) throw dbError
  
  // Send email via Supabase Edge Function or external service
  const inviteLink = `${window.location.origin}/auth/agency/register?token=${inviteToken}`
  
  // For now, simulate email sending
  console.log('Agency Invitation Email:')
  console.log('To:', email)
  console.log('Link:', inviteLink)
  console.log('Message:', `${managerName} has invited you to join as a recruitment agency partner.`)
  
  // In production, integrate with email service:
  // await fetch('/api/send-email', {
  //   method: 'POST',
  //   body: JSON.stringify({
  //     to: email,
  //     subject: 'Invitation to Join as Agency Partner',
  //     html: `<p>${managerName} invited you...</p><a href="${inviteLink}">Accept Invitation</a>`
  //   })
  // })
  
  return { success: true, inviteLink }
}
