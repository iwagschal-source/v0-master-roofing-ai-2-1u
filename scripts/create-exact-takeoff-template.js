#!/usr/bin/env node
/**
 * Creates Master Roofing takeoff template in Google Sheets
 * FOCUS: All 75 rows with CORRECT FORMULAS
 * Colors/borders can be added manually and saved
 *
 * Run with: node scripts/create-exact-takeoff-template.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load extracted template data
const templatePath = path.join(__dirname, '../data/excel-template-exact.json');
const template = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

async function createTemplate() {
  const auth = new google.auth.GoogleAuth({
    keyFile: '/home/iwagschal/.gcp/workspace-ingest.json',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
    clientOptions: {
      subject: 'rfp@masterroofingus.com',
    },
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  console.log('Creating takeoff template with all formulas...\n');

  // Create spreadsheet
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'Master Roofing - Takeoff Template',
      },
      sheets: [{
        properties: {
          title: 'Takeoff',
          gridProperties: {
            rowCount: 100,
            columnCount: 13,
            frozenRowCount: 3,
          },
        },
      }],
    },
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  const sheetId = createResponse.data.sheets[0].properties.sheetId;
  console.log(`Created: ${spreadsheetId}`);

  // Add Row Type column to data
  const dataWithRowType = template.rows.map((row, idx) => {
    const newRow = [...row];
    if (idx === 2) {
      newRow.push('Row Type');
    } else {
      newRow.push('');  // User will set row types
    }
    return newRow;
  });

  // Add all data with formulas
  console.log('Adding 75 rows with formulas...');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Takeoff!A1:M75',
    valueInputOption: 'USER_ENTERED',  // This evaluates formulas
    requestBody: {
      values: dataWithRowType,
    },
  });

  // Verify formulas were added
  const verifyResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Takeoff!K4:K10',
    valueRenderOption: 'FORMULA',
  });
  console.log('\nFormula check (K4:K10):');
  verifyResponse.data.values?.forEach((row, i) => {
    console.log(`  K${i+4}: ${row[0]}`);
  });

  // Share with service account
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      type: 'user',
      role: 'writer',
      emailAddress: 'workspace-ingest@master-roofing-intelligence.iam.gserviceaccount.com',
    },
  });

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  console.log('\n' + '='.repeat(60));
  console.log('TEMPLATE CREATED - FORMULAS READY');
  console.log('='.repeat(60));
  console.log(`\nID: ${spreadsheetId}`);
  console.log(`URL: ${url}`);
  console.log(`\nRows: 75`);
  console.log(`Formulas: All =A*J and =SUM() formulas from Excel`);
  console.log(`\nNEXT: Open the URL, add colors/borders, save.`);
  console.log(`Then update .env.local:`);
  console.log(`GOOGLE_TAKEOFF_TEMPLATE_ID=${spreadsheetId}`);
  console.log('='.repeat(60));

  return { spreadsheetId, url };
}

createTemplate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
