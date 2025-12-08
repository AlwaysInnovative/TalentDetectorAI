import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportJobReport(job: any, applications: any[]) {
  const doc = new jsPDF()
  doc.setFontSize(20)
  doc.text('Job Performance Report', 14, 20)
  doc.setFontSize(12)
  doc.text('Job: ' + job.title, 14, 35)
  doc.text('Generated: ' + new Date().toLocaleDateString(), 14, 42)
  
  const tableData = applications.map((app: any) => [
    app.id.substring(0, 8),
    app.status,
    app.ai_match_score || 'N/A',
    new Date(app.created_at).toLocaleDateString()
  ])
  
  autoTable(doc, {
    startY: 55,
    head: [['ID', 'Status', 'Match', 'Date']],
    body: tableData
  })
  
  doc.save('job-report-' + Date.now() + '.pdf')
}

export function exportAnalytics(data: any) {
  const doc = new jsPDF()
  doc.setFontSize(20)
  doc.text('Hiring Analytics', 14, 20)
  doc.save('analytics-' + Date.now() + '.pdf')
}
