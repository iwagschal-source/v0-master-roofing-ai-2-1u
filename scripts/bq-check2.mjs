#!/usr/bin/env node
import { createSign } from 'crypto'
import dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env.local') })

async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = { iss: email, scope: 'https://www.googleapis.com/auth/bigquery', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url')
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signatureInput = `${encodedHeader}.${encodedPayload}`
  const sign = createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(privateKey, 'base64url')
  const jwt = `${signatureInput}.${signature}`
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  return (await tokenResponse.json()).access_token
}

async function runQuery(token, sql) {
  const resp = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/master-roofing-intelligence/queries', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql, useLegacySql: false, timeoutMs: 60000 })
  })
  return resp.json()
}

const SHEET_IDS = ["b8d49366c38e0a3425e014581bb4496d","09ce8ab81bd67312dd798905c82362f1","6a67ae5d3b6fccdc8d5b8449a6c7315b","59caaf26f9c1b1792bfd1c6556e9f459","7f028801c852e111ca0c42d43d1129b5","b4374f6cea368c71557e36db3cc5d47c","9a909f2d04e1d16298f57732efab7208","4f34b76a9a58eb7b1870111c8ad0c62d","050e82ea325b1159bbc42878c6f4868c","0d4da9803871c370f080587bad19aa9f","b01c9f28d8acb8f17c8fdcf2003c1ce5","0f802bd8dd34f150bfee8798e165bfa0","3c5c908d88906f68b362e6a327cfa135","03b3798570935143345ee8c0fab4af01","083b36d3756e1a1e8d3dd464a3f125ed","6eb2b457c2ed1ae463e78b0e469c2163","a0d351a864f6377e926e210f313203d2","9275fa7bb48e5f76f18d0f872631485d","b93aa01e780b7c4840ae1682dace330b","6267cd7a1cc37be59b278b7d23892520","91ccfeac0fc49576056cf558c512eff7","d1c09c27fe77333e0c09836ca844f15f","19a5f1e18c00de9d40094a6b5df6d117","3d2b7d0247cc70160aa155b9064b5260","72ddf1263f0ef825278be26c9b85838d","7432df4348a82b4f398335992907e057","7578b97ade637e25992255ee068092ae","6268f11e2b3fbb73bbb589ef295553d1","a9666a51c9e012c1d160524d0bf6ce1f","06c2e973f47023ed6c606b7e36f8348b","982c6266d0999ca5169630f7e14873d9","419ffd0fab98474e4c7931d7fc95e72c","16a8d9a4d3e7eef188d015bf2cf2622f","8570247d57f9f0d489d7a83b81546a6f","11bf2d7fa402dde9b074b51446f0dbf9","d7068b2564045993ea7ebc47abcc8ebc","73ebc481fe7ff05f8d0e97e8e9fc958e","555305f286dec3686be51af26f66e983","5e85f9050230eaaf4fb971dd771e70ed","d69f08328a466b60ff44853a836a9392","fda5ee73601c6c81a614fb36c68b9ed9","f94041312185e66f792ee0124020ac1a","e022ff095a4b7cd05650715127e9cc89","d4dd3757d1ea35f81acd29020253fdb5","c807f3d037c750308007acf62b5bc031","34bc8af88857636d66aedde7032a8dc2","8c78c22ebb91459fdc606d230ca4211b","e5fe65f6a636faa8cb79c98e2085fbcc","9219b0da347e04e4e99308de29322065","597c40741cddeec4fc761cfb082c11be","8f910c74f1c5002b655e91a13e437ba0","4b13ae4273c95a4c305da8a082875a8b","4ae973efc2aa71a3100fd1e92cd7c7a6","a788cbde405de0e7a9a91afc8a17a5c2","3c57f8ef11c106bc9c73641159871cb7","ee05fdc1cda5145e1c0fa3b6af5545c4","a108d9973d789fbb44eb1342cfecf7fb","051f3ff2d463aaf3e74dc3989a6fa781","5504b3e50d31eab3e49dc0c2c49f1b95","2e89e6ff40ed26d6caf7c6e27a049b50","19d2d5d8925ec3ac18c555cbd3d04eab","db6b19ff100b7552cd0e9e43874226e5","f94d879d7292bd1afb071efa31aa1508","cd66768641b6afd8c1fb0b20c9589ef2","ad7d4cc41fdcdc4f0fbe8f508befed12","6c592079184df92b6aadf0f79899baf2","28f02e967de003a45b124aeb6efa6a34","e3bdcdf1cf6092538be2f1a961c5cdc0","bd8f1985fca7e930b035a2748445dfd3","bd9a02554e887b2b8128334eccb09555","17cd78b8ea19eacaf84d1fb453f3d916","0ef0577c3b77455932565a927faf276a","d2563e04936e94544f4ec02094d0acaa","bcfef44f0f6239c7e4afabfce5241452","a0344f999842ba59f4581eb5c9d61b73","74a325d1a2083afdad86aa88c1c2828f","d0486d84dffbb02b79b738008e3c36f5","e40ce8e1c1b68c1ebcea509703f1a09c","fdd459d896e17d9454e77a5297ddb54a","3697577f68b8981c101dbda6b9dfd942","0a3909cdf9b1093da9163d86f9d084b6","757f8f4d716dc5e1d635ae49380e7d3f","0a4406dd9bd28f917b732f41e025c868","d893e1da7320a0368f5cc61588c6e4d8","17899e838271d6b69a1b121fc2aa0059","b1f744becf2e0656f40629dd72b9707c","8c274f25099b26cccb65cabcf8d9de94","5563dde710ebd842216979b42dd31783","3a1371533c0a0b420cb0197e17694632","385a6aeafbffc0f3a132056b0e3dcba1","003c6c7df66fb0a805423080932c1124","c3611a56d445332328226079ca78d0c8","b18570546b1e054998a6a6381deef720","f462793fefbd912a4f1acab98d1112e0","5f8003bf45d212002b0bae54c00f4162","2ad0776e54a92474061644a22d081fcf","20d9ee7c304431ef1819d21e9f4d26ac","20ba2549aca48ee646d50733fe39f5d0","047092d1950003b56617639c1fb69725","0bc1571b93f3ee47b2e25830f8645803"].filter(x=>x)

