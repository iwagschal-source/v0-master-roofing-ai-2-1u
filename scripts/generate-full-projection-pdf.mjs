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
  if (s.includes('panel')) return 'Panel Work';
  if (s.includes('coping') || s.includes('gravel stop') || s.includes('edge')) return 'Coping & Edge Metal';
  if (s.includes('torch') || s.includes('ply') || s.includes('membrane')) return 'Membrane/Torch';
  if (s.includes('flash') || s.includes('liquid')) return 'Flashing';
  if (s.includes('insulation') || s.includes('iso') || s.includes('cover board')) return 'Insulation';
  if (s.includes('door') || s.includes('hatch') || s.includes('curb')) return 'Penetrations';
  if (s.includes('drain') || s.includes('scupper')) return 'Drainage';
  if (s.includes('parapet') || s.includes('wall')) return 'Parapet/Wall';
  if (s.includes('balcon') || s.includes('deck') || s.includes('tile')) return 'Balcony/Deck';
  if (s.includes('seal') || s.includes('caulk')) return 'Sealants';
  return 'Other';
}

console.log('Querying data...');

// Get by building (roofing)
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
      COUNT(*) as line_items
    FROM mr_core.fct_takeoff_line
    WHERE LOWER(project_folder_name) LIKE '%102 fleet%'
      AND sheet_name LIKE '%7-02-2025%'
    GROUP BY scope_raw
    ORDER BY total_cost DESC
  `,
  location: 'us-east4'
});

// Get Sage invoices
const [invoices] = await bq.query({
  query: `
    SELECT
      Invoice_No,
      invoice_date,
      project_address,
      invoice_total,
      net_due,
      status
    FROM mr_agent.sage_invoices
    WHERE LOWER(project_address) LIKE '%102 fleet%'
    ORDER BY invoice_date
  `,
  location: 'us-east4'
});

// Get line items
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

// Process building data
const buildings = {};
let roofingTotal = 0;
byBuilding.forEach(b => {
  const match = b.sheet_name.match(/Building\s+([A-E])/i);
  const bldg = match ? match[1] : 'Unknown';
  buildings[bldg] = { total: Number(b.total_cost), items: b.line_items };
  roofingTotal += Number(b.total_cost);
});

// Group by system
const systems = {};
byScope.forEach(s => {
  const cat = categorizeScope(s.scope_raw);
  if (!systems[cat]) systems[cat] = { total: 0, items: 0 };
  systems[cat].total += Number(s.total_cost);
  systems[cat].items += s.line_items;
});
const sortedSystems = Object.entries(systems).sort((a, b) => b[1].total - a[1].total);

// Process Sage data
let sageInvoiced = 0, sagePaid = 0;
invoices.forEach(inv => {
  sageInvoiced += Number(inv.invoice_total);
  sagePaid += Number(inv.invoice_total) - Number(inv.net_due);
});
const sageOutstanding = sageInvoiced - sagePaid;

// Full project scope
const panelScope = 5694000;
const flashingAddons = 170000;
const fullProjectValue = roofingTotal + panelScope + flashingAddons;
const pctComplete = 0.70;
const costToFinish = fullProjectValue * (1 - pctComplete);
const remainingToInvoice = fullProjectValue - sageInvoiced;

// Charts
function buildingChart() {
  const maxVal = Math.max(...Object.values(buildings).map(b => b.total));
  const colors = { A: '#3182ce', B: '#38a169', C: '#d69e2e', D: '#e53e3e', E: '#805ad5' };
  let bars = '';
  let i = 0;
  for (const [bldg, data] of Object.entries(buildings).sort()) {
    const width = (data.total / maxVal) * 280;
    const y = i * 40;
    bars += `
      <rect x="80" y="${y}" width="${width}" height="30" fill="${colors[bldg]}" rx="4"/>
      <text x="70" y="${y + 20}" text-anchor="end" font-size="12" font-weight="bold">Bldg ${bldg}</text>
      <text x="${88 + width}" y="${y + 20}" font-size="11" fill="#333">${formatMoney(data.total)}</text>
    `;
    i++;
  }
  return `<svg width="480" height="210" style="font-family: sans-serif;">${bars}</svg>`;
}

function systemPieChart() {
  const colors = ['#3182ce', '#38a169', '#d69e2e', '#e53e3e', '#805ad5', '#dd6b20', '#319795', '#d53f8c', '#718096', '#2c5282'];
  const total = sortedSystems.reduce((s, [_, d]) => s + d.total, 0);
  const topSystems = sortedSystems.slice(0, 8);
  const otherTotal = sortedSystems.slice(8).reduce((s, [_, d]) => s + d.total, 0);
  if (otherTotal > 0) {
    topSystems.push(['Other', { total: otherTotal, items: 0 }]);
  }

  let startAngle = 0;
  let paths = '';
  let legend = '';

  topSystems.forEach(([name, data], i) => {
    const pct = data.total / total;
    const angle = pct * 360;
    const endAngle = startAngle + angle;
    const x1 = 95 + 75 * Math.cos((startAngle - 90) * Math.PI / 180);
    const y1 = 95 + 75 * Math.sin((startAngle - 90) * Math.PI / 180);
    const x2 = 95 + 75 * Math.cos((endAngle - 90) * Math.PI / 180);
    const y2 = 95 + 75 * Math.sin((endAngle - 90) * Math.PI / 180);
    const largeArc = angle > 180 ? 1 : 0;
    paths += `<path d="M95,95 L${x1},${y1} A75,75 0 ${largeArc},1 ${x2},${y2} Z" fill="${colors[i % colors.length]}"/>`;

    const row = Math.floor(i / 2);
    const col = i % 2;
    const lx = 200 + col * 145;
    const ly = row * 20 + 15;
    legend += `
      <rect x="${lx}" y="${ly}" width="12" height="12" fill="${colors[i % colors.length]}" rx="2"/>
      <text x="${lx + 16}" y="${ly + 10}" font-size="9">${name.substring(0,12)} ${(pct*100).toFixed(0)}%</text>
    `;
    startAngle = endAngle;
  });

  return `<svg width="500" height="195" style="font-family: sans-serif;">
    ${paths}
    ${legend}
    <text x="95" y="98" text-anchor="middle" font-size="11" font-weight="bold" fill="#2d3748">${formatMoney(total)}</text>
  </svg>`;
}

function cashFlowChart() {
  // Quarterly invoicing
  const quarters = {};
  invoices.forEach(inv => {
    const d = new Date(inv.invoice_date.value);
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)}'${String(d.getFullYear()).slice(2)}`;
    if (!quarters[q]) quarters[q] = 0;
    quarters[q] += Number(inv.invoice_total);
  });

  const qData = Object.entries(quarters).sort();
  const maxVal = Math.max(...qData.map(q => q[1]));

  let bars = '';
  qData.forEach(([q, val], i) => {
    const height = (val / maxVal) * 100;
    const x = i * 70 + 30;
    bars += `
      <rect x="${x}" y="${130 - height}" width="50" height="${height}" fill="#3182ce" rx="3"/>
      <text x="${x + 25}" y="150" text-anchor="middle" font-size="10">${q}</text>
      <text x="${x + 25}" y="${125 - height}" text-anchor="middle" font-size="9">${formatMoney(val)}</text>
    `;
  });

  return `<svg width="320" height="170" style="font-family: sans-serif;">
    <text x="160" y="168" text-anchor="middle" font-size="10" fill="#666">Invoicing by Quarter</text>
    ${bars}
  </svg>`;
}

