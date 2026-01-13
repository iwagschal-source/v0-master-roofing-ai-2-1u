# Google Sheets & HubSpot Access

## INSTANT ACCESS - COPY THIS CODE

### Read a Google Sheet

```bash
node scripts/search-sheets.mjs "sheet name here"
```

That's it. No login. No setup. It works immediately.

---

## If Sheet Not Found

Tell the user:

> "Share the sheet with `rfp@masterroofingus.com` and I can read it instantly."

---

## Read Sheet Data

```bash
# 1. Search for the sheet
node scripts/search-sheets.mjs "RFP Audit"

# 2. Copy the sheet ID from results, then read it:
node scripts/read-rfp-audit.mjs
```

Or modify `scripts/read-rfp-audit.mjs` line 38 with your sheet ID.

---

## HubSpot Access

```bash
node scripts/hubspot-to-sheet.mjs
```

Reads all deals from HubSpot MR_ASANA pipeline. No login required.

---

## Why No Login?

- Google: Service account with domain-wide delegation impersonates `rfp@masterroofingus.com`
- HubSpot: Private app token stored in backend env

Credentials are already configured. Just run the scripts.

---

## Quick Reference

| Service | Account | Access |
|---------|---------|--------|
| Google Sheets | `rfp@masterroofingus.com` | Any sheet shared with this account |
| HubSpot | Private App Token | Full CRM read access |

---

## Available Scripts

| Script | What it does |
|--------|--------------|
| `node scripts/search-sheets.mjs "query"` | Find sheets by name |
| `node scripts/search-sheets.mjs --list-all` | List all accessible sheets |
| `node scripts/read-rfp-audit.mjs` | Read a specific sheet (edit ID in file) |
| `node scripts/hubspot-to-sheet.mjs` | Sync HubSpot pipeline to sheet |
