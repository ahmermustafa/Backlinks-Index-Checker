import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Job, Backlink } from '../types';

// 1. Export results to standard CSV format
export function exportToCSV(backlinks: Backlink[]) {
  const headers = ['URL', 'Google Indexed Status', 'HTTP Status Code', 'Redirect Target URL', 'Checked At'];
  const rows = backlinks.map(b => [
    b.url,
    b.index_status,
    b.http_status ?? 'N/A',
    b.redirect_url ?? 'None',
    new Date(b.checked_at).toLocaleString()
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `backlink_audit_report_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Export results to Microsoft Excel (.xlsx) using SheetJS
export function exportToExcel(backlinks: Backlink[]) {
  const data = backlinks.map(b => ({
    'URL': b.url,
    'Google Index Status': b.index_status,
    'HTTP Status Code': b.http_status ?? 'N/A',
    'Redirect URL Location': b.redirect_url ?? 'None',
    'Checked Timestamp': new Date(b.checked_at).toLocaleString()
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Backlink Audit Results");

  XLSX.writeFile(workbook, `backlink_audit_report_${Date.now()}.xlsx`);
}

// 3. Export results to a high-quality PDF Report using jsPDF AutoTable
export function exportToPDF(job: Job, backlinks: Backlink[]) {
  const doc = new jsPDF('p', 'mm', 'a4') as any;

  // Add a styled visual header banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text("BACKLINK INDEX AUDIT REPORT", 14, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("VERIFIED GOOGLE INDEXATION BY BACKLINK INDEX CHECKER", 14, 26);
  doc.text(`AUDIT GENERATED: ${new Date().toLocaleString()}`, 14, 32);

  // Restore defaults for content
  doc.setTextColor(15, 23, 42);

  // Summary Metrics Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text("1. AUDIT SUMMARY METRICS", 14, 52);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(`• Total Backlinks Audited: ${job.total_urls}`, 18, 60);
  doc.text(`• Indexed Pages: ${job.indexed_count}`, 18, 66);
  doc.text(`• Not Indexed Pages: ${job.not_indexed_count}`, 18, 72);
  doc.text(`• Redirected Pages: ${job.redirected_count}`, 110, 60);
  doc.text(`• Server Error / 404 Pages: ${job.error_count}`, 110, 66);
  
  const indexPercentage = job.total_urls > 0 ? Math.round((job.indexed_count / job.total_urls) * 100) : 0;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text(`• Overall Google Index Rate: ${indexPercentage}%`, 110, 72);

  doc.setDrawColor(241, 245, 249); // slate-100
  doc.setLineWidth(0.5);
  doc.line(14, 78, 196, 78);

  // Detailed Audit Logs Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("2. DETAILED GOOGLE SEARCH AUDIT LOGS", 14, 86);

  const tableColumn = ["Target Backlink URL", "Google Status", "HTTP Code", "Redirect Location", "Audited At"];
  const tableRows = backlinks.map(b => [
    b.url,
    b.index_status,
    b.http_status ? String(b.http_status) : '—',
    b.redirect_url || 'No',
    new Date(b.checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  ]);

  doc.autoTable({
    startY: 92,
    head: [tableColumn],
    body: tableRows,
    theme: 'grid',
    styles: { 
      fontSize: 8, 
      font: 'helvetica',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: { 
      0: { cellWidth: 78 }, // Expand URL column
      1: { cellWidth: 32 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 40 },
      4: { cellWidth: 22, halign: 'center' }
    }
  });

  doc.save(`backlink_audit_report_${job.id}_${Date.now()}.pdf`);
}