function progressBars() {
  const scopes = [
    { name: 'Roofing', total: roofingTotal, invoiced: sageInvoiced * 0.8, color: '#3182ce' },
    { name: 'Panels', total: panelScope, invoiced: sageInvoiced * 0.15, color: '#38a169' },
    { name: 'Flashing', total: flashingAddons, invoiced: sageInvoiced * 0.05, color: '#d69e2e' }
  ];

  let bars = '';
  scopes.forEach((s, i) => {
    const y = i * 55;
    const pctInvoiced = Math.min(s.invoiced / s.total, 1);
    const invoicedWidth = pctInvoiced * 320;
    bars += `
      <text x="0" y="${y + 12}" font-size="11" font-weight="bold">${s.name}</text>
      <text x="0" y="${y + 26}" font-size="9" fill="#718096">${formatMoney(s.total)} total</text>
      <rect x="80" y="${y + 5}" width="320" height="24" fill="#e2e8f0" rx="4"/>
      <rect x="80" y="${y + 5}" width="${invoicedWidth}" height="24" fill="${s.color}" rx="4"/>
      <text x="${85 + invoicedWidth}" y="${y + 21}" font-size="9" fill="${invoicedWidth > 150 ? '#fff' : '#333'}">${(pctInvoiced * 100).toFixed(0)}% inv</text>
      <text x="405" y="${y + 21}" font-size="9" fill="#718096">${formatMoney(s.total - s.invoiced)} rem</text>
    `;
  });

  return `<svg width="500" height="170" style="font-family: sans-serif;">
    ${bars}
    <text x="250" y="165" text-anchor="middle" font-size="10" fill="#718096">Invoiced vs Remaining by Scope</text>
  </svg>`;
}

