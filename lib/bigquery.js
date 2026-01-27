/**
 * BigQuery Client Library
 * Connects to master-roofing-intelligence project
 */

import { BigQuery } from '@google-cloud/bigquery'

// Build credentials from environment variables (for Vercel/serverless)
function getCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  console.log('[BigQuery] Credentials check:', {
    hasEmail: !!email,
    hasPrivateKey: !!privateKey,
    emailPrefix: email ? email.substring(0, 20) + '...' : 'MISSING'
  })

  if (email && privateKey) {
    return {
      client_email: email,
      private_key: privateKey.replace(/\\n/g, '\n'),
    }
  }
  console.error('[BigQuery] MISSING CREDENTIALS - email:', !!email, 'privateKey:', !!privateKey)
  return undefined
}

// Initialize BigQuery client
// Uses explicit credentials on Vercel, or default credentials locally
const credentials = getCredentials()
const bigquery = new BigQuery({
  projectId: 'master-roofing-intelligence',
  ...(credentials && { credentials }),
})

/**
 * Execute a BigQuery query
 * @param {string} query - SQL query
 * @param {object} params - Query parameters
 * @param {object} options - Additional options (location, etc.)
 * @returns {Promise<Array>} - Query results
 */
export async function runQuery(query, params = {}, options = {}) {
  // Auto-detect location based on dataset in query
  // ko_estimating, ko_audit = US
  // mr_staging, accounting_* = us-east4
  let location = options.location
  if (!location) {
    if (query.includes('ko_estimating') || query.includes('ko_audit')) {
      location = 'US'
    } else {
      location = 'us-east4'
    }
  }

  const queryOptions = {
    query,
    params,
    location,
  }

  console.log('[BigQuery] Running query:', {
    location,
    queryPreview: query.substring(0, 100) + '...',
    hasCredentials: !!credentials
  })

  try {
    const [rows] = await bigquery.query(queryOptions)
    console.log('[BigQuery] Query success, rows:', rows?.length || 0)
    return rows
  } catch (err) {
    console.error('[BigQuery] Query FAILED:', err.message)
    throw err
  }
}

/**
 * Get average rates for scope items from historical takeoffs
 * Queries takeoff_lines_enriched for unit_cost averages by description
 *
 * @param {string} gcName - Optional GC name to filter by (for GC-specific pricing)
 * @returns {Promise<Object>} - Map of scope item keywords to average rates
 */
export async function getAverageRates(gcName = null) {
  // Query to get average unit costs grouped by normalized description
  // Uses takeoff_lines_enriched which has 700k+ historical line items
  const query = `
    WITH rate_data AS (
      SELECT
        LOWER(TRIM(Description)) as description_lower,
        unit_cost,
        total_measurements,
        total_cost
      FROM \`master-roofing-intelligence.mr_staging.takeoff_lines_enriched\`
      WHERE unit_cost > 0
        AND unit_cost < 10000  -- Filter outliers
        AND total_measurements > 0
        ${gcName ? "AND gc_name = @gcName" : ""}
    ),
    aggregated AS (
      SELECT
        description_lower,
        AVG(unit_cost) as avg_rate,
        COUNT(*) as sample_count,
        MIN(unit_cost) as min_rate,
        MAX(unit_cost) as max_rate
      FROM rate_data
      GROUP BY description_lower
      HAVING COUNT(*) >= 3  -- Only use items with 3+ samples
    )
    SELECT * FROM aggregated
    ORDER BY sample_count DESC
    LIMIT 500
  `

  try {
    const rows = await runQuery(query, gcName ? { gcName } : {})

    // Convert to lookup map by keywords
    const rateMap = {}
    for (const row of rows) {
      const desc = row.description_lower
      rateMap[desc] = {
        avgRate: Math.round(row.avg_rate * 100) / 100,
        sampleCount: row.sample_count,
        minRate: Math.round(row.min_rate * 100) / 100,
        maxRate: Math.round(row.max_rate * 100) / 100,
      }
    }
    return rateMap
  } catch (error) {
    console.error('BigQuery rate lookup error:', error)
    return {}
  }
}

/**
 * Get rate for a specific scope item
 * Searches historical data for matching descriptions
 *
 * @param {string} itemName - Scope item name/description
 * @param {string} unit - Unit of measure (SF, LF, EA)
 * @param {string} gcName - Optional GC name for GC-specific pricing
 * @returns {Promise<Object|null>} - Rate info or null if not found
 */
export async function getRateForItem(itemName, unit = null, gcName = null) {
  const query = `
    SELECT
      AVG(unit_cost) as avg_rate,
      COUNT(*) as sample_count,
      MIN(unit_cost) as min_rate,
      MAX(unit_cost) as max_rate,
      APPROX_QUANTILES(unit_cost, 2)[OFFSET(1)] as median_rate
    FROM \`master-roofing-intelligence.mr_staging.takeoff_lines_enriched\`
    WHERE unit_cost > 0
      AND unit_cost < 10000
      AND total_measurements > 0
      AND LOWER(Description) LIKE @searchPattern
      ${unit ? "AND UPPER(Unit) = @unit" : ""}
      ${gcName ? "AND gc_name = @gcName" : ""}
  `

  const searchPattern = `%${itemName.toLowerCase()}%`
  const params = { searchPattern }
  if (unit) params.unit = unit.toUpperCase()
  if (gcName) params.gcName = gcName

  try {
    const rows = await runQuery(query, params)
    if (rows.length > 0 && rows[0].sample_count >= 2) {
      return {
        avgRate: Math.round(rows[0].avg_rate * 100) / 100,
        medianRate: Math.round(rows[0].median_rate * 100) / 100,
        minRate: Math.round(rows[0].min_rate * 100) / 100,
        maxRate: Math.round(rows[0].max_rate * 100) / 100,
        sampleCount: rows[0].sample_count,
      }
    }
    return null
  } catch (error) {
    console.error('BigQuery item rate lookup error:', error)
    return null
  }
}

export default bigquery
