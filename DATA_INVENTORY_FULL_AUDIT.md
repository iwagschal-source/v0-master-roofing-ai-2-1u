# Master Roofing Intelligence - Complete Data Inventory Audit

**Generated:** 2026-01-08
**Project:** master-roofing-intelligence
**Purpose:** Complete inventory of all data assets for AI agent system fine-tuning

---

## Executive Summary

| Category | Count | Total Size |
|----------|-------|------------|
| BigQuery Datasets | 10 | ~5GB estimated |
| BigQuery Tables | 141 | 4.7M+ rows |
| GCS Buckets | 6 | ~831 GB |
| VM Local Files | 300+ | ~500 MB |

### Key Data Assets by Volume
1. **raw_takeoffs_azure**: 440,035 line items (primary takeoff data)
2. **project_bundle_lines**: 1,894,462 rows (bundled line items)
3. **job_ledger**: 179,509 transactions (Sage50 accounting)
4. **gmail_messages**: 150,607 emails
5. **email_attachments**: 109,040 attachments
6. **chat_messages**: 102,986 Google Chat messages
7. **extracted_facts_v2**: 68,505 AI-extracted facts

---

## BigQuery Datasets Overview

### Dataset Locations
| Dataset | Location | Purpose |
|---------|----------|---------|
| mr_agent | us-east4 | Agent-facing production tables |
| mr_core | us-east4 | Core dimensional model |
| mr_raw | us-east4 | Raw ingested data |
| mr_staging | us-east4 | ETL staging and temp tables |
| mr_powerbi | us-east4 | Power BI optimized views |
| mr_audit | us-east4 | Audit trails and validation |
| mr_brain | US (multi-region) | Fred Kohn knowledge base |
| mr_internal_v2 | us-east4 | Internal config |
| mr_view_layer | us-east4 | Safe views for agents |
| accounting_sage50_east4 | us-east4 | Sage50 accounting data |

---

## 1. MR_AGENT (Production Agent Tables)

**Purpose:** Primary tables for AI agents to query

### Core Project Tables
| Table | Rows | Purpose | Key Columns |
|-------|------|---------|-------------|
| project_master | 1,502 | Central project registry | project_id (MD5), observed_key, gc_name, award_status, proposal_total, takeoff_total |
| project_llm | 1,529 | LLM-enriched project view | project_id, gc_preferences, scope_included, active_risks, takeoff_revision_count |
| project_lifecycle_summary_v6 | 1,015 | Lifecycle stage tracking | project_id, current_stage, stage_history |
| project_outcome | 776 | Project outcomes/results | project_id, outcome_facts, contract_value |
| project_scope_summary | 832 | Scope details | project_id, scope_included, scope_excluded, ve_items |

### Takeoff & Proposal Tables
| Table | Rows | Purpose |
|-------|------|---------|
| project_takeoff | 56,975 | Matched takeoff data |
| project_takeoff_versioned | 14,473 | Versioned takeoff tracking (V1, V2, V3...) |
| project_takeoff_item_diffs | 4,982 | Item-level changes between versions |
| project_bundle_lines | 1,894,462 | All bundled line items |
| project_best_sheet_v2 | 2,114 | Best sheet per project |
| project_system_bundling | 5,688 | System-level bundling |
| project_true_bundles | 6,925 | True bundle mappings |
| parsed_proposals_v2 | 10,024 | Parsed proposal sections |

### GC (General Contractor) Tables
| Table | Rows | Purpose |
|-------|------|---------|
| gc_master | 279 | Canonical GC list |
| gc_profile | 302 | GC profiles with preferences |
| gc_bundling_preferences | 191 | GC-specific bundling rules |
| gc_contacts_from_emails | 2,037 | GC contacts extracted from emails |
| gc_directory_from_emails | 865 | GC directory entries |