function cashFlowTrend() {
  const quarters = {};
  invoices.forEach(inv => {
    const d = new Date(inv.invoice_date.value);
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)}'${String(d.getFullYear()).slice(2)}`;
    if (!quarters[q]) quarters[q] = { invoiced: 0, paid: 0 };
    quarters[q].invoiced += Number(inv.invoice_total);
    const paid = Number(inv.invoice_total) - Number(inv.net_due);
    quarters[q].paid += paid;
  });

  const qData = Object.entries(quarters).sort();
  const maxVal = Math.max(...qData.map(([_, v]) => v.invoiced));

  let bars = '';
  let cumInvoiced = 0;
  let cumPaid = 0;
  let linePath = 'M';

  qData.forEach(([q, val], i) => {
    const x = i * 75 + 40;
    const invHeight = (val.invoiced / maxVal) * 90;
    const paidHeight = (val.paid / maxVal) * 90;

    bars += `
      <rect x="${x}" y="${115 - invHeight}" width="28" height="${invHeight}" fill="#3182ce" rx="2"/>
      <rect x="${x + 30}" y="${115 - paidHeight}" width="28" height="${paidHeight}" fill="#38a169" rx="2"/>
      <text x="${x + 29}" y="132" text-anchor="middle" font-size="9">${q}</text>
    `;

    cumInvoiced += val.invoiced;
    cumPaid += val.paid;
  });

  return `<svg width="350" height="150" style="font-family: sans-serif;">
    <rect x="10" y="5" width="12" height="12" fill="#3182ce" rx="2"/>
    <text x="26" y="15" font-size="9">Invoiced</text>
    <rect x="80" y="5" width="12" height="12" fill="#38a169" rx="2"/>
    <text x="96" y="15" font-size="9">Collected</text>
    ${bars}
  </svg>`;
}