async function main() {
  const token = await getAccessToken()
  
  // List all datasets
  console.log('=== All datasets ===')
  const dsResp = await fetch('https://bigquery.googleapis.com/bigquery/v2/projects/master-roofing-intelligence/datasets', {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  const ds = await dsResp.json()
  ds.datasets?.forEach(d => console.log('  -', d.datasetReference.datasetId))

  // Check dim_project in mr_core
  console.log('\n=== Checking mr_core.dim_project* tables ===')
  const dimTables = await runQuery(token, `
    SELECT table_name FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.TABLES\`
    WHERE table_name LIKE 'dim_project%'
  `)
  dimTables.rows?.forEach(r => console.log('  -', r.f[0].v))
  
  // Check dim_project_v2 schema
  console.log('\n=== dim_project_v2 columns ===')
  const cols = await runQuery(token, `
    SELECT column_name FROM \`master-roofing-intelligence.mr_core.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = 'dim_project_v2'
  `)
  if (cols.rows) {
    console.log(cols.rows.map(r => r.f[0].v).join(', '))
  }
  
  // Count total in dim_project_v2
  console.log('\n=== dim_project_v2 count ===')
  const cnt = await runQuery(token, `SELECT COUNT(*) as c FROM \`master-roofing-intelligence.mr_core.dim_project_v2\``)
  console.log('Total rows:', cnt.rows?.[0]?.f?.[0]?.v)
  
  // Match sheet IDs
  console.log('\n=== Matching sheet IDs ===')
  const idsStr = SHEET_IDS.slice(0,100).map(id => `'${id}'`).join(',')
  const match = await runQuery(token, `
    SELECT COUNT(*) as matched
    FROM \`master-roofing-intelligence.mr_core.dim_project_v2\`
    WHERE project_id IN (${idsStr})
  `)
  console.log('First 100 sheet IDs matched:', match.rows?.[0]?.f?.[0]?.v)
}

main().catch(console.error)
