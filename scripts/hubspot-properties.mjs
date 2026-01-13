#!/usr/bin/env node
/**
 * List all HubSpot deal properties
 */

const HUBSPOT_TOKEN = 'pat-na1-932c3653-8534-408f-973a-46e24b716514'

async function main() {
  const response = await fetch('https://api.hubapi.com/crm/v3/properties/deals', {
    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
  })

  const data = await response.json()
  const props = data.results.sort((a, b) => a.label.localeCompare(b.label))

  console.log('=== HubSpot Deal/Job Properties ===\n')
  console.log('Total properties:', props.length)
  console.log('')

  // Group by group name
  const groups = {}
  props.forEach(p => {
    const group = p.groupName || 'ungrouped'
    if (!groups[group]) groups[group] = []
    groups[group].push(p)
  })

  // Print custom properties first (most relevant)
  const customGroups = Object.keys(groups).filter(g =>
    !g.startsWith('hs_') && g !== 'dealinformation' && g !== 'deal_activity'
  )

  if (customGroups.length > 0) {
    console.log('========== CUSTOM PROPERTIES ==========\n')
    customGroups.forEach(groupName => {
      console.log(`--- ${groupName.toUpperCase()} ---`)
      groups[groupName].forEach(p => {
        console.log(`  ${p.name}`)
        console.log(`    Label: ${p.label}`)
        console.log(`    Type: ${p.type}`)
        if (p.description) console.log(`    Desc: ${p.description}`)
        console.log('')
      })
    })
  }

  // Print standard deal properties
  console.log('========== STANDARD DEAL PROPERTIES ==========\n')
  const standardGroups = ['dealinformation', 'deal_activity']
  standardGroups.forEach(groupName => {
    if (groups[groupName]) {
      console.log(`--- ${groupName.toUpperCase()} ---`)
      groups[groupName].forEach(p => {
        console.log(`  ${p.name} | ${p.label} | ${p.type}`)
      })
      console.log('')
    }
  })

  // Look for RFP-related properties
  console.log('========== RFP-RELATED PROPERTIES ==========\n')
  const rfpProps = props.filter(p =>
    p.name.toLowerCase().includes('rfp') ||
    p.label.toLowerCase().includes('rfp') ||
    p.name.toLowerCase().includes('date') ||
    p.name.toLowerCase().includes('due') ||
    p.name.toLowerCase().includes('bid')
  )

  if (rfpProps.length > 0) {
    rfpProps.forEach(p => {
      console.log(`  ${p.name}`)
      console.log(`    Label: ${p.label}`)
      console.log(`    Type: ${p.type}`)
      console.log('')
    })
  } else {
    console.log('  No RFP-specific properties found')
  }
}

main().catch(console.error)