### Facts & Intelligence Tables
| Table | Rows | Purpose |
|-------|------|---------|
| extracted_facts_v2 | 68,505 | AI-extracted facts from emails/chats |
| project_facts_summary_v2 | 913 | Aggregated facts per project |
| project_key_decisions | 814 | Key decisions extracted |
| project_active_risks | 358 | Active risk alerts |
| project_recent_activity | 1,051 | Recent activity log |

### Communication Tables
| Table | Rows | Purpose |
|-------|------|---------|
| email_messages_processed | 69,108 | Processed emails |
| email_attachments | 109,040 | Email attachments |
| project_email_summary_v2 | 1,169 | Email summaries per project |
| chat_facts_gemini_comparison | 252 | Chat fact extraction comparisons |

### Library & Template Tables
| Table | Rows | Purpose |
|-------|------|---------|
| lib_line_items_v3 | 229 | Standard line item library |
| lib_systems | 55 | Roofing system definitions |
| lib_categories | 12 | Line item categories |
| lib_category_mapping | 25 | Category mappings |
| lib_system_line_items | 32 | System-to-line-item mappings |
| lib_system_type_mapping | 21 | System type mappings |
| lib_takeoff_template | 58 | Takeoff template items |
| mr_official_takeoff_template | 63 | Official MR takeoff template |
| assembly_dictionary_v2 | 717 | Assembly definitions |
| bundle_item_mapping | 108 | Bundle item mappings |
| bundle_items_library | 145 | Bundle items library |
| bundle_items_pricing | 92 | Bundle pricing data |

### Status Tables
| Table | Rows | Purpose |
|-------|------|---------|
| active_bids | 45 | Currently active bids |
| active_projects | 380 | Currently active projects |
| closed_projects | 170 | Closed/completed projects |
| lost_bids | 107 | Lost bid records |

### Document Index
| Table | Rows | Purpose |
|-------|------|---------|
| document_index_v1 | 6,451 | Document metadata index |

### Views (mr_agent)
- asana_awards - Asana award data
- asana_bids - Asana bid data
- project_estimate - Project estimate view
- project_summary - Project summary view

---

## 2. MR_CORE (Dimensional Model)

**Purpose:** Core data warehouse dimensional model

| Table | Rows | Purpose |
|-------|------|---------|
| fct_takeoff_line | 440,035 | Fact table: all takeoff line items |
| map_project_container_members_v2 | 442,353 | Project-to-container mapping |
| stg_project_names_all_v2 | 442,353 | Staging: all project name variants |
| stg_project_observations | 22,046 | Project observations |
| dim_container | 9,008 | Container dimension |
| review_container_decisions | 3,098 | Container review decisions |
| review_queue_containers | 3,098 | Review queue |
| stg_gc_names | 2,122 | GC name staging |
| fct_bid | 1,752 | Bid fact table |
| dim_gc_contacts | 1,569 | GC contacts dimension |
| fct_award | 1,058 | Award fact table |
| fact_project_intelligence_v2 | 912 | Project intelligence facts |
| fact_project_lifecycle_v2 | 912 | Lifecycle facts |
| container_ignore_list | 241 | Containers to ignore |
| dim_project_stage1_asana | 62 | Asana project staging |
| project_merge_overrides | 5 | Manual merge overrides |

### Views (mr_core)
- v_asana_awards_with_project_id
- v_asana_bids_with_project_id
- v_proposals_with_project_id
- vw_project_name_clusters

---

## 3. MR_RAW (Raw Ingested Data)

**Purpose:** Raw data directly from source systems

| Table | Rows | Purpose |
|-------|------|---------|
| raw_takeoffs_azure | 440,035 | Raw takeoff data from Azure |
| gmail_messages | 150,607 | Raw Gmail messages |
| chat_messages | 102,986 | Raw Google Chat messages |
| raw_proposals_azure | 14,632 | Raw proposal PDFs metadata |
| raw_takeoffs_missing | 9,600 | Missing takeoff records |
| raw_asana_bids | 1,752 | Raw Asana bid data |
| raw_asana_projects | 1,058 | Raw Asana project data |
| google_users | 71 | Google Workspace users |
| mr_accounting | 0 | (Empty - no schema) |

