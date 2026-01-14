#!/usr/bin/env node
import { writeFileSync } from 'fs';
import puppeteer from 'puppeteer';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>102 Fleet Place - Sage Accounting Report</title>
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
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .money { font-family: 'Consolas', monospace; text-align: right; }
    .status-paid { color: #276749; font-weight: bold; }
    .status-unpaid { color: #c53030; font-weight: bold; }
    .highlight { background: #fed7d7 !important; }
    .summary-box { background: #edf2f7; border: 2px solid #2b6cb0; border-radius: 8px; padding: 20px; margin-bottom: 30px; }
    .summary-box h3 { color: #1a365d; margin-bottom: 15px; font-size: 18px; }
    .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .summary-item { text-align: center; }
    .summary-item .label { color: #4a5568; font-size: 12px; margin-bottom: 5px; }
    .summary-item .value { font-size: 24px; font-weight: bold; color: #1a365d; font-family: 'Consolas', monospace; }
    .summary-item .value.outstanding { color: #c53030; }
    .report-footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #718096; text-align: center; }
  </style>
</head>
<body>
  <h1>102 Fleet Place - Sage Accounting Report</h1>
  <p class="subtitle">Project ID: e022ff095a4b7cd05650715127e9cc89 | GC: The Jay Group Inc</p>

  <div class="summary-box">
    <h3>Financial Summary</h3>
    <div class="summary-grid">
      <div class="summary-item">
        <div class="label">Total Invoiced</div>
        <div class="value">$5,171,390</div>
      </div>
      <div class="summary-item">
        <div class="label">Total Paid</div>
        <div class="value">$4,108,167</div>
      </div>
      <div class="summary-item">
        <div class="label">Outstanding Balance</div>
        <div class="value outstanding">$1,063,223</div>
      </div>
    </div>
  </div>

  <h2>102 Fleet Place Invoices</h2>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Date</th>
        <th>GC</th>
        <th class="text-right">Invoice Total</th>
        <th class="text-right">Net Due</th>
        <th class="text-center">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr class="highlight">
        <td>26734</td>
        <td>2025-12-30</td>
        <td>The Jay Group Inc</td>
        <td class="money">$958,755.89</td>
        <td class="money">$958,755.89</td>
        <td class="text-center status-unpaid">UNPAID</td>
      </tr>
      <tr class="highlight">
        <td>26735</td>
        <td>2025-12-30</td>
        <td>The Jay Group Inc</td>
        <td class="money">$104,467.19</td>
        <td class="money">$104,467.19</td>
        <td class="text-center status-unpaid">UNPAID</td>
      </tr>
      <tr>
        <td>26533 - 26537</td>
        <td>2025-10-30</td>
        <td>The Jay Group Inc</td>
        <td class="money">$1,360,414.69</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>26466</td>
        <td>2025-09-29</td>
        <td>The Jay Group Inc</td>
        <td class="money">$472,499.99</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>26376 - 26380</td>
        <td>2025-08-27</td>
        <td>The Jay Group Inc</td>
        <td class="money">$403,585.30</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>26138 - 26142</td>
        <td>2025-05-29</td>
        <td>The Jay Group Inc</td>
        <td class="money">$1,008,000.00</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">102 FLEET PLACE TOTAL</td>
        <td class="money">$4,307,723.06</td>
        <td class="money">$1,063,223.08</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>101 Fleet Place Invoices (Related Project)</h2>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Date</th>
        <th>GC</th>
        <th class="text-right">Invoice Total</th>
        <th class="text-right">Net Due</th>
        <th class="text-center">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>26368</td>
        <td>2025-08-26</td>
        <td>The Jay Group Inc</td>
        <td class="money">$1,143.19</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>26165</td>
        <td>2025-06-24</td>
        <td>The Jay Group Inc</td>
        <td class="money">$4,463.88</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25639</td>
        <td>2024-11-15</td>
        <td>The Jay Group Inc</td>
        <td class="money">$2,721.88</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25457</td>
        <td>2024-09-19</td>
        <td>The Jay Group Inc</td>
        <td class="money">$3,000.00</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25250</td>
        <td>2024-07-12</td>
        <td>The Jay Group Inc</td>
        <td class="money">$55,703.70</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25251</td>
        <td>2024-07-12</td>
        <td>The Jay Group Inc</td>
        <td class="money">$84,309.30</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25165</td>
        <td>2024-06-14</td>
        <td>The Jay Group Inc</td>
        <td class="money">$181,381.50</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25076</td>
        <td>2024-05-15</td>
        <td>The Jay Group Inc</td>
        <td class="money">$228,730.50</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>25012</td>
        <td>2024-04-15</td>
        <td>The Jay Group Inc</td>
        <td class="money">$130,540.50</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr>
        <td>24930</td>
        <td>2024-03-18</td>
        <td>The Jay Group Inc</td>
        <td class="money">$162,427.50</td>
        <td class="money">$0.00</td>
        <td class="text-center status-paid">Paid</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">101 FLEET PLACE TOTAL</td>
        <td class="money">$854,421.95</td>
        <td class="money">$0.00</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>Payment Timeline</h2>
  <table>
    <thead>
      <tr>
        <th>Period</th>
        <th class="text-right">Invoiced</th>
        <th class="text-right">Paid</th>
        <th class="text-right">Running Balance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Q1 2024 (Mar)</td>
        <td class="money">$162,428</td>
        <td class="money">$162,428</td>
        <td class="money">$0</td>
      </tr>
      <tr>
        <td>Q2 2024 (Apr-Jun)</td>
        <td class="money">$540,653</td>
        <td class="money">$540,653</td>
        <td class="money">$0</td>
      </tr>
      <tr>
        <td>Q3 2024 (Jul-Sep)</td>
        <td class="money">$143,013</td>
        <td class="money">$143,013</td>
        <td class="money">$0</td>
      </tr>
      <tr>
        <td>Q4 2024 (Oct-Dec)</td>
        <td class="money">$2,722</td>
        <td class="money">$2,722</td>
        <td class="money">$0</td>
      </tr>
      <tr>
        <td>Q2 2025 (May-Jun)</td>
        <td class="money">$1,012,464</td>
        <td class="money">$1,012,464</td>
        <td class="money">$0</td>
      </tr>
      <tr>
        <td>Q3 2025 (Jul-Sep)</td>
        <td class="money">$877,228</td>
        <td class="money">$877,228</td>
        <td class="money">$0</td>
      </tr>
      <tr>
        <td>Q4 2025 (Oct-Dec)</td>
        <td class="money">$2,423,638</td>
        <td class="money">$1,360,415</td>
        <td class="money">$1,063,223</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="money">$5,162,146</td>
        <td class="money">$4,098,923</td>
        <td class="money" style="color: #fed7d7;">$1,063,223</td>
      </tr>
    </tbody>
  </table>

  <h2>Outstanding Invoices - Action Required</h2>
  <table>
    <thead>
      <tr>
        <th>Invoice #</th>
        <th>Date</th>
        <th>Days Outstanding</th>
        <th class="text-right">Amount Due</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr class="highlight">
        <td><strong>26734</strong></td>
        <td>2025-12-30</td>
        <td>15 days</td>
        <td class="money"><strong>$958,755.89</strong></td>
        <td>Follow up with Jay Group</td>
      </tr>
      <tr class="highlight">
        <td><strong>26735</strong></td>
        <td>2025-12-30</td>
        <td>15 days</td>
        <td class="money"><strong>$104,467.19</strong></td>
        <td>Follow up with Jay Group</td>
      </tr>
      <tr class="total-row">
        <td colspan="3">TOTAL OUTSTANDING</td>
        <td class="money">$1,063,223.08</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <div class="report-footer">
    <p>Generated: ${new Date().toLocaleDateString()} | Master Roofing & Siding | KO Intelligence System</p>
    <p>Source: Sage Accounting | GC: The Jay Group Inc</p>
  </div>
</body>
</html>`;

// Write HTML
writeFileSync('/home/iwagschal/102-fleet-sage-report.html', html);
console.log('HTML saved to /home/iwagschal/102-fleet-sage-report.html');

// Generate PDF
console.log('Generating PDF...');
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({
  path: '/home/iwagschal/102-fleet-sage-report.pdf',
  format: 'Letter',
  margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  printBackground: true
});
await browser.close();

console.log('PDF saved to /home/iwagschal/102-fleet-sage-report.pdf');