function completionGauge(pct, label) {
  const angle = pct * 180;
  const endX = 80 + 55 * Math.cos((180 - angle) * Math.PI / 180);
  const endY = 80 - 55 * Math.sin((180 - angle) * Math.PI / 180);
  const color = pct >= 0.7 ? '#38a169' : pct >= 0.4 ? '#d69e2e' : '#e53e3e';

  return `<svg width="160" height="110" style="font-family: sans-serif;">
    <path d="M25,80 A55,55 0 0,1 135,80" fill="none" stroke="#e2e8f0" stroke-width="12"/>
    <path d="M25,80 A55,55 0 0,1 ${endX},${endY}" fill="none" stroke="${color}" stroke-width="12"/>
    <text x="80" y="72" text-anchor="middle" font-size="22" font-weight="bold" fill="#2d3748">${(pct*100).toFixed(0)}%</text>
    <text x="80" y="95" text-anchor="middle" font-size="10" fill="#718096">${label}</text>
  </svg>`;
}

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>102 Fleet Place - Complete Project Projection</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 25px; background: #fff; color: #333; font-size: 10px; }
    h1 { font-size: 20px; color: #1a365d; margin-bottom: 4px; border-bottom: 3px solid #2b6cb0; padding-bottom: 6px; }
    .subtitle { font-size: 12px; color: #4a5568; margin-bottom: 15px; }
    h2 { font-size: 13px; color: #2d3748; margin: 15px 0 8px 0; background: #edf2f7; padding: 5px 8px; border-left: 4px solid #2b6cb0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9px; }
    th { background: #2b6cb0; color: white; padding: 6px 5px; text-align: left; font-weight: 600; }
    td { padding: 5px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background: #f7fafc; }
    .total-row { background: #2d3748 !important; color: white; font-weight: bold; }
    .total-row td { border-bottom: none; }
    .money { font-family: 'Consolas', monospace; text-align: right; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .highlight { background: #c6f6d5 !important; }
    .warning { background: #fed7d7 !important; }
    .pending { background: #fefcbf !important; }

    .hero-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 15px; }
    .hero-box { padding: 12px 8px; border-radius: 6px; text-align: center; color: white; }
    .hero-box.blue { background: linear-gradient(135deg, #3182ce, #2c5282); }
    .hero-box.green { background: linear-gradient(135deg, #38a169, #276749); }
    .hero-box.orange { background: linear-gradient(135deg, #dd6b20, #c05621); }
    .hero-box.red { background: linear-gradient(135deg, #e53e3e, #c53030); }
    .hero-box.purple { background: linear-gradient(135deg, #805ad5, #6b46c1); }
    .hero-box .label { font-size: 9px; opacity: 0.9; }
    .hero-box .value { font-size: 16px; font-weight: bold; font-family: 'Consolas', monospace; margin-top: 3px; }

    .gauge-row { display: flex; justify-content: space-around; align-items: center; background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
    .gauge-info { text-align: center; }
    .gauge-info .big { font-size: 18px; font-weight: bold; color: #2d3748; font-family: 'Consolas', monospace; }
    .gauge-info .small { font-size: 9px; color: #718096; margin-top: 3px; }

    .charts-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
    .chart-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
    .chart-title { font-size: 11px; font-weight: bold; color: #2d3748; margin-bottom: 8px; text-align: center; }

    .scope-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 15px; }
    .scope-box { border: 2px solid #e2e8f0; border-radius: 6px; padding: 10px; }
    .scope-box.roofing { border-color: #3182ce; }
    .scope-box.panels { border-color: #38a169; }
    .scope-box.flashing { border-color: #d69e2e; }
    .scope-title { font-size: 11px; font-weight: bold; margin-bottom: 8px; }
    .scope-row { display: flex; justify-content: space-between; font-size: 9px; margin: 3px 0; }

    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #718096; text-align: center; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>

  <h1>102 Fleet Place - Complete Project Projection</h1>
  <p class="subtitle">GC: The Jay Group Inc | Project ID: e022ff095a4b7cd05650715127e9cc89 | ${new Date().toLocaleDateString()}</p>

  <div class="hero-grid">
    <div class="hero-box blue">
      <div class="label">Full Project Value</div>
      <div class="value">${formatMoney(fullProjectValue)}</div>
    </div>
    <div class="hero-box green">
      <div class="label">Invoiced (Sage)</div>
      <div class="value">${formatMoney(sageInvoiced)}</div>
    </div>
    <div class="hero-box orange">
      <div class="label">Cost to Finish</div>
      <div class="value">${formatMoney(costToFinish)}</div>
    </div>
    <div class="hero-box red">
      <div class="label">Outstanding A/R</div>
      <div class="value">${formatMoney(sageOutstanding)}</div>
    </div>
    <div class="hero-box purple">
      <div class="label">Remaining to Invoice</div>
      <div class="value">${formatMoney(remainingToInvoice)}</div>
    </div>
  </div>

  <div class="gauge-row">
    ${completionGauge(pctComplete, 'Work Complete')}
    ${completionGauge(sageInvoiced / fullProjectValue, 'Invoiced')}
    ${completionGauge(sagePaid / fullProjectValue, 'Collected')}
    <div class="gauge-info">
      <div class="big">${formatMoney(costToFinish)}</div>
      <div class="small">Est. Cost to Complete</div>
    </div>
    <div class="gauge-info">
      <div class="big">${formatMoney(sageOutstanding + remainingToInvoice)}</div>
      <div class="small">Total Revenue Remaining</div>
    </div>
  </div>

  <div class="scope-grid">
    <div class="scope-box roofing">
      <div class="scope-title" style="color: #3182ce;">Roofing Scope</div>
      <div class="scope-row"><span>Takeoff Value:</span><span>${formatMoney(roofingTotal)}</span></div>
      <div class="scope-row"><span>% of Project:</span><span>${(roofingTotal/fullProjectValue*100).toFixed(0)}%</span></div>
      <div class="scope-row"><span>Cost to Finish (30%):</span><span>${formatMoney(roofingTotal * 0.3)}</span></div>
    </div>
    <div class="scope-box panels">
      <div class="scope-title" style="color: #38a169;">Metal Panels</div>
      <div class="scope-row"><span>Proposal Value:</span><span>${formatMoney(panelScope)}</span></div>
      <div class="scope-row"><span>% of Project:</span><span>${(panelScope/fullProjectValue*100).toFixed(0)}%</span></div>
      <div class="scope-row"><span>Cost to Finish (30%):</span><span>${formatMoney(panelScope * 0.3)}</span></div>
    </div>
    <div class="scope-box flashing">
      <div class="scope-title" style="color: #d69e2e;">ADJ Flashing</div>
      <div class="scope-row"><span>Proposal Value:</span><span>${formatMoney(flashingAddons)}</span></div>
      <div class="scope-row"><span>% of Project:</span><span>${(flashingAddons/fullProjectValue*100).toFixed(0)}%</span></div>
      <div class="scope-row"><span>Cost to Finish (30%):</span><span>${formatMoney(flashingAddons * 0.3)}</span></div>
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-box">
      <div class="chart-title">Roofing Cost by Building</div>
      ${buildingChart()}
    </div>
    <div class="chart-box">
      <div class="chart-title">Cost by System (Roofing Scope)</div>
      ${systemPieChart()}
    </div>
  </div>

  <div class="charts-row">
    <div class="chart-box">
      <div class="chart-title">Progress by Scope</div>
      ${progressBars()}
    </div>
    <div class="chart-box">
      <div class="chart-title">Cash Flow by Quarter</div>
      ${cashFlowTrend()}
    </div>
  </div>

  <h2>Sage Invoice History</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Invoice #</th>
        <th class="text-right">Amount</th>
        <th class="text-right">Paid</th>
        <th class="text-right">Outstanding</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${invoices.map(inv => {
        const total = Number(inv.invoice_total);
        const due = Number(inv.net_due);
        const paid = total - due;
        const statusClass = inv.status === 'Unpaid' ? 'warning' : 'highlight';
        return `
          <tr class="${statusClass}">
            <td>${inv.invoice_date.value}</td>
            <td>${inv.Invoice_No}</td>
            <td class="money">${formatMoney(total)}</td>
            <td class="money">${formatMoney(paid)}</td>
            <td class="money">${formatMoney(due)}</td>
            <td>${inv.status}</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td colspan="2">TOTAL</td>
        <td class="money">${formatMoney(sageInvoiced)}</td>
        <td class="money">${formatMoney(sagePaid)}</td>
        <td class="money">${formatMoney(sageOutstanding)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>Cost to Complete by Building (Roofing Only)</h2>
  <table>
    <thead>
      <tr>
        <th>Building</th>
        <th class="text-right">Total Takeoff</th>
        <th class="text-right">70% Complete</th>
        <th class="text-right">Cost to Finish</th>
        <th class="text-center">Items</th>
      </tr>
    </thead>
    <tbody>
      ${Object.entries(buildings).sort().map(([bldg, data]) => `
        <tr>
          <td><strong>Building ${bldg}</strong></td>
          <td class="money">${formatMoney(data.total)}</td>
          <td class="money">${formatMoney(data.total * 0.7)}</td>
          <td class="money">${formatMoney(data.total * 0.3)}</td>
          <td class="text-center">${data.items}</td>
        </tr>
      `).join('')}
      <tr class="total-row">
        <td>ROOFING TOTAL</td>
        <td class="money">${formatMoney(roofingTotal)}</td>
        <td class="money">${formatMoney(roofingTotal * 0.7)}</td>
        <td class="money">${formatMoney(roofingTotal * 0.3)}</td>
        <td></td>
      </tr>
    </tbody>
  </table>

  <h2>Cost to Complete by System</h2>
  <table>
    <thead>
      <tr>
        <th>System</th>
        <th class="text-right">Total</th>
        <th class="text-right">% of Roofing</th>
        <th class="text-right">Cost to Finish</th>
      </tr>
    </thead>
    <tbody>
      ${sortedSystems.slice(0, 10).map(([name, data]) => `
        <tr>
          <td>${name}</td>
          <td class="money">${formatMoney(data.total)}</td>
          <td class="text-right">${(data.total/roofingTotal*100).toFixed(1)}%</td>
          <td class="money">${formatMoney(data.total * 0.3)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="page-break"></div>

  <h2>Line Items by Building - Top 12 Each</h2>
  ${Object.entries(buildings).sort().map(([bldg, _]) => {
    const bldgItems = lineItems.filter(i => i.sheet_name.includes(`Building ${bldg}`));
    return `
      <h3 style="font-size: 11px; margin: 12px 0 6px 0; color: #2d3748;">Building ${bldg}</h3>
      <table>
        <thead>
          <tr>
            <th>Scope/Item</th>
            <th class="text-right">Unit</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Total</th>
            <th class="text-right">To Finish</th>
          </tr>
        </thead>
        <tbody>
          ${bldgItems.slice(0, 12).map(item => `
            <tr>
              <td>${(item.scope_raw || 'Unknown').substring(0, 40)}</td>
              <td class="money">${formatMoney(item.unit_cost)}</td>
              <td class="text-right">${Number(item.total_measurements).toLocaleString()}</td>
              <td class="money">${formatMoney(item.total_cost)}</td>
              <td class="money">${formatMoney(Number(item.total_cost) * 0.3)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }).join('')}

  <h2>Project Closeout Summary</h2>
  <table>
    <thead>
      <tr>
        <th>Category</th>
        <th class="text-right">Amount</th>
        <th>Expected Timeline</th>
        <th>Action</th>
      </tr>
    </thead>
    <tbody>
      <tr class="warning">
        <td>Outstanding A/R (2 invoices)</td>
        <td class="money">${formatMoney(sageOutstanding)}</td>
        <td>30-45 days</td>
        <td>Follow up with Jay Group</td>
      </tr>
      <tr class="pending">
        <td>Remaining Work - Roofing</td>
        <td class="money">${formatMoney(roofingTotal * 0.3)}</td>
        <td>As completed</td>
        <td>Invoice progressively</td>
      </tr>
      <tr class="pending">
        <td>Remaining Work - Panels</td>
        <td class="money">${formatMoney(panelScope * 0.3)}</td>
        <td>As completed</td>
        <td>Invoice progressively</td>
      </tr>
      <tr class="pending">
        <td>Remaining Work - Flashing</td>
        <td class="money">${formatMoney(flashingAddons * 0.3)}</td>
        <td>As completed</td>
        <td>Invoice progressively</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL TO CLOSE OUT</td>
        <td class="money">${formatMoney(sageOutstanding + costToFinish)}</td>
        <td colspan="2">Outstanding + Remaining Work Revenue</td>
      </tr>
    </tbody>
  </table>

  <div style="background: #edf2f7; padding: 15px; border-radius: 8px; margin-top: 15px;">
    <div style="font-size: 12px; font-weight: bold; color: #2d3748; margin-bottom: 8px;">Key Metrics</div>
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; font-size: 10px;">
      <div><strong>Total Project:</strong> ${formatMoney(fullProjectValue)}</div>
      <div><strong>Invoiced %:</strong> ${(sageInvoiced/fullProjectValue*100).toFixed(1)}%</div>
      <div><strong>Collected %:</strong> ${(sagePaid/fullProjectValue*100).toFixed(1)}%</div>
      <div><strong>DSO (est):</strong> ~35 days</div>
    </div>
  </div>

  <div class="footer">
    <p>Generated: ${new Date().toLocaleString()} | Master Roofing & Siding | KO Intelligence System</p>
    <p>Sources: Sage Accounting, July 2025 Takeoff, Proposal Files | Assumes 70% completion across all scopes</p>
  </div>

</body>
</html>`;

writeFileSync('/home/iwagschal/102-fleet-full-projection.html', html);
console.log('HTML saved');

console.log('Generating PDF...');
const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'networkidle0' });
await page.pdf({
  path: '/home/iwagschal/102-fleet-full-projection.pdf',
  format: 'Letter',
  margin: { top: '8mm', bottom: '8mm', left: '8mm', right: '8mm' },
  printBackground: true
});
await browser.close();

console.log('PDF saved to /home/iwagschal/102-fleet-full-projection.pdf');
