#!/usr/bin/env node
import { BigQuery } from '@google-cloud/bigquery';
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

console.log('='.repeat(80));
console.log('102 FLEET PLACE - DATA AVAILABLE FOR PROJECTIONS');
console.log('='.repeat(80));

try {
  // 1. Takeoff data
  const [takeoffs] = await bq.query({
    query: `
      SELECT
        sheet_name,
        SUM(total_cost) as total_cost,
        COUNT(*) as line_items
      FROM mr_core.fct_takeoff_line
      WHERE LOWER(project_folder_name) LIKE '%102 fleet%'
      GROUP BY sheet_name
      ORDER BY total_cost DESC
    `,
    location: 'us-east4'
  });

  console.log('\n1. TAKEOFF DATA AVAILABLE');
  console.log('-'.repeat(80));

  // Group by date pattern
  const byDate = {};
  takeoffs.forEach(t => {
    const dateMatch = t.sheet_name.match(/(\d{1,2}[-\.]\d{1,2}[-\.]\d{4})/);
    const date = dateMatch ? dateMatch[1] : 'Unknown';
    if (!byDate[date]) byDate[date] = { total: 0, sheets: [] };
    byDate[date].total = byDate[date].total + Number(t.total_cost);
    byDate[date].sheets.push(t.sheet_name);
  });

  let totalTakeoff = 0;
  for (const [date, data] of Object.entries(byDate).sort()) {
    console.log(`${date.padEnd(15)}: ${formatMoney(data.total).padStart(15)} (${data.sheets.length} sheets)`);
    totalTakeoff = totalTakeoff + data.total;
  }
  console.log('-'.repeat(80));
  console.log(`TOTAL TAKEOFF VALUE: ${formatMoney(totalTakeoff)}`);

  // 2. Invoice data
  const [invoices] = await bq.query({
    query: `
      SELECT
        invoice_date,
        Invoice_No as invoice_number,
        invoice_total,
        net_due,
        status
      FROM mr_agent.sage_invoices
      WHERE LOWER(project_address) LIKE '%102 fleet%'
      ORDER BY invoice_date
    `,
    location: 'us-east4'
  });

  console.log('\n2. SAGE INVOICE DATA');
  console.log('-'.repeat(80));
  let totalInvoiced = 0;
  let totalPaid = 0;
  invoices.forEach(inv => {
    const invTotal = Number(inv.invoice_total);
    const netDue = Number(inv.net_due);
    const paid = invTotal - netDue;
    totalInvoiced = totalInvoiced + invTotal;
    totalPaid = totalPaid + paid;
    console.log(`${inv.invoice_date.value} | #${String(inv.invoice_number).padEnd(15)} | ${formatMoney(invTotal).padStart(12)} | ${inv.status}`);
  });
  const outstanding = totalInvoiced - totalPaid;
  console.log('-'.repeat(80));
  console.log(`Total Invoiced: ${formatMoney(totalInvoiced)}`);
  console.log(`Total Paid:     ${formatMoney(totalPaid)}`);
  console.log(`Outstanding:    ${formatMoney(outstanding)}`);

  // ========== PROJECTIONS ==========
  console.log('\n' + '='.repeat(80));
  console.log('POSSIBLE PROJECTIONS WITH THIS DATA');
  console.log('='.repeat(80));

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ A. PROJECT COMPLETION PROJECTION                                            │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  const completionPct = (totalInvoiced / totalTakeoff * 100);
  console.log(`│   Takeoff Total (estimated project value):  ${formatMoney(totalTakeoff).padStart(15)}              │`);
  console.log(`│   Invoiced to Date:                         ${formatMoney(totalInvoiced).padStart(15)}              │`);
  console.log(`│   Estimated Completion:                     ${completionPct.toFixed(1).padStart(14)}%              │`);
  console.log(`│   Remaining Work Value:                     ${formatMoney(totalTakeoff - totalInvoiced).padStart(15)}              │`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ B. CASH FLOW PROJECTION                                                     │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log(`│   Outstanding Receivables:                  ${formatMoney(outstanding).padStart(15)}              │`);
  console.log(`│   Collection Rate (historical):             ${(totalPaid/totalInvoiced*100).toFixed(1).padStart(14)}%              │`);
  console.log(`│   Expected Collection (30-45 days):         ${formatMoney(outstanding).padStart(15)}              │`);
  console.log(`│   Future Invoicing (remaining work):        ${formatMoney(totalTakeoff - totalInvoiced).padStart(15)}              │`);
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ C. PAYMENT VELOCITY ANALYSIS                                                │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  const paidInvoices = invoices.filter(i => i.status === 'Paid');
  if (paidInvoices.length >= 2) {
    const firstDate = new Date(paidInvoices[0].invoice_date.value);
    const lastDate = new Date(paidInvoices[paidInvoices.length - 1].invoice_date.value);
    const daysBetween = Math.round((lastDate - firstDate) / (1000 * 60 * 60 * 24));
    const avgPerMonth = totalPaid / (daysBetween / 30);
    const daysToCollect = Math.round(outstanding / avgPerMonth * 30);
    console.log(`│   Payment History Span:                     ${String(daysBetween + ' days').padStart(15)}              │`);
    console.log(`│   Payments Received:                        ${String(paidInvoices.length).padStart(15)}              │`);
    console.log(`│   Average Monthly Cash Inflow:              ${formatMoney(avgPerMonth).padStart(15)}              │`);
    console.log(`│   Projected Outstanding Collection:         ${String(daysToCollect + ' days').padStart(15)}              │`);
  }
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ D. REVENUE TREND ANALYSIS (Quarterly)                                       │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  // Group invoices by quarter
  const byQuarter = {};
  invoices.forEach(inv => {
    const d = new Date(inv.invoice_date.value);
    const q = `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
    if (!byQuarter[q]) byQuarter[q] = 0;
    byQuarter[q] = byQuarter[q] + Number(inv.invoice_total);
  });
  for (const [q, amt] of Object.entries(byQuarter).sort()) {
    console.log(`│   ${q.padEnd(10)} Invoiced:                      ${formatMoney(amt).padStart(15)}              │`);
  }
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ E. SCOPE CHANGE TRACKING (from Proposal History)                            │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  console.log('│   Multiple proposal versions show scope evolution over time                 │');
  console.log('│   Can track change orders and additions                                     │');
  console.log('│   Panel proposal: $5,694,000 (separate major scope item)                    │');
  console.log('│   ADJ Building Flashing additions: $69K-$173K                               │');
  console.log('│   Building proposals span: April 2025 - October 2025                        │');
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');

  console.log('\n' + '='.repeat(80));
  console.log('DATA LIMITATIONS');
  console.log('='.repeat(80));
  console.log(`
• Labor hours not tracked in takeoff data - cannot project crew schedules
• Actual costs not linked to invoices - margin analysis is estimate only
• Weather/delays not tracked - timeline projections are estimates only
• Subcontractor costs not broken out - cannot project sub payments
• Multiple takeoff revisions exist - using sum may overcount
`);

  console.log('='.repeat(80));
  console.log('ADDITIONAL PROJECTIONS POSSIBLE WITH MORE DATA');
  console.log('='.repeat(80));
  console.log(`
1. PROFITABILITY PROJECTION
   - Need: Actual job costs (labor, material, equipment)
   - Would enable: Gross margin %, profit per building

2. SCHEDULE PROJECTION
   - Need: Labor hours per task, crew assignments
   - Would enable: Completion date estimates, resource planning

3. RISK ANALYSIS
   - Need: Historical change order rates, delay factors
   - Would enable: Contingency planning, buffer recommendations

4. GC PAYMENT PATTERN ANALYSIS
   - Need: More invoice/payment history for Jay Group
   - Would enable: DSO prediction, collection strategy
`);

} catch (err) {
  console.error('Error:', err.message);
}