### Views (mr_raw)
- raw_proposals_azure_named

---

## 4. MR_STAGING (ETL Staging)

**Purpose:** Temporary/staging tables for data processing

### High-Value Staging Tables
| Table | Rows | Purpose | Keep? |
|-------|------|---------|-------|
| gemini_email_facts_normalized | 81,212 | Gemini-extracted email facts | REVIEW |
| project_communications_classified | 78,645 | Classified communications | REVIEW |
| emails_pending_fact_extraction | 74,251 | Pending extraction queue | ARCHIVE |
| gmail_messages_project_matched_v1 | 69,496 | Matched Gmail messages | KEEP |
| asana_task_events | 41,931 | Asana task events | KEEP |
| chat_project_matches | 29,799 | Chat-to-project matches | KEEP |
| chats_pending_fact_extraction | 21,442 | Pending chat extraction | ARCHIVE |

### Asana Processing Pipeline
| Table | Rows | Purpose |
|-------|------|---------|
| asana_2025_step1_raw | 169 | Step 1: Raw Asana |
| asana_2025_step2_normalized | 169 | Step 2: Normalized |
| asana_2025_step3_clean | 169 | Step 3: Cleaned |
| asana_2025_step4_final | 169 | Step 4: Final |
| asana_2025_step5_match | 169 | Step 5: Matched |
| asana_2025_final_matches | 169 | Final matches |
| asana_bids_normalized | 1,752 | Normalized bids |
| asana_task_canonical | 2,765 | Canonical tasks |
| asana_tasks_current | 2,769 | Current task state |

### GC Processing Tables
| Table | Rows | Purpose |
|-------|------|---------|
| gc_contacts_normalized | 2,312 | Normalized GC contacts |
| gc_canonical | 305 | Canonical GC list |
| gc_contacts | 303 | Raw GC contacts |
| gc_companies | 258 | GC companies |
| gc_companies_consolidated | 236 | Consolidated GC companies |
| gc_consolidation | 52 | Consolidation rules |
| gc_manual_mapping | 21 | Manual mappings |
| gc_blacklist | 6 | Blacklisted entries |

### HubSpot Integration
| Table | Rows | Purpose |
|-------|------|---------|
| hubspot_contacts_export | 2,482 | Exported contacts |
| hubspot_contacts_export_v2 | 1,402 | Contacts v2 |
| hubspot_companies_export | 379 | Exported companies |
| hubspot_companies_current | 69 | Current companies |
| hubspot_companies_synced | 58 | Synced companies |

### Extraction & Quality Tables
| Table | Rows | Purpose |
|-------|------|---------|
| gcs_proposal_inventory | 9,887 | GCS proposal inventory |
| facts_contaminated_quarantine | 5,970 | Quarantined facts |
| gemini_chat_facts_normalized | 5,558 | Normalized chat facts |
| new_project_chat_matches | 2,684 | New chat matches |
| chat_messages_tagged | 1,711 | Tagged chat messages |
| claude_code_fuckup | 1,414 | Error log (can delete) |
| gemini_project_id_map | 1,167 | Project ID mapping |
| project_communication_summary | 886 | Communication summaries |

### Draft Status Tables
| Table | Rows | Purpose |
|-------|------|---------|
| active_projects_draft | 441 | Draft active projects |
| closed_projects_draft | 257 | Draft closed projects |
| lost_bids_draft | 166 | Draft lost bids |
| active_bids_draft | 54 | Draft active bids |

### Misc Staging
| Table | Rows | Purpose |
|-------|------|---------|
| missing_proposals | 72 | Missing proposal records |
| claude_gemini_audit | 54 | Model comparison audit |
| extraction_quality_audit | 36 | Extraction quality |
| missing_takeoff_mapping | 28 | Missing takeoff mappings |
| facts_relink_map | 4 | Fact relinking |

---

