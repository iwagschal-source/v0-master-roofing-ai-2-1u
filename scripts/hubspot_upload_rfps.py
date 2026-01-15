#!/usr/bin/env python3
"""
Upload missing RFPs to HubSpot as Deals in "Not in Asana" pipeline
"""

import requests
import json
import os

HUBSPOT_TOKEN = os.environ.get("HUBSPOT_TOKEN", "")
HEADERS = {
    "Authorization": f"Bearer {HUBSPOT_TOKEN}",
    "Content-Type": "application/json"
}
BASE_URL = "https://api.hubapi.com"

# The 29 RFPs from the spreadsheet
RFPS = [
    {"project": "515 W 43 ST", "gc": "City Builders", "gc_email": "mhargudkar@citybuilders.nyc", "date": "2026-01-06", "contact": "lathuru"},
    {"project": "341 Lenox", "gc": "Rogers Developers", "gc_email": "bryan@rogersdevelopers.com", "date": "2025-12-30", "contact": "fkohn"},
    {"project": "7 Hastings", "gc": "LY Contractor", "gc_email": "Nancy@lycontractor.com", "date": "2025-12-25", "contact": "stempler"},
    {"project": "1150 6th Ave Hotel", "gc": "Countywide Builders", "gc_email": "sjain@countywidebuildersny.com", "date": "2025-12-24", "contact": "external"},
    {"project": "6 Summit", "gc": "Meav Developers", "gc_email": "Avi@meavdevelopers.com", "date": "2025-12-24", "contact": "stempler"},
    {"project": "One&Only Hudson Valley", "gc": "Consigli", "gc_email": "lvandergeest@consigli.com", "date": "2025-12-22", "contact": "tpolak"},
    {"project": "3 Willow Ct", "gc": "Meav Developers", "gc_email": "mendy@meavdevelopers.com", "date": "2025-12-19", "contact": "lweisz"},
    {"project": "529 West Central Ave", "gc": "SD Corp", "gc_email": "shloimy@sdcorpny.com", "date": "2025-12-18", "contact": "tpolak"},
    {"project": "62 Veronica Pl", "gc": "Joseph Hametz", "gc_email": "jhametz@gmail.com", "date": "2025-12-18", "contact": "Ahirsch"},
    {"project": "3 Willow Ct (follow-up)", "gc": "Meav Developers", "gc_email": "Avi@meavdevelopers.com", "date": "2025-12-17", "contact": "tpolak"},
    {"project": "Valley Chabad - 530 Chestnut Ridge", "gc": "Landmark", "gc_email": "estimating@landmarknyc.net", "date": "2025-12-12", "contact": "external"},
    {"project": "3257 Westchester Ave", "gc": "SD Builders", "gc_email": "team@buildingconnected.com", "date": "2025-12-10", "contact": "lweisz"},
    {"project": "Lofts at Princeton - Bldg 3000", "gc": "Self Level", "gc_email": "mendy@selflevel.net", "date": "2025-12-10", "contact": "Ahirsch"},
    {"project": "16 Myrtle Avenue", "gc": "Landmark", "gc_email": "estimating@landmarknyc.net", "date": "2025-12-09", "contact": "stempler"},
    {"project": "38-60 Berwyn", "gc": "YNH NJ", "gc_email": "efrat@ynhnj.com", "date": "2025-12-05", "contact": "stempler"},
    {"project": "38 State Street", "gc": "Countywide Builders", "gc_email": "cpatel@countywidebuildersny.com", "date": "2025-12-04", "contact": "fkohn"},
    {"project": "9 Marcus", "gc": "LY Contractor", "gc_email": "Nancy@lycontractor.com", "date": "2025-11-27", "contact": "lweisz"},
    {"project": "OHR Roofing", "gc": "Ray Construction", "gc_email": "Shayna@rayconstruction.net", "date": "2025-11-25", "contact": "stempler"},
    {"project": "Adidas Paramus NJ", "gc": "Lakeview Construction", "gc_email": "projectbids.lv@lakeviewestimating.com", "date": "2025-11-21", "contact": "ckahana"},
    {"project": "28 Manis", "gc": "Pomona Enterprises", "gc_email": "sam@pomonaenterprises.com", "date": "2025-11-21", "contact": "lweisz"},
    {"project": "126 Market St Newark", "gc": "HR Builders", "gc_email": "elliot@hrbuildersnj.com", "date": "2025-11-12", "contact": "stempler"},
    {"project": "Weiss Properties Delran", "gc": "Sweetwater Corp", "gc_email": "dplevy@sweetwatercorp.com", "date": "2025-11-03", "contact": "fkohn"},
    {"project": "16 Amsterdam", "gc": "LY Contractor", "gc_email": "Nancy@lycontractor.com", "date": "2025-10-29", "contact": "tpolak"},
    {"project": "1 Eros Drive", "gc": "Chai Developers", "gc_email": "Yossi@chaidevelopers.com", "date": "2025-10-29", "contact": "tpolak"},
    {"project": "Town Square Mall Upgrades", "gc": "Shimmy's Enterprise", "gc_email": "office@shimmysenterprise.com", "date": "2025-10-28", "contact": "tpolak"},
    {"project": "14 Valley Dr Thiels", "gc": "Cornerstone Builders", "gc_email": "mendy@cornerstonebld.com", "date": "2025-10-27", "contact": "tpolak"},
    {"project": "200 Market Street", "gc": "Prestige NY", "gc_email": "virginia@prestigenyllc.com", "date": "2025-10-22", "contact": "fkohn"},
    {"project": "Chabad @ Rowan University", "gc": "Benchmark Builders", "gc_email": "mwoodrow@benchmarkbldr.com", "date": "2025-10-20", "contact": "mberger"},
    {"project": "Shadowbrook Self Storage", "gc": "Claddco", "gc_email": "georgiatheodorou@claddco.com", "date": "2025-10-07", "contact": "fkohn"},
]


