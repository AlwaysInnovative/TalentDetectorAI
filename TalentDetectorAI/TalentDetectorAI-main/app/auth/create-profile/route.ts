import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { userId, email, name, role } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Create profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        full_name: name || email.split('@')[0],
        email,
        role: role || 'candidate',
        email_confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Profile creation error:', error)
      // Don't fail if profile already exists
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'Profile already exists' })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Profile created successfully',
      profile: data
    })
  } catch (err: any) {
    console.error('Create profile error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to create profile' },
      { status: 500 }
    )
  }
}