## 5. MR_POWERBI (Power BI Optimized)

**Purpose:** Optimized tables and views for Power BI dashboards

| Table | Rows | Purpose |
|-------|------|---------|
| fct_job_ledger_v2 | 179,509 | Job ledger facts |
| fct_project_milestones_v2 | 2,828 | Project milestones |
| dim_date | 2,557 | Date dimension |
| dim_phase | 19 | Phase dimension |
| dim_cost_code | 13 | Cost code dimension |
| dim_payment_status | 9 | Payment status dimension |
| dim_journal_type | 7 | Journal type dimension |
| dim_milestone_type | 21 | Milestone type dimension |

### Views (mr_powerbi)
- dim_gc - GC dimension view
- dim_project - Project dimension view
- dim_system - System dimension view
- fct_bundling - Bundling facts view
- fct_sage_invoices - Sage invoice view
- v_dashboard_summary - Dashboard summary view

---

## 6. ACCOUNTING_SAGE50_EAST4

**Purpose:** Sage50 accounting system data

| Table | Rows | Purpose |
|-------|------|---------|
| job_ledger | 179,509 | Complete job ledger transactions |

**Schema:** job_id, phase_id, cost_code_id, gl_acct_id, trx_date, trans_description, jrnl, trans_ref, debit_amt, credit_amt, net_dr_cr, payment_status

### View
- job_ledger_clean - Cleaned job ledger view

---

## 7. MR_AUDIT (Audit & Validation)

**Purpose:** Audit trails and data validation

| Table | Rows | Purpose |
|-------|------|---------|
| canonical_safelist | 30 | Safe canonical IDs |
| extraction_validation_rules | 4 | Validation rules |
| extraction_provenance | 4 | Extraction provenance |
| extraction_validation_results | 0 | Validation results |
| reconciliation_log | 0 | Reconciliation log |

---

## 8. MR_BRAIN (Fred Kohn Knowledge Base)

**Purpose:** Fred Kohn's specialized knowledge extraction

**Location:** US (multi-region)

| Table | Rows | Purpose |
|-------|------|---------|
| fkohn_chats_raw | 32,845 | Fred's raw chat messages |
| fkohn_emails_raw | 20,050 | Fred's raw emails |
| fkohn_facts | 444 | Extracted facts from Fred |
| fkohn_entities | 0 | Entity extraction (empty) |

---

## 9. MR_INTERNAL_V2

**Purpose:** Internal configuration

| Table | Rows | Purpose |
|-------|------|---------|
| user_roles | 21 | User role definitions |

---

## 10. MR_VIEW_LAYER

**Purpose:** Safe views for external access

| View | Purpose |
|------|---------|
| safe_project_identity | Safe project view |
| safe_proposals_identity | Safe proposals view |
| safe_takeoffs_identity | Safe takeoffs view |

---

## GCS Bucket Inventory

### Summary
| Bucket | Size | Files | Purpose |
|--------|------|-------|---------|
| master-roofing-archive-01 | 825.67 GB | 4,967 | Primary document archive |
| mr-agent-docs-us-east4 | 4.76 GB | 3,486+ | Agent-accessible documents |
| master-roofing-raw | 267.94 MB | 6+ dirs | Raw exports and staging |
| mr-extraction-temp | 50.51 MB | 14 | Extraction temp files |
| mr_accounting_sage50 | 16.78 MB | 3 | Sage50 export files |
| master-roofing-exports | 455.76 KB | 1 dir | BQ exports |

### Detailed Bucket Contents

#### gs://master-roofing-archive-01/ (825.67 GB)
**Primary document archive - ALL historical proposals and takeoffs**
- 4,967 files (PDFs, XLSX, DOCX)
- Contains 20+ years of Master Roofing documents
- Example files: proposals, takeoffs, letters, contracts
- **KEEP - Primary source data**

