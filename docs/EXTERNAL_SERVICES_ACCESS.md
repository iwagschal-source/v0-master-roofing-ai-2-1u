# External Services Access

## Google Sheets

```bash
node scripts/search-sheets.mjs "sheet name here"
```

If sheet not found, tell user: "Share with `rfp@masterroofingus.com`"

---

## HubSpot

```bash
node scripts/hubspot-to-sheet.mjs
```

Reads MR_ASANA pipeline deals. Token: `pat-na1-932c3653-8534-408f-973a-46e24b716514`

---

## Asana

```bash
node scripts/asana-api.mjs projects          # List projects
node scripts/asana-api.mjs tasks             # List Bids tasks
node scripts/asana-api.mjs task <gid>        # Get task details
node scripts/asana-api.mjs search "query"    # Search by name
```

PAT: `2/1210265196196335/1212775865924391:725275789145e9e8e1946d3737a9e8b9`
Workspace: `510750453879446`

**Project GIDs:**
| Project | GID |
|---------|-----|
| Bids | 1160614300237021 |
| Projects | 916647532526133 |
| Billing | 916647532526131 |
| Lease | 1199602992929879 |
| Private Customers | 1208148163977293 |

---

## BigQuery

```bash
node scripts/check-asana.mjs   # Example BQ query
```

Uses service account key at `/home/iwagschal/aeyecorp/workspace-ingest.json`

---

## Why No Login?

| Service | Auth Method |
|---------|-------------|
| Google Sheets | Service account impersonates `rfp@masterroofingus.com` |
| HubSpot | Private app token |
| Asana | Personal Access Token |
| BigQuery | Service account key file |

All credentials pre-configured. Just run the scripts.
