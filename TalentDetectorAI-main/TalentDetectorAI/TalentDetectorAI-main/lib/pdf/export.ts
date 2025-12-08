import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportToPDF(data: any[], title: string) {
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.text(title, 14, 22)
  
  doc.setFontSize(11)
  const dateText = 'Generated: ' + new Date().toLocaleDateString()
  doc.text(dateText, 14, 30)
  
  autoTable(doc, {
    startY: 40,
    head: [Object.keys(data[0] || {})],
    body: data.map(row => Object.values(row)),
  })
  
  const fileName = title.replace(/ /g, '-').toLowerCase() + '-' + Date.now() + '.pdf'
  doc.save(fileName)
}