#### gs://mr-agent-docs-us-east4/ (4.76 GB)
**Organized documents for agent access**
```
proposals/          - 1,823 proposal folders (17.7 MB)
takeoffs/           - 1,663 takeoff folders (3.22 MB)
takeoff_extraction_v2/ - Extraction output files
manifests/          - Processing manifests
```
- **KEEP - Agent-facing organized data**

#### gs://master-roofing-raw/ (267.94 MB)
**Raw data exports and staging**
```
extraction_sections_matching
takeoffs_progress.csv
documentation/
exports/
missing_takeoff_projects/
staging/
```
- **REVIEW - May have obsolete staging data**

#### gs://mr-extraction-temp/ (50.51 MB)
**Temporary extraction files**
```
extract_vm.py
manifest_vm1-4.csv
proposal_optional_items.csv
proposal_sections_vm1-4.csv
vm1-4 directories
```
- **CAN ARCHIVE - Temporary processing files**

#### gs://mr_accounting_sage50/ (16.78 MB)
**Sage50 accounting exports**
```
Job Ledger 010120_121825.xlsx
Sage50_with_shipto.csv
SageTransactionsAll.csv
```
- **KEEP - Source accounting data**

#### gs://master-roofing-exports/ (455.76 KB)
**BigQuery exports**
```
bq_exports/
```
- **REVIEW - May be obsolete exports**

---

## Backend VM Local Data

**Location:** mr-dev-box-01 (southamerica-east1-b)
**Home Directory:** /home/iwagschal/

### Directory Summary
| Directory | Size | Purpose |
|-----------|------|---------|
| aeyecorp/ | 406 MB | Backend FastAPI application |
| KO_Session_State/ | 396 KB | Session state documentation |
| MR_PROJECT_HANDOFF/ | 72 KB | Handoff documentation |

### File Type Summary (Home Directory)
| Type | Count | Notes |
|------|-------|-------|
| .csv | 130 | Data exports and staging |
| .py | 84 | Python scripts |
| .sql | 54 | SQL scripts |
| .json | 30 | JSON data files |
| .xlsx | 10 | Excel files |

### Large Files (>10MB)
| File | Size | Purpose |
|------|------|---------|
| parsed_proposals.ndjson | 155 MB | Parsed proposal data |
| section_matching_data.csv | 132 MB | Section matching |
| new_670_matching_data.csv | 73 MB | Matching data |
| gemini_extraction.log | 23 MB | Extraction logs |
| Job Ledger 010120_121825.xlsx | 12 MB | Sage50 ledger |

### Key Python Scripts
- extract_*.py - Various extraction scripts
- match_*.py - Matching algorithms
- batch_parse_proposals.py - Proposal parsing
- generate_claude_md.py - Documentation generator

### Key SQL Scripts
- create_*.sql - Table creation scripts
- fix_*.sql - Data fixes
- match_*.sql - Matching queries

---

## Data Quality Notes

### What's Working Well
1. **Project Identity Resolution**: 1,502 canonical projects in project_master
2. **Takeoff Data**: 440,035 line items with good coverage
3. **Fact Extraction**: 68,505 facts extracted from communications
4. **Email/Chat Coverage**: 150,607 emails + 102,986 chats indexed

### Known Gaps
1. **Missing Proposals**: ~30-35% of proposals fail to download from GCS
2. **Unmatched Projects**: ~25% don't match to takeoffs
3. **Empty Tables**: mr_accounting (no schema), some audit tables empty

### Data Freshness
- Raw data: Continuously updated
- Staging: Various dates (some may be stale)
- Agent tables: Most recently refreshed

---

## Recommendations

### KEEP (Critical Assets)
1. **mr_agent dataset** - All production tables
2. **mr_core dataset** - Dimensional model
3. **mr_raw dataset** - Source data
4. **accounting_sage50_east4** - Accounting data
5. **gs://master-roofing-archive-01/** - Document archive
6. **gs://mr-agent-docs-us-east4/** - Agent documents