def get_pipelines():
    """Get existing deal pipelines"""
    url = f"{BASE_URL}/crm/v3/pipelines/deals"
    resp = requests.get(url, headers=HEADERS)
    resp.raise_for_status()
    return resp.json()["results"]


def create_pipeline(name, stages):
    """Create a new deal pipeline"""
    url = f"{BASE_URL}/crm/v3/pipelines/deals"
    data = {
        "label": name,
        "displayOrder": 10,
        "stages": stages
    }
    resp = requests.post(url, headers=HEADERS, json=data)
    resp.raise_for_status()
    return resp.json()


def create_deal(properties, pipeline_id, stage_id):
    """Create a deal in HubSpot"""
    url = f"{BASE_URL}/crm/v3/objects/deals"
    data = {
        "properties": {
            **properties,
            "pipeline": pipeline_id,
            "dealstage": stage_id
        }
    }
    resp = requests.post(url, headers=HEADERS, json=data)
    resp.raise_for_status()
    return resp.json()


def main():
    print("=" * 60)
    print("HubSpot RFP Upload - 'Not in Asana' Pipeline")
    print("=" * 60)

    if not HUBSPOT_TOKEN:
        print("ERROR: HUBSPOT_TOKEN environment variable not set")
        print("Run: export HUBSPOT_TOKEN='your-token-here'")
        return

    # 1. Check for existing "Not in Asana" pipeline
    print("\n1. Checking existing pipelines...")
    pipelines = get_pipelines()

    pipeline_id = None
    stage_id = None

    for p in pipelines:
        print(f"   - {p['label']} (id: {p['id']})")
        if p['label'].lower() == "not in asana":
            pipeline_id = p['id']
            stage_id = p['stages'][0]['id'] if p['stages'] else None

    # 2. Create pipeline if not exists
    if not pipeline_id:
        print("\n2. Creating 'Not in Asana' pipeline...")
        stages = [
            {"label": "RFP Received", "displayOrder": 0},
            {"label": "Needs Review", "displayOrder": 1},
            {"label": "Added to Asana", "displayOrder": 2},
            {"label": "Declined", "displayOrder": 3},
        ]
        pipeline = create_pipeline("Not in Asana", stages)
        pipeline_id = pipeline['id']
        stage_id = pipeline['stages'][0]['id']
        print(f"   Created pipeline: {pipeline_id}")
    else:
        print(f"\n2. Using existing pipeline: {pipeline_id}")

    # 3. Create deals
    print(f"\n3. Creating {len(RFPS)} deals...")
    created = 0
    errors = 0

    for rfp in RFPS:
        try:
            properties = {
                "dealname": f"{rfp['project']} - {rfp['gc']}",
                "description": f"RFP from {rfp['gc']} ({rfp['gc_email']})\nMaster Roofing contact: {rfp['contact']}@masterroofingus.com\nReceived: {rfp['date']}",
                "closedate": rfp['date'],
            }

            deal = create_deal(properties, pipeline_id, stage_id)
            print(f"   ✓ {rfp['project']}")
            created += 1

        except Exception as e:
            print(f"   ✗ {rfp['project']}: {e}")
            errors += 1

    # Summary
    print("\n" + "=" * 60)
    print(f"DONE: {created} deals created, {errors} errors")
    print("=" * 60)


if __name__ == "__main__":
    main()
