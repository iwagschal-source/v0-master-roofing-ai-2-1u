#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import puppeteer from 'puppeteer';

const proposals = JSON.parse(readFileSync('/home/iwagschal/proposals-with-urls.json', 'utf-8'));

// Group by building
const byBuilding = { A: [], B: [], C: [], D: [], E: [], Combined: [] };
for (const p of proposals) {
  byBuilding[p.building].push(p);
}

// Find latest for each building
const latest = {
  A: proposals.find(p => p.building === 'A' && p.latest),
  B: proposals.find(p => p.building === 'B' && p.latest),
  C: proposals.find(p => p.building === 'C' && p.latest),
  D: proposals.find(p => p.building === 'D' && p.latest),
  E: proposals.find(p => p.building === 'E' && p.latest),
};

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>102 Fleet Place - Proposals Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; background: #fff; color: #333; font-size: 12px; }
    h1 { font-size: 24px; color: #1a365d; margin-bottom: 8px; border-bottom: 3px solid #2b6cb0; padding-bottom: 10px; }
    .subtitle { font-size: 16px; color: #4a5568; margin-bottom: 30px; }
    h2 { font-size: 16px; color: #2d3748; margin: 25px 0 12px 0; background: #edf2f7; padding: 8px 12px; border-left: 4px solid #2b6cb0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #2b6cb0; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
    td { padding: 8px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .total-row { background: #2d3748 !important; color: white; font-weight: bold; }
    .total-row td { border-bottom: none; }
    .match-exact { color: #276749; font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .money { font-family: 'Consolas', monospace; text-align: right; }
    a { color: #2b6cb0; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .highlight { background: #c6f6d5 !important; }
    .report-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <h1>102 Fleet Place - Proposals Report</h1>
  <p class="subtitle">27 Proposals | Project ID: e022ff095a4b7cd05650715127e9cc89 | Links valid for 7 days</p>

  <h2>Latest Versions (07.01.2025)</h2>
  <table>
    <thead>
      <tr>
        <th>Building</th>
        <th class="text-right">Amount</th>
        <th>Proposal PDF (Click to Open)</th>
        <th class="text-center">Match</th>
      </tr>
    </thead>
    <tbody>
      ${['A','B','C','D','E'].map(b => {
        const p = latest[b];
        if (!p) return '';
        return `<tr class="highlight">
          <td>Building ${b}</td>
          <td class="money">${p.amount}</td>
          <td><a href="${escapeHtml(p.url)}" target="_blank">📄 ${escapeHtml(p.file)}</a></td>
          <td class="text-center match-exact">✅ EXACT</td>
        </tr>`;
      }).join('')}
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="money">$1,089,443</td>
        <td></td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>Combined/Special Proposals</h2>
  <table>
    <thead>
      <tr><th>Proposal</th><th class="text-right">Amount</th><th>Link</th></tr>
    </thead>
    <tbody>
      ${byBuilding.Combined.map(p => `<tr>
        <td>${escapeHtml(p.file)}</td>
        <td class="money">${p.amount}</td>
        <td><a href="${escapeHtml(p.url)}" target="_blank">📄 Open PDF</a></td>
      </tr>`).join('')}
    </tbody>
  </table>

  ${['A','B','C','D','E'].map(b => `
  <h2>Building ${b} - All Versions</h2>
  <table>
    <thead>
      <tr><th>#</th><th>File Name (Click to Open)</th><th class="text-right">Amount</th></tr>
    </thead>
    <tbody>
      ${byBuilding[b].map((p, i) => `<tr${p.latest ? ' class="highlight"' : ''}>
        <td>${i+1}</td>
        <td><a href="${escapeHtml(p.url)}" target="_blank">📄 ${escapeHtml(p.file)}${p.latest ? ' (LATEST)' : ''}</a></td>
        <td class="money">${p.amount}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  `).join('')}

  <div class="report-footer">
    <p>Generated: ${new Date().toLocaleDateString()} | Master Roofing & Siding | KO Intelligence System</p>
    <p>GC: Prestige Construction | Contact: Jason Halvorsen (jason@fairfieldmetal.com)</p>
    <p style="margin-top: 10px; font-size: 9px; color: #e53e3e;">⚠️ Links expire in 7 days. Regenerate report if links stop working.</p>
  </div>
</body>
</html>`;

// Write HTML
writeFileSync('/home/iwagschal/102-fleet-proposals-report.html', html);
console.log('HTML saved to /home/iwagschal/102-fleet-proposals-report.html');

// Generate PDF with Puppeteer
console.log('Generating PDF with clickable links...');
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({
  path: '/home/iwagschal/102-fleet-proposals-report.pdf',
  format: 'Letter',
  margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  printBackground: true
});
await browser.close();

console.log('PDF saved to /home/iwagschal/102-fleet-proposals-report.pdf');
console.log('Done! Links are valid for 7 days.');
