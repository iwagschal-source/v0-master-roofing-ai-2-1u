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

console.log('='.repeat(70));
console.log('102 FLEET PLACE - PROJECT DATA ANALYSIS');
console.log('='.repeat(70));

// 1. Get takeoff cost breakdown by building (latest versions)
const [takeoffs] = await bq.query({
  query: `
    SELECT
      sheet_name,
      ROUND(SUM(total_cost), 2) as total_cost,
      SUM(total_measurements) as total_measurements,
      COUNT(*) as line_items
    FROM mr_core.fct_takeoff_line
    WHERE LOWER(project_folder_name) LIKE '%102 fleet%'
      AND sheet_name LIKE '%07%2025%'
    GROUP BY sheet_name
    ORDER BY sheet_name
  `,
  location: 'us-east4'
});

console.log('\n1. TAKEOFF COST BREAKDOWN (July 2025 - Latest)');
console.log('-'.repeat(70));
let totalTakeoffCost = 0, totalLineItems = 0;
takeoffs.forEach(t => {
  console.log(`${t.sheet_name}`);
  console.log(`   Total: $${t.total_cost.toLocaleString()} | Line Items: ${t.line_items}`);
  totalTakeoffCost += t.total_cost;
  totalLineItems += t.line_items;
});
console.log('-'.repeat(70));
console.log(`TOTAL TAKEOFF: $${totalTakeoffCost.toLocaleString()}`);
console.log(`  Total Line Items: ${totalLineItems}`);

// 2. Invoice payment patterns
const [invoices] = await bq.query({
  query: `
    SELECT
      invoice_number,
      invoice_date,
      ROUND(invoice_total, 2) as invoice_total,
      ROUND(net_due, 2) as net_due,
      status,
      project_name
    FROM mr_agent.sage_invoices
    WHERE LOWER(project_name) LIKE '%102 fleet%'
    ORDER BY invoice_date
  `,
  location: 'us-east4'
});

console.log('\n2. INVOICE PAYMENT HISTORY (102 Fleet Only)');
console.log('-'.repeat(70));
let invoiced = 0, paid = 0;
invoices.forEach(inv => {
  invoiced += inv.invoice_total;
  const paidAmt = inv.invoice_total - inv.net_due;
  paid += paidAmt;
  const daysSinceInvoice = Math.floor((Date.now() - new Date(inv.invoice_date.value).getTime()) / (1000*60*60*24));
  console.log(`${inv.invoice_date.value} | #${inv.invoice_number} | $${inv.invoice_total.toLocaleString().padStart(12)} | ${inv.status.padEnd(6)} | ${daysSinceInvoice} days ago`);
});
console.log('-'.repeat(70));
console.log(`Total Invoiced: $${invoiced.toLocaleString()}`);
console.log(`Total Paid: $${paid.toLocaleString()}`);
console.log(`Outstanding: $${(invoiced - paid).toLocaleString()}`);
console.log(`Collection Rate: ${(paid/invoiced*100).toFixed(1)}%`);

// 3. Proposal amounts over time
const [proposals] = await bq.query({
  query: `
    SELECT
      proposal_date,
      building,
      total_amount,
      file_name
    FROM mr_agent.parsed_proposals_v2
    WHERE LOWER(project_name) LIKE '%102 fleet%'
      AND building IS NOT NULL
    ORDER BY proposal_date, building
  `,
  location: 'us-east4'
});

console.log('\n3. PROPOSAL AMOUNT EVOLUTION');
console.log('-'.repeat(70));
const byBuilding = {};
proposals.forEach(p => {
  if (!byBuilding[p.building]) byBuilding[p.building] = [];
  byBuilding[p.building].push({ date: p.proposal_date?.value || 'N/A', amount: p.total_amount });
});

for (const [bldg, props] of Object.entries(byBuilding).sort()) {
  console.log(`Building ${bldg}:`);
  props.forEach(p => {
    console.log(`   ${p.date}: $${p.amount?.toLocaleString() || 'N/A'}`);
  });
  if (props.length >= 2 && props[0].amount && props[props.length-1].amount) {
    const change = props[props.length-1].amount - props[0].amount;
    const pct = (change / props[0].amount * 100).toFixed(1);
    console.log(`   Change: ${change >= 0 ? '+' : ''}$${change.toLocaleString()} (${pct}%)`);
  }
}

// 4. Calculate projections
console.log('\n' + '='.repeat(70));
console.log('PROJECTIONS & ANALYSIS');
console.log('='.repeat(70));

// Payment velocity
const paidInvoices = invoices.filter(i => i.status === 'Paid');
if (paidInvoices.length >= 2) {
  const firstPaidDate = new Date(paidInvoices[0].invoice_date.value);
  const lastPaidDate = new Date(paidInvoices[paidInvoices.length-1].invoice_date.value);
  const daysBetween = (lastPaidDate - firstPaidDate) / (1000*60*60*24);
  const avgDaysPerPayment = daysBetween / (paidInvoices.length - 1);
  console.log('\nA. PAYMENT VELOCITY');
  console.log(`   Invoices paid: ${paidInvoices.length}`);
  console.log(`   Period: ${Math.round(daysBetween)} days`);
  console.log(`   Avg time between payments: ${Math.round(avgDaysPerPayment)} days`);
}

// Outstanding collection projection
const outstanding = invoiced - paid;
if (outstanding > 0) {
  console.log('\nB. OUTSTANDING COLLECTION');
  console.log(`   Amount outstanding: $${outstanding.toLocaleString()}`);
  console.log(`   Based on payment history: ~30-45 days typical collection`);
  console.log(`   Projected collection: Mid-February 2026`);
}

// Project completion estimate
console.log('\nC. PROJECT COMPLETION ESTIMATE');
const completion = (invoiced / totalTakeoffCost * 100);
console.log(`   Takeoff Total: $${totalTakeoffCost.toLocaleString()}`);
console.log(`   Invoiced to Date: $${invoiced.toLocaleString()}`);
console.log(`   Completion %: ${completion.toFixed(1)}%`);
console.log(`   Remaining Work: $${(totalTakeoffCost - invoiced).toLocaleString()}`);

// Profit margin estimate
console.log('\nD. PROFIT MARGIN ANALYSIS');
// Get latest proposal totals
const latestProposals = proposals.filter(p => p.proposal_date?.value?.includes('07') || p.proposal_date?.value?.includes('10'));
const proposalTotal = [...new Set(Object.keys(byBuilding))].reduce((sum, b) => {
  const bldgProps = byBuilding[b];
  return sum + (bldgProps[bldgProps.length-1]?.amount || 0);
}, 0);
console.log(`   Latest Proposal Total: $${proposalTotal.toLocaleString()}`);
console.log(`   Takeoff Cost: $${totalTakeoffCost.toLocaleString()}`);
if (proposalTotal > 0 && totalTakeoffCost > 0) {
  const margin = proposalTotal - totalTakeoffCost;
  const marginPct = (margin / proposalTotal * 100);
  console.log(`   Gross Margin: $${margin.toLocaleString()} (${marginPct.toFixed(1)}%)`);
}

// Cash Flow Projection
console.log('\nE. CASH FLOW PROJECTION');
console.log(`   Current Outstanding: $${outstanding.toLocaleString()}`);
console.log(`   If collected in 30 days: +$${outstanding.toLocaleString()} by mid-Feb 2026`);
console.log(`   Remaining work value: $${(totalTakeoffCost - invoiced).toLocaleString()}`);
console.log(`   Projected future invoicing: $${(totalTakeoffCost - invoiced).toLocaleString()}`);

console.log('\n' + '='.repeat(70));
