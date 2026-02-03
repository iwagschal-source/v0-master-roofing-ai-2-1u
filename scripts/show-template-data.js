#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
for (const line of envContent.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0 && !line.startsWith('#')) {
    const key = line.substring(0, idx).trim();
    let val = line.substring(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[key] = val.replace(/\\n/g, '\n');
  }
}

// Fetch preview data from local server
async function main() {
  const previewUrl = 'http://localhost:3000/api/ko/proposal/proj_4222d7446fbc40c5/preview';

  console.log('Fetching preview data...\n');
  const res = await fetch(previewUrl);
  const previewData = await res.json();

  // Transform for template (copy of generate/route.js logic)
  const templateData = transformForTemplate(previewData, {});

  console.log('=== TEMPLATE DATA OBJECT ===\n');
  console.log('project_name:', templateData.project_name);
  console.log('date:', templateData.date);
  console.log('prepared_for:', templateData.prepared_for);
  console.log('proposal_version:', templateData.proposal_version);
  console.log('grand_total_bid:', templateData.grand_total_bid);
  console.log('');
  console.log('project_summary:');
  console.log('  "' + templateData.project_summary + '"');
  console.log('');
  console.log('line_items.length:', templateData.line_items.length);
  console.log('alt_line_items.length:', templateData.alt_line_items.length);

  console.log('\n=== FIRST 3 LINE ITEMS ===\n');
  templateData.line_items.slice(0, 3).forEach((item, i) => {
    console.log('--- line_items[' + i + '] ---');
    console.log('  section_title:', item.section_title);
    console.log('  r_value:', item.r_value || '(empty)');
    console.log('  size:', item.size || '(empty)');
    console.log('  type:', item.type || '(empty)');
    console.log('  areas:', item.areas || '(empty)');
    console.log('  price:', item.price);
    console.log('  description:', (item.description || '').substring(0, 150) + (item.description?.length > 150 ? '...' : ''));
    console.log('');
  });

  console.log('=== ALL SECTION TITLES & PRICES ===\n');
  templateData.line_items.forEach((item, i) => {
    console.log(String(i+1).padStart(2) + '. ' + item.section_title.padEnd(30) + ' ' + item.price);
  });
}

function transformForTemplate(previewData, editedDescriptions) {
  const { project, sections, standaloneItems, totals } = previewData;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const lineItems = [];

  for (const section of sections || []) {
    lineItems.push({
      section_title: section.sectionType || section.title.replace('WORK DETAILS FOR ', ''),
      r_value: section.items?.[0]?.rValue || '',
      size: section.items?.[0]?.thickness || '',
      type: section.items?.[0]?.materialType || '',
      price: formatCurrency(section.subtotal),
      areas: formatAreas(section.items),
      description: buildSectionDescription(section, editedDescriptions)
    });
  }

  for (const item of standaloneItems || []) {
    const descKey = 'standalone-' + item.rowNumber;
    lineItems.push({
      section_title: item.name || item.itemId || 'Additional Item',
      r_value: item.rValue || '',
      size: item.thickness || '',
      type: item.materialType || '',
      price: formatCurrency(item.totalCost),
      areas: item.totalMeasurements ? item.totalMeasurements.toLocaleString() + ' SF' : '',
      description: editedDescriptions[descKey] || item.description || ''
    });
  }

  const projectSummary = buildProjectSummary(previewData);
  const altLineItems = [];

  const grandTotal = lineItems.reduce((sum, item) => {
    const priceNum = parseFloat((item.price || '0').replace(/[^0-9.-]/g, ''));
    return sum + (isNaN(priceNum) ? 0 : priceNum);
  }, 0);

  return {
    project_name: project.name || project.address || 'Project',
    date: formattedDate,
    prepared_for: project.gcName || 'General Contractor',
    date_drawings: '',
    proposal_version: 'Rev 1',
    project_summary: projectSummary,
    line_items: lineItems,
    alt_line_items: altLineItems,
    grand_total_bid: formatCurrency(grandTotal)
  };
}

function buildSectionDescription(section, editedDescriptions) {
  const descriptions = [];
  for (const item of section.items || []) {
    const descKey = 'section-' + section.title + '-item-' + item.rowNumber;
    const desc = editedDescriptions[descKey] || item.description;
    if (desc) descriptions.push(desc);
  }
  return descriptions.join('\n\n') || 'Installation of ' + (section.sectionType || 'roofing system') + ' as specified.';
}

function formatAreas(items) {
  if (!items || items.length === 0) return '';
  const totalSF = items.reduce((sum, item) => sum + (item.totalMeasurements || 0), 0);
  return totalSF > 0 ? totalSF.toLocaleString() + ' SF' : '';
}

function buildProjectSummary(previewData) {
  const { project, sections } = previewData;
  const scopeTypes = [];
  for (const section of sections || []) {
    if (section.sectionType) scopeTypes.push(section.sectionType);
  }
  const uniqueScopes = [...new Set(scopeTypes)];
  if (uniqueScopes.length === 0) {
    return 'This proposal covers the roofing and related work for the project located at ' + (project.address || 'the specified address') + '. Our scope includes all labor, materials, and supervision required to complete the work as described herein.';
  }
  const scopeList = uniqueScopes.join(', ').toLowerCase();
  return 'This proposal covers ' + scopeList + ' work for the project located at ' + (project.address || 'the specified address') + '. Our scope includes all labor, materials, and supervision required to complete the work as described herein, in accordance with standard industry practices.';
}

function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}

main().catch(e => console.error(e));
