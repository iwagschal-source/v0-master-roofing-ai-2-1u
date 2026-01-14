#!/usr/bin/env node
import { BigQuery } from '@google-cloud/bigquery';
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.production.local') });

const bq = new BigQuery({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
  projectId: 'master-roofing-intelligence'
});

function formatMoney(num) {
  return '$' + Number(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function categorizeScope(scope) {
  if (!scope) return 'Other';
  const s = scope.toLowerCase();
  if (s.includes('coping') || s.includes('gravel stop') || s.includes('edge')) return 'Coping & Edge Metal';
  if (s.includes('torch') || s.includes('ply') || s.includes('membrane')) return 'Membrane/Torch';
  if (s.includes('flash') || s.includes('liquid')) return 'Flashing';
  if (s.includes('insulation') || s.includes('iso') || s.includes('cover board')) return 'Insulation';
  if (s.includes('door') || s.includes('hatch') || s.includes('curb')) return 'Penetrations';
  if (s.includes('drain') || s.includes('scupper')) return 'Drainage';
  if (s.includes('parapet') || s.includes('wall')) return 'Parapet/Wall';
  if (s.includes('balcon') || s.includes('deck') || s.includes('tile')) return 'Balcony/Deck';
  if (s.includes('seal') || s.includes('caulk')) return 'Sealants';
  if (s.includes('prime') || s.includes('adhes')) return 'Primers/Adhesives';
  return 'Other';
}

console.log('Querying data...');

// Get by building
const [byBuilding] = await bq.query({
  query: `
    SELECT
      sheet_name,
      SUM(total_cost) as total_cost,
      COUNT(*) as line_items
    FROM mr_core.fct_takeoff_line
    WHERE LOWER(project_folder_name) LIKE '%102 fleet%'
      AND sheet_name LIKE '%7-02-2025%'
    GROUP BY sheet_name
    ORDER BY sheet_name
  `,
  location: 'us-east4'
});

// Get by scope/system
const [byScope] = await bq.query({
  query: `
    SELECT
      scope_raw,
      SUM(total_cost) as total_cost,
      SUM(total_measurements) as total_qty,
      COUNT(*) as line_items
    FROM mr_core.fct_takeoff_line
    WHERE LOWER(project_folder_name) LIKE '%102 fleet%'
      AND sheet_name LIKE '%7-02-2025%'
    GROUP BY scope_raw
    ORDER BY total_cost DESC
  `,
  location: 'us-east4'
});

// Get line items detail
const [lineItems] = await bq.query({
  query: `
    SELECT
      sheet_name,
      scope_raw,
      unit_cost,
      total_measurements,
      total_cost
    FROM mr_core.fct_takeoff_line
    WHERE LOWER(project_folder_name) LIKE '%102 fleet%'
      AND sheet_name LIKE '%7-02-2025%'
    ORDER BY sheet_name, total_cost DESC
  `,
  location: 'us-east4'
});

// Process data
const buildings = {};
let projectTotal = 0;
byBuilding.forEach(b => {
  const match = b.sheet_name.match(/Building\s+([A-E])/i);
  const bldg = match ? match[1] : 'Unknown';
  buildings[bldg] = { total: Number(b.total_cost), items: b.line_items };
  projectTotal += Number(b.total_cost);
});

// Group by system category
const systems = {};
byScope.forEach(s => {
  const cat = categorizeScope(s.scope_raw);
  if (!systems[cat]) systems[cat] = { total: 0, items: 0 };
  systems[cat].total += Number(s.total_cost);
  systems[cat].items += s.line_items;
});

// Sort systems by total
const sortedSystems = Object.entries(systems).sort((a, b) => b[1].total - a[1].total);

// Invoice data
const invoiced = 4307723;
const outstanding = 1063223;
const pctComplete = 0.70;
const costToFinish = projectTotal * (1 - pctComplete);

// Generate SVG bar chart for buildings
function buildingChart() {
  const maxVal = Math.max(...Object.values(buildings).map(b => b.total));
  const colors = { A: '#3182ce', B: '#38a169', C: '#d69e2e', D: '#e53e3e', E: '#805ad5' };
  let bars = '';
  let i = 0;
  for (const [bldg, data] of Object.entries(buildings).sort()) {
    const width = (data.total / maxVal) * 300;
    const y = i * 45;
    bars += `
      <rect x="80" y="${y}" width="${width}" height="35" fill="${colors[bldg]}" rx="4"/>
      <text x="70" y="${y + 23}" text-anchor="end" font-size="14" font-weight="bold">Bldg ${bldg}</text>
      <text x="${85 + width}" y="${y + 23}" font-size="12" fill="#333">${formatMoney(data.total)}</text>
    `;
    i++;
  }
  return `<svg width="500" height="230" style="font-family: sans-serif;">
    <text x="250" y="220" text-anchor="middle" font-size="12" fill="#666">Cost by Building</text>
    ${bars}
  </svg>`;
}

// Generate SVG pie chart for systems
function systemChart() {
  const total = sortedSystems.reduce((sum, [_, data]) => sum + data.total, 0);
  const colors = ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5', '#dd6b20', '#319795', '#d53f8c'];
  let startAngle = 0;
  let paths = '';
  let legend = '';

  sortedSystems.slice(0, 8).forEach(([name, data], i) => {
    const pct = data.total / total;
    const angle = pct * 360;
    const endAngle = startAngle + angle;

    const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);

    const largeArc = angle > 180 ? 1 : 0;
    paths += `<path d="M100,100 L${x1},${y1} A80,80 0 ${largeArc},1 ${x2},${y2} Z" fill="${colors[i]}"/>`;

    legend += `
      <rect x="220" y="${i * 22}" width="14" height="14" fill="${colors[i]}" rx="2"/>
      <text x="240" y="${i * 22 + 12}" font-size="11">${name} (${(pct * 100).toFixed(0)}%)</text>
    `;
    startAngle = endAngle;
  });

  return `<svg width="450" height="220" style="font-family: sans-serif;">
    ${paths}
    ${legend}
  </svg>`;
}

// Generate completion gauge
function completionGauge() {
  const pct = pctComplete * 100;
  const angle = pct * 1.8; // 180 degrees = 100%
  const endX = 100 + 70 * Math.cos((180 - angle) * Math.PI / 180);
  const endY = 100 - 70 * Math.sin((180 - angle) * Math.PI / 180);

  return `<svg width="200" height="130" style="font-family: sans-serif;">
    <path d="M30,100 A70,70 0 0,1 170,100" fill="none" stroke="#e2e8f0" stroke-width="15"/>
    <path d="M30,100 A70,70 0 0,1 ${endX},${endY}" fill="none" stroke="#38a169" stroke-width="15"/>
    <text x="100" y="90" text-anchor="middle" font-size="28" font-weight="bold" fill="#2d3748">${pct}%</text>
    <text x="100" y="115" text-anchor="middle" font-size="12" fill="#718096">Complete</text>
  </svg>`;
}

// Build HTML
const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>102 Fleet Place - Cost to Complete Projection</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; background: #fff; color: #333; font-size: 11px; }
    h1 { font-size: 22px; color: #1a365d; margin-bottom: 5px; border-bottom: 3px solid #2b6cb0; padding-bottom: 8px; }
    .subtitle { font-size: 14px; color: #4a5568; margin-bottom: 20px; }
    h2 { font-size: 14px; color: #2d3748; margin: 20px 0 10px 0; background: #edf2f7; padding: 6px 10px; border-left: 4px solid #2b6cb0; }
    h3 { font-size: 12px; color: #4a5568; margin: 15px 0 8px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 10px; }
    th { background: #2b6cb0; color: white; padding: 8px 6px; text-align: left; font-weight: 600; }
    td { padding: 6px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .total-row { background: #2d3748 !important; color: white; font-weight: bold; }
    .total-row td { border-bottom: none; }
    .money { font-family: 'Consolas', monospace; text-align: right; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .highlight { background: #c6f6d5 !important; }
    .warning { background: #fed7d7 !important; }

    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
    .summary-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 8px; text-align: center; }
    .summary-box.green { background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); }
    .summary-box.orange { background: linear-gradient(135deg, #dd6b20 0%, #c05621 100%); }
    .summary-box.red { background: linear-gradient(135deg, #e53e3e 0%, #c53030 100%); }
    .summary-box .label { font-size: 10px; opacity: 0.9; margin-bottom: 5px; }
    .summary-box .value { font-size: 20px; font-weight: bold; font-family: 'Consolas', monospace; }

    .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .chart-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
    .chart-title { font-size: 12px; font-weight: bold; color: #2d3748; margin-bottom: 10px; text-align: center; }

    .gauge-section { display: flex; align-items: center; justify-content: space-around; background: #edf2f7; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
    .gauge-info { text-align: center; }
    .gauge-info .big { font-size: 24px; font-weight: bold; color: #2d3748; font-family: 'Consolas', monospace; }
    .gauge-info .small { font-size: 11px; color: #718096; }

    .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 9px; color: #718096; text-align: center; }

    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <h1>102 Fleet Place - Cost to Complete Projection</h1>
  <p class="subtitle">Project ID: e022ff095a4b7cd05650715127e9cc89 | GC: The Jay Group Inc | As of: ${new Date().toLocaleDateString()}</p>

  <div class="summary-grid">
    <div class="summary-box">
      <div class="label">Total Project Value</div>
      <div class="value">${formatMoney(projectTotal)}</div>
    </div>
    <div class="summary-box green">
      <div class="label">Invoiced to Date</div>
      <div class="value">${formatMoney(invoiced)}</div>
    </div>
    <div class="summary-box orange">
      <div class="label">Cost to Finish (30%)</div>
      <div class="value">${formatMoney(costToFinish)}</div>
    </div>
    <div class="summary-box red">
      <div class="label">Outstanding A/R</div>
      <div class="value">${formatMoney(outstanding)}</div>
    </div>
  </div>

  <div class="gauge-section">
    ${completionGauge()}
    <div class="gauge-info">
      <div class="big">${formatMoney(costToFinish)}</div>
      <div class="small">Projected Cost to Complete</div>
    </div>
    <div class="gauge-info">
      <div class="big">${formatMoney(outstanding + costToFinish)}</div>
      <div class="small">Total to Close Out Project</div>
    </div>
  </div>

  <div class="charts-grid">
    <div class="chart-box">
      <div class="chart-title">Cost Distribution by Building</div>
      ${buildingChart()}
    </div>
    <div class="chart-box">
      <div class="chart-title">Cost Distribution by System</div>
      ${systemChart()}
    </div>
  </div>

  <h2>Cost to Complete by Building</h2>
  <table>
    <thead>
      <tr>
        <th>Building</th>
        <th class="text-right">Total Takeoff</th>
        <th class="text-right">70% Complete</th>
        <th class="text-right">Cost to Finish</th>
        <th class="text-center">Line Items</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(buildings).sort().map(([bldg, data]) => `
        <tr>
          <td><strong>Building ${bldg}</strong></td>
          <td class="money">${formatMoney(data.total)}</td>
          <td class="money">${formatMoney(data.total * pctComplete)}</td>
          <td class="money warning">${formatMoney(data.total * (1 - pctComplete))}</td>
          <td class="text-center">${data.items}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="money">${formatMoney(projectTotal)}</td>
        <td class="money">${formatMoney(projectTotal * pctComplete)}</td>
        <td class="money">${formatMoney(costToFinish)}</td>
        <td class="text-center">${Object.values(buildings).reduce((s, b) => s + b.items, 0)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Cost to Complete by System</h2>
  <table>
    <thead>
      <tr>
        <th>System/Scope</th>
        <th class="text-right">Total Cost</th>
        <th class="text-right">% of Project</th>
        <th class="text-right">Cost to Finish (30%)</th>
        <th class="text-center">Items</th>
      </tr>
    </thead>
    <tbody>
      ${sortedSystems.map(([name, data]) => `
        <tr>
          <td>${name}</td>
          <td class="money">${formatMoney(data.total)}</td>
          <td class="text-right">${(data.total / projectTotal * 100).toFixed(1)}%</td>
          <td class="money">${formatMoney(data.total * (1 - pctComplete))}</td>
          <td class="text-center">${data.items}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td>TOTAL</td>
        <td class="money">${formatMoney(projectTotal)}</td>
        <td class="text-right">100%</td>
        <td class="money">${formatMoney(costToFinish)}</td>
        <td class="text-center">${sortedSystems.reduce((s, [_, d]) => s + d.items, 0)}</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>Detailed Line Items by Building</h2>
  ${Object.entries(buildings).sort().map(([bldg, _]) => {
    const bldgItems = lineItems.filter(i => i.sheet_name.includes(`Building ${bldg}`));
    return `
      <h3>Building ${bldg} - Top 15 Line Items</h3>
      <table>
        <thead>
          <tr>
            <th>Scope/Item</th>
            <th class="text-right">Unit Cost</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Total</th>
            <th class="text-right">To Finish (30%)</th>
          </tr>
        </thead>
        <tbody>
          ${bldgItems.slice(0, 15).map(item => `
            <tr>
              <td>${(item.scope_raw || 'Unknown').substring(0, 45)}</td>
              <td class="money">${formatMoney(item.unit_cost)}</td>
              <td class="text-right">${Number(item.total_measurements).toLocaleString()}</td>
              <td class="money">${formatMoney(item.total_cost)}</td>
              <td class="money">${formatMoney(Number(item.total_cost) * (1 - pctComplete))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }).join('')}

  <h2>Cash Flow Projection</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="text-right">Amount</th>
        <th>Timeline</th>
        <th>Notes</th>
      </tr>
    </thead>
    <tbody>
      <tr class="highlight">
        <td>Outstanding Receivables</td>
        <td class="money">${formatMoney(outstanding)}</td>
        <td>30-45 days</td>
        <td>Invoices #26734, #26735 from Dec 30</td>
      </tr>
      <tr>
        <td>Remaining Work (30%)</td>
        <td class="money">${formatMoney(costToFinish)}</td>
        <td>As completed</td>
        <td>Will invoice as work progresses</td>
      </tr>
      <tr class="total-row">
        <td>Total to Close Out</td>
        <td class="money">${formatMoney(outstanding + costToFinish)}</td>
        <td colspan="2">Outstanding + Remaining Work</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p>Generated: ${new Date().toLocaleString()} | Master Roofing & Siding | KO Intelligence System</p>
    <p>Based on July 2025 Takeoff | Assumes 70% project completion | All projections are estimates</p>
  </div>
</body>
</html>`;

// Write HTML and generate PDF
writeFileSync('/home/iwagschal/102-fleet-projection.html', html);
console.log('HTML saved to /home/iwagschal/102-fleet-projection.html');

console.log('Generating PDF...');
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({
  path: '/home/iwagschal/102-fleet-projection.pdf',
  format: 'Letter',
  margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
  printBackground: true
});
await browser.close();

console.log('PDF saved to /home/iwagschal/102-fleet-projection.pdf');
console.log('Done!');
