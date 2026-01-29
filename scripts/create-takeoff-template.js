#!/usr/bin/env node
/**
 * Creates a standalone Google Sheets takeoff template
 * Matches the Master Roofing Excel template structure exactly
 *
 * Run with: node scripts/create-takeoff-template.js
 */

const { google } = require('googleapis');
const path = require('path');

// Template structure based on Master Roofing takeoff template
const TEMPLATE_CONFIG = {
  title: 'Master Roofing - Takeoff Template',
  columns: [
    { title: 'Unit Cost', width: 90 },
    { title: 'Scope', width: 280 },
    { title: '1st Floor', width: 85 },
    { title: '2nd Floor', width: 85 },
    { title: '3rd Floor', width: 85 },
    { title: '4th Floor', width: 85 },
    { title: 'Main Roof', width: 85 },
    { title: 'Stair Bulkhead', width: 100 },
    { title: 'Elev. Bulkhead', width: 100 },
    { title: 'Total Measurements', width: 130 },
    { title: 'Total Cost', width: 110 },
    { title: 'Row Type', width: 120 },
    { title: 'Comments', width: 180 },
  ],
  rowTypes: ['ITEM', 'SUBTOTAL', 'STANDALONE', 'SECTION_TOTAL', 'GRAND_TOTAL'],
  // Initial rows from Excel template - first 20 items
  initialData: [
    // Row 1: Date placeholder
    ['', '', '', '', '', '', '', '', '', '', '', '', 'Date: '],
    // Row 2: Project name placeholder
    ['', 'Project Name', '', '', '', '', '', '', '', '', '', '', ''],
    // Row 3: Headers (will be set separately with formatting)
    ['Unit Cost', 'Scope', '1st Floor', '2nd Floor', '3rd Floor', '4th Floor', 'Main Roof', 'Stair Bulkhead', 'Elev. Bulkhead', 'Total Measurements', 'Total Cost', 'Row Type', 'Comments'],
    // Row 4-5: Standalone items (yellow)
    ['$6.95', 'Vapor Barrier or Temp waterproofing', '', '', '', '', '', '', '', '=SUM(C4:I4)', '=A4*J4', 'STANDALONE', ''],
    ['$1.50', 'Upcharge for 1/4" Pitch', '', '', '', '', '', '', '', '=SUM(C5:I5)', '=A5*J5', 'STANDALONE', ''],
    // Row 6-9: Roofing section with subtotal
    ['$16.25', 'Roofing - Builtup - 2 ply Scope', '', '', '', '', '', '', '', '=SUM(C6:I6)', '=A6*J6', 'ITEM', ''],
    ['$12.00', 'Up and Over', '', '', '', '', '', '', '', '=SUM(C7:I7)', '=A7*J7', 'ITEM', ''],
    ['$2500.00', 'Scupper/Gutter and Leader', '', '', '', '', '', '', '', '=SUM(C8:I8)', '=A8*J8', 'ITEM', ''],
    ['', 'SUBTOTAL - Roofing', '', '', '', '', '', '', '', '', '=SUM(K6:K8)', 'SUBTOTAL', ''],
    // Row 10-14: IRMA section
    ['$18.50', 'Roofing - IRMA - 2ply Scope', '', '', '', '', '', '', '', '=SUM(C10:I10)', '=A10*J10', 'ITEM', ''],
    ['$12.00', 'Up and Over', '', '', '', '', '', '', '', '=SUM(C11:I11)', '=A11*J11', 'ITEM', ''],
    ['$4.50', 'Insulation', '', '', '', '', '', '', '', '=SUM(C12:I12)', '=A12*J12', 'ITEM', ''],
    ['$2500.00', 'Scupper/Gutter and Leader', '', '', '', '', '', '', '', '=SUM(C13:I13)', '=A13*J13', 'ITEM', ''],
    ['', 'SUBTOTAL - IRMA', '', '', '', '', '', '', '', '', '=SUM(K10:K13)', 'SUBTOTAL', ''],
    // Row 15: Standalone
    ['$150.00', 'Drains (each)', '', '', '', '', '', '', '', '=SUM(C15:I15)', '=A15*J15', 'STANDALONE', ''],
    // Add more rows as needed...
    ['$16.25', 'APP 180', '', '', '', '', '', '', '', '=SUM(C16:I16)', '=A16*J16', 'ITEM', ''],
    ['$12.00', 'Up and Over', '', '', '', '', '', '', '', '=SUM(C17:I17)', '=A17*J17', 'ITEM', ''],
    ['', 'SUBTOTAL - APP 180', '', '', '', '', '', '', '', '', '=SUM(K16:K17)', 'SUBTOTAL', ''],
    // Empty rows for user to fill
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', '', '', ''],
  ],
};

