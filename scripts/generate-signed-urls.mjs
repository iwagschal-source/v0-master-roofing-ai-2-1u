#!/usr/bin/env node
import { createSign, createHash } from 'crypto';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync } from 'fs';

dotenv.config({ path: resolve(process.cwd(), '.env.production.local') });

const BUCKET = 'mr-agent-docs-us-east4';

// Generate V4 signed URL
function generateSignedUrl(objectPath, expiresInSeconds = 604800) { // 7 days
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    console.error('Missing credentials');
    return null;
  }

  const now = new Date();
  const datestamp = now.toISOString().slice(0,10).replace(/-/g, '');
  const timestamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const credentialScope = `${datestamp}/auto/storage/goog4_request`;
  const credential = `${email}/${credentialScope}`;

  const canonicalUri = `/${BUCKET}/${objectPath}`;
  const host = 'storage.googleapis.com';

  const queryParams = new URLSearchParams({
    'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
    'X-Goog-Credential': credential,
    'X-Goog-Date': timestamp,
    'X-Goog-Expires': expiresInSeconds.toString(),
    'X-Goog-SignedHeaders': 'host'
  });
  queryParams.sort();

  const canonicalQueryString = queryParams.toString();
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = 'host';

  const canonicalRequest = [
    'GET',
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  const hashedCanonicalRequest = createHash('sha256').update(canonicalRequest).digest('hex');

  const stringToSign = [
    'GOOG4-RSA-SHA256',
    timestamp,
    credentialScope,
    hashedCanonicalRequest
  ].join('\n');

  const sign = createSign('RSA-SHA256');
  sign.update(stringToSign);
  const signature = sign.sign(privateKey, 'hex');

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signature}`;
}

// All proposal files
const proposals = [
  { file: "102 Fleet -Panel-Proposal & Markup-Combined.pdf", path: "proposals/102 Fleet Place/Panels/102 Fleet -Panel-Proposal & Markup-Combined.pdf", amount: "$5,694,000", building: "Combined" },
  { file: "Proposal 102 Fleet - 07.09.2025_Combined.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet - 07.09.2025_Combined.pdf", amount: "$1,577,416", building: "Combined" },
  { file: "Proposal 102 Fleet - 10-30-2025 - Bldg A.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet - 10-30-2025 - Bldg A.pdf", amount: "$305,284", building: "A" },
  { file: "Proposal 102 Fleet - 10-30-2025 - Bldg B.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet - 10-30-2025 - Bldg B.pdf", amount: "$271,788", building: "B" },
  { file: "Proposal 102 Fleet - 10-30-2025 - Bldg C.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet - 10-30-2025 - Bldg C.pdf", amount: "$285,792", building: "C" },
  { file: "Proposal 102 Fleet - 10-30-2025 - Bldg D.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet - 10-30-2025 - Bldg D.pdf", amount: "$350,776", building: "D" },
  { file: "Proposal 102 Fleet - Building A - 05-15-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.06.2025/Proposal 102 Fleet - Building A - 05-15-2025.pdf", amount: "$202,141", building: "A" },
  { file: "Proposal 102 Fleet - Building A - 05-22-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.22.2025/Proposal 102 Fleet - Building A - 05-22-2025.pdf", amount: "$202,141", building: "A" },
  { file: "Proposal 102 Fleet - Building A - 06-18-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/06.18.2025 - Only Bldg. A& B- Pool & Jaccuzzi updated/Proposal 102 Fleet - Building A - 06-18-2025.pdf", amount: "$206,509", building: "A" },
  { file: "Proposal 102 Fleet - Building A_07.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/07.01.2025 - Based on Take off 06-23-2025/Proposal 102 Fleet - Building A_07.01.2025.pdf", amount: "$242,474", building: "A", latest: true },
  { file: "Proposal 102 Fleet - Building B - 05-15-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.06.2025/Proposal 102 Fleet - Building B - 05-15-2025.pdf", amount: "$152,722", building: "B" },
  { file: "Proposal 102 Fleet - Building B - 05-22-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.22.2025/Proposal 102 Fleet - Building B - 05-22-2025.pdf", amount: "$152,722", building: "B" },
  { file: "Proposal 102 Fleet - Building B - 06-18-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/06.18.2025 - Only Bldg. A& B- Pool & Jaccuzzi updated/Proposal 102 Fleet - Building B - 06-18-2025.pdf", amount: "$156,073", building: "B" },
  { file: "Proposal 102 Fleet - Building B_07.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/07.01.2025 - Based on Take off 06-23-2025/Proposal 102 Fleet - Building B_07.01.2025.pdf", amount: "$211,907", building: "B", latest: true },
  { file: "Proposal 102 Fleet - Building C - 05-15-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.06.2025/Proposal 102 Fleet - Building C - 05-15-2025.pdf", amount: "$182,993", building: "C" },
  { file: "Proposal 102 Fleet - Building C - 05-22-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.22.2025/Proposal 102 Fleet - Building C - 05-22-2025.pdf", amount: "$182,993", building: "C", latest: true },
  { file: "Proposal 102 Fleet - Building D - 05-15-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.06.2025/Proposal 102 Fleet - Building D - 05-15-2025.pdf", amount: "$147,446", building: "D" },
  { file: "Proposal 102 Fleet - Building D - 05-22-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.22.2025/Proposal 102 Fleet - Building D - 05-22-2025.pdf", amount: "$147,446", building: "D" },
  { file: "Proposal 102 Fleet - Building D_07.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/07.01.2025 - Based on Take off 06-23-2025/Proposal 102 Fleet - Building D_07.01.2025.pdf", amount: "$254,553", building: "D", latest: true },
  { file: "Proposal 102 Fleet - Building E - 05-15-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.06.2025/Proposal 102 Fleet - Building E - 05-15-2025.pdf", amount: "$137,233", building: "E" },
  { file: "Proposal 102 Fleet - Building E - 05-22-2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/05.22.2025/Proposal 102 Fleet - Building E - 05-22-2025.pdf", amount: "$137,233", building: "E" },
  { file: "Proposal 102 Fleet - Building E_07.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/07.01.2025 - Based on Take off 06-23-2025/Proposal 102 Fleet - Building E_07.01.2025.pdf", amount: "$172,920", building: "E", latest: true },
  { file: "Proposal 102 Fleet ADJ BLDNG FLASHING-08-08-2025 Combined ABCDE.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet ADJ BLDNG FLASHING-08-08-2025 Combined ABCDE.pdf", amount: "$173,339", building: "Combined" },
  { file: "Proposal 102 Fleet ADJ BLDNG FLASHING-10-20-2025 Combined ABCDE.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet ADJ BLDNG FLASHING-10-20-2025 Combined ABCDE.pdf", amount: "$69,290", building: "Combined" },
  { file: "Proposal 102 Fleet ADJ BLDNG FLASHING-10-21-2025 Combined ABCDE.pdf", path: "proposals/102 Fleet Place/Proposal/Proposal 102 Fleet ADJ BLDNG FLASHING-10-21-2025 Combined ABCDE.pdf", amount: "$69,290", building: "Combined" },
  { file: "Proposal_102 Fleet -Building A_04.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/04.01.2025 - Based on Takeoff - 3.18.2025 - Send to G.C/Proposal_102 Fleet -Building A_04.01.2025.pdf", amount: "$164,033", building: "A" },
  { file: "Proposal_102 Fleet -Building B_04.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/04.01.2025 - Based on Takeoff - 3.18.2025 - Send to G.C/Proposal_102 Fleet -Building B_04.01.2025.pdf", amount: "$111,694", building: "B" },
  { file: "Proposal_102 Fleet -Building D_04.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/04.01.2025 - Based on Takeoff - 3.18.2025 - Send to G.C/Proposal_102 Fleet -Building D_04.01.2025.pdf", amount: "$147,466", building: "D" },
  { file: "Proposal_102 Fleet -Building E_04.01.2025.pdf", path: "proposals/102 Fleet Place/Proposal/Archive/04.01.2025 - Based on Takeoff - 3.18.2025 - Send to G.C/Proposal_102 Fleet -Building E_04.01.2025.pdf", amount: "$98,103", building: "E" },
];

// Generate signed URLs for all
console.log('Generating signed URLs (valid for 7 days)...\n');

const urlMap = {};
for (const p of proposals) {
  const url = generateSignedUrl(p.path);
  urlMap[p.file] = url;
  console.log(`✓ ${p.file}`);
}

// Output as JSON for use in HTML generation
writeFileSync('/home/iwagschal/proposal-urls.json', JSON.stringify(urlMap, null, 2));
console.log('\nSaved to /home/iwagschal/proposal-urls.json');

// Also output the proposals with URLs
const proposalsWithUrls = proposals.map(p => ({ ...p, url: urlMap[p.file] }));
writeFileSync('/home/iwagschal/proposals-with-urls.json', JSON.stringify(proposalsWithUrls, null, 2));
console.log('Saved to /home/iwagschal/proposals-with-urls.json');