### ARCHIVE (Move to Cold Storage)
1. **mr_staging** intermediate tables:
   - asana_2025_step1-5 (keep final_matches only)
   - emails_pending_fact_extraction (processed)
   - chats_pending_fact_extraction (processed)
2. **gs://mr-extraction-temp/** - All temp files
3. **VM large files** that are duplicated in BigQuery

### DELETE (Clutter)
1. **mr_staging.claude_code_fuckup** - Error log table
2. Various .log files on VM
3. Duplicate .csv files on VM (data now in BigQuery)
4. Old extraction scripts that are superseded

### CONSOLIDATE
1. **GC tables**: gc_master, gc_profile, gc_canonical could be merged
2. **Staging draft tables**: Merge into production after validation
3. **Fact tables**: Consider consolidating fact extraction results

---

## Schema Reference (Key Tables)

### project_master
```
project_id, observed_key, gc_name, gc_email, gc_contact, award_status,
asana_assignee, rfp_date, proposal_total, takeoff_total, total_sf,
variance_pct, primary_r_value, primary_insulation, proposal_versions,
proposal_sections, takeoff_lines, matched_sections, specs_extracted,
email_count, chat_count, last_comm_date, fact_count, has_proposal,
has_takeoff, has_matches, has_specs, has_asana, asana_task_gid,
bid_status, scope, is_new_from_asana, matched_sheet_name,
match_confidence, match_variance, best_proposal_file, match_status,
match_source, merged_from_count, created_at, sage_address,
sage_billed_amount, sage_match_confidence, has_ledger_data,
ledger_transaction_count, ledger_total_debits, ledger_total_credits
```

### project_llm
```
project_id, project_name, gc_name, gc_contact, award_status, bid_status,
match_status, proposal_total, takeoff_total, sage_billed_amount,
variance_pct, total_sf, primary_r_value, primary_insulation,
has_proposal, has_takeoff, has_matches, has_asana, has_ledger_data,
proposal_versions, email_count, chat_count, fact_count, takeoff_lines,
rfp_date, last_comm_date, gc_preferences, gc_tribal_knowledge,
gc_negotiation_patterns, gc_process_insights, scope_included,
scope_excluded, scope_ve_items, active_risks, risk_count,
recent_activity, last_activity_date, key_decisions, decision_count,
outcome_facts, contract_value_mentioned, revision_count,
latest_revision_summary, latest_change_category, total_revision_delta,
takeoff_revision_count, total_items_changed, total_items_added,
total_items_removed, total_rate_changes, takeoff_avg_rate_change,
takeoff_total_cost_delta, top_changed_items, segments_tracked, refreshed_at
```

### extracted_facts_v2
```
fact_id, project_id, project_name, source_thread_id, source_message_id,
fact_date, fact_type, fact_summary, source_quote, is_inferred,
confidence_score, extracted_at, source_type
```

### fct_takeoff_line (mr_core)
```
line_item_id, blob_path, file_name, workbook_name, sheet_name,
project_folder_name, project_name_raw, location_raw, job_number_raw,
revision_date_raw, scope_raw, areas_json_raw, quality_reason_raw,
block_header_row, block_label, unit_cost, total_measurements,
total_cost, row_index, quality_score, revision_date, loaded_at
```

### job_ledger (accounting)
```
unnamed_0, job_id, phase_id, cost_code_id, gl_acct_id, trx_date,
trans_description, jrnl, trans_ref, debit_amt, credit_amt,
net_dr_cr, payment_status
```

---

## Next Steps for AI Agent Fine-Tuning

1. **Consolidate project_master + project_llm** as the primary project view
2. **Create unified facts view** combining extracted_facts_v2, project_key_decisions, project_active_risks
3. **Build training datasets** from:
   - Successful project outcomes (project_outcome)
   - GC preferences and patterns (gc_profile, gc_bundling_preferences)
   - Historical decision patterns (project_key_decisions)
4. **Clean up staging** to reduce noise in data exploration
5. **Document API endpoints** for each key table

---

*Generated by Claude Code Audit - 2026-01-08*
