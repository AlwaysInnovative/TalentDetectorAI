import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { interestId } = await request.json()

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest data separately to avoid 400 error
    const { data: interest, error: interestError } = await supabaseAdmin
      .from('candidate_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (interestError || !interest) {
      throw new Error('Interest not found')
    }

    if (!interest.right_to_represent_signed) {
      return NextResponse.json({ error: 'RTR not signed yet' }, { status: 400 })
    }

    // Fetch related data
    const [candidateRes, jobRes, agencyRes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*').eq('id', interest.candidate_id).single(),
      supabaseAdmin.from('jobs').select('*').eq('id', interest.job_id).single(),
      supabaseAdmin.from('profiles').select('*').eq('id', interest.agency_id).single()
    ])

    const candidate = candidateRes.data
    const job = jobRes.data
    const agency = agencyRes.data

    // Get signature metadata
    const { data: signatureDoc } = await supabaseAdmin
      .from('interest_documents')
      .select('metadata')
      .eq('interest_id', interestId)
      .eq('document_type', 'rtr_signature')
      .single()

    // Create PDF
    const doc = new PDFDocument({ 
      margin: 50,
      size: 'A4',
      bufferPages: true
    })

    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    // Header
    doc.fontSize(24)
      .fillColor('#1e40af')
      .text('RIGHT TO REPRESENT AGREEMENT', { align: 'center' })
    
    doc.moveDown(0.5)
    doc.fontSize(10)
      .fillColor('#666')
      .text('Powered by TalentDetector AI', { align: 'center' })
    
    doc.moveDown()
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke()
    doc.moveDown()

    // Document Info
    doc.fontSize(10).fillColor('#000')
    doc.text(`Document ID: ${interest.id}`, { continued: false })
    doc.text(`Generated: ${new Date(interest.created_at).toLocaleString()}`)
    doc.text(`AI Match Score: ${interest.ai_match_score ?? 'N/A'}%`)
    doc.moveDown(2)

    // Parties Section
    doc.fontSize(16).fillColor('#1e40af').text('PARTIES', { underline: true })
    doc.moveDown(0.5)

    doc.fontSize(12).fillColor('#000').text('Recruitment Agency', { underline: true })
    doc.fontSize(10)
    doc.text(`Name: ${agency?.full_name || 'N/A'}`)
    doc.text(`Company: ${agency?.company || 'Not specified'}`)
    doc.text(`Email: ${agency?.email || 'N/A'}`)
    doc.text(`Phone: ${agency?.phone || 'Not specified'}`)
    doc.moveDown()

    doc.fontSize(12).text('Candidate', { underline: true })
    doc.fontSize(10)
    doc.text(`Name: ${candidate?.name || 'N/A'}`)
    doc.text(`Email: ${candidate?.email || 'N/A'}`)
    doc.text(`Phone: ${candidate?.phone || 'Not specified'}`)
    doc.text(`Location: ${candidate?.location || 'Not specified'}`)
    doc.moveDown()

    doc.fontSize(12).text('Position', { underline: true })
    doc.fontSize(10)
    doc.text(`Title: ${job?.title || 'N/A'}`)
    doc.text(`Location: ${job?.location || 'N/A'}`)
    doc.text(`Type: ${job?.employment_type || 'Not specified'}`)
    doc.text(`Salary: £${job?.salary_min?.toLocaleString()} - £${job?.salary_max?.toLocaleString()}`)
    doc.moveDown(2)

    // Terms Section
    doc.fontSize(16).fillColor('#1e40af').text('TERMS AND CONDITIONS', { underline: true })
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('#000')

    const terms = [
      {
        title: '1. EXCLUSIVE REPRESENTATION',
        content: 'The Recruitment Agency ("Agency") shall have the exclusive right to represent the Candidate for the above-specified position for a period of 12 months from the date of this agreement.'
      },
      {
        title: '2. CANDIDATE CONSENT',
        content: 'The Candidate hereby grants the Agency permission to: Submit their CV and application materials to the hiring company, Represent them in negotiations regarding this position, Act as the primary point of contact with the employer.'
      },
      {
        title: '3. CONFIDENTIALITY',
        content: 'Both parties agree to maintain confidentiality of all information shared during the recruitment process, except as required by law or with explicit written consent.'
      },
      {
        title: '4. FEES',
        content: 'The Candidate shall not be liable for any fees. All recruitment fees are the responsibility of the hiring company.'
      }
    ]

    terms.forEach(term => {
      doc.fontSize(11).text(term.title, { continued: false })
      doc.fontSize(10).text(term.content, { align: 'justify' })
      doc.moveDown(0.5)
    })

    doc.moveDown()

    // Signature Section
    doc.fontSize(16).fillColor('#1e40af').text('ELECTRONIC SIGNATURE', { underline: true })
    doc.moveDown(0.5)

    // Draw signature box
    doc.rect(50, doc.y, 495, 120).stroke()
    doc.moveDown(0.5)

    if (signatureDoc?.metadata) {
      doc.fontSize(20)
        .fillColor('#1e40af')
        .font('Helvetica-Bold')
        .text(signatureDoc.metadata.signed_by_name, { align: 'center' })
      
      doc.moveDown(0.5)
      doc.fontSize(10).fillColor('#666').font('Helvetica')
      doc.text(`Signed Date: ${new Date(signatureDoc.metadata.signed_at).toLocaleString()}`, { align: 'center' })
      doc.text(`IP Address: ${signatureDoc.metadata.ip_address}`, { align: 'center' })
      doc.text(`Signature Hash: ${signatureDoc.metadata.signature_hash}`, { align: 'center' })
    }

    doc.moveDown(2)

    // Footer
    doc.fontSize(8)
      .fillColor('#999')
      .text('This document is legally binding when signed electronically by the Candidate.', { align: 'center' })
    doc.text('Generated by TalentDetector AI - Intelligent Recruitment Platform', { align: 'center' })

    doc.end()

    // Wait for PDF generation
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    })

    // Upload PDF to storage
    const pdfFileName = `rtr/signed/${interestId}.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(pdfFileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('PDF upload error:', uploadError)
      throw new Error(`Failed to upload PDF: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(pdfFileName)

    // Update interest with PDF URL
    await supabaseAdmin
      .from('candidate_interests')
      .update({ right_to_represent_pdf_url: publicUrl })
      .eq('id', interestId)

    return NextResponse.json({ 
      success: true, 
      pdf_url: publicUrl 
    })
  } catch (err: any) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ 
      error: err.message || 'Failed to generate PDF' 
    }, { status: 500 })
  }
}