async function createTakeoffTemplate() {
  // Authenticate using service account
  const auth = new google.auth.GoogleAuth({
    keyFile: '/home/iwagschal/.gcp/workspace-ingest.json',
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
    clientOptions: {
      subject: 'rfp@masterroofingus.com', // Domain-wide delegation
    },
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive = google.drive({ version: 'v3', auth });

  console.log('Creating standalone takeoff template...\n');

  // Step 1: Create new spreadsheet
  const createResponse = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: TEMPLATE_CONFIG.title,
      },
      sheets: [{
        properties: {
          title: 'Takeoff',
          gridProperties: {
            rowCount: 100,
            columnCount: 13,
            frozenRowCount: 3, // Freeze header rows
          },
        },
      }],
    },
  });

  const spreadsheetId = createResponse.data.spreadsheetId;
  const sheetId = createResponse.data.sheets[0].properties.sheetId;
  console.log(`Created spreadsheet: ${spreadsheetId}`);

  // Step 2: Set column widths
  const columnWidthRequests = TEMPLATE_CONFIG.columns.map((col, index) => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: index,
        endIndex: index + 1,
      },
      properties: { pixelSize: col.width },
      fields: 'pixelSize',
    },
  }));

  // Step 3: Add data validation for Row Type column (L = column index 11)
  const dataValidationRequest = {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 3, // Start after headers
        endRowIndex: 100,
        startColumnIndex: 11, // Column L
        endColumnIndex: 12,
      },
      rule: {
        condition: {
          type: 'ONE_OF_LIST',
          values: TEMPLATE_CONFIG.rowTypes.map(v => ({ userEnteredValue: v })),
        },
        showCustomUi: true,
        strict: false,
      },
    },
  };

  // Step 4: Format header row (row 3)
  const headerFormatRequest = {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 2,
        endRowIndex: 3,
        startColumnIndex: 0,
        endColumnIndex: 13,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.8, green: 0.8, blue: 0.8 },
          textFormat: { bold: true, fontSize: 10 },
          horizontalAlignment: 'CENTER',
          borders: {
            bottom: { style: 'SOLID_MEDIUM' },
          },
        },
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,borders)',
    },
  };

  // Step 5: Format Unit Cost column as currency
  const currencyFormatA = {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 100,
        startColumnIndex: 0, // Column A
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  };

  // Step 6: Format Total Cost column as currency
  const currencyFormatK = {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 3,
        endRowIndex: 100,
        startColumnIndex: 10, // Column K
        endColumnIndex: 11,
      },
      cell: {
        userEnteredFormat: {
          numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
        },
      },
      fields: 'userEnteredFormat.numberFormat',
    },
  };

  // Apply all formatting
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        ...columnWidthRequests,
        dataValidationRequest,
        headerFormatRequest,
        currencyFormatA,
        currencyFormatK,
      ],
    },
  });
  console.log('Applied formatting and column widths');

  // Step 7: Add initial data with formulas
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Takeoff!A1:M20',
    valueInputOption: 'USER_ENTERED', // This evaluates formulas
    requestBody: {
      values: TEMPLATE_CONFIG.initialData,
    },
  });
  console.log('Added initial data with formulas');

  // Step 8: Apply yellow highlighting to SUBTOTAL and STANDALONE rows
  // Get row types to find which rows need highlighting
  const yellowRows = [4, 5, 9, 14, 15, 18]; // Rows with SUBTOTAL or STANDALONE (1-indexed)
  const yellowRequests = yellowRows.map(row => ({
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: row - 1,
        endRowIndex: row,
        startColumnIndex: 10, // Column K only
        endColumnIndex: 11,
      },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 1, green: 1, blue: 0 }, // Yellow
        },
      },
      fields: 'userEnteredFormat.backgroundColor',
    },
  }));

  if (yellowRequests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: yellowRequests },
    });
    console.log('Applied yellow highlighting to proposal rows');
  }

  // Step 9: Share with rfp@masterroofingus.com (owner)
  // Note: Since we're impersonating rfp@, the file is already owned by them

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  console.log('\n' + '='.repeat(60));
  console.log('TAKEOFF TEMPLATE CREATED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log(`\nSpreadsheet ID: ${spreadsheetId}`);
  console.log(`URL: ${url}`);
  console.log('\nUpdate .env.local with:');
  console.log(`GOOGLE_TAKEOFF_TEMPLATE_ID=${spreadsheetId}`);
  console.log('='.repeat(60));

  return { spreadsheetId, url };
}

// Run if called directly
createTakeoffTemplate()
  .then(result => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
