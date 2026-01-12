# Motzi Shabbos - Resume Local Dev Setup

## Where We Left Off

We were setting up **Cursor + Remote-SSH** to connect to the GCP VM from your Windows machine.

### What's Working
- gcloud CLI installed on Windows
- SSH config created at `C:\Users\iwagschal\.ssh\config`
- New SSH key generated at `C:\Users\iwagschal\.ssh\vm_key`
- Dev server was running on VM port 3002 (may need restart)

### What Was Stuck
Running this command was hanging on "Waiting for SSH key to propagate":
```
gcloud compute ssh mr-dev-box-01 --ssh-key-file="$env:USERPROFILE\.ssh\vm_key"
```

## When You Return - Try These Steps

### Step 1: Cancel the stuck command
If it's still running, press `Ctrl+C` in PowerShell to cancel.

### Step 2: Try a fresh gcloud SSH
```powershell
gcloud compute ssh mr-dev-box-01 --zone=southamerica-east1-b
```

### Step 3: If gcloud works, manually add your key on the VM
Once connected to the VM:
```bash
# Read your public key and add it
cat >> ~/.ssh/authorized_keys << 'EOF'
(paste your vm_key.pub contents here - one line)
EOF
```

To get the key, in PowerShell run:
```powershell
type "$env:USERPROFILE\.ssh\vm_key.pub"
```

### Step 4: Test direct SSH from PowerShell
```powershell
ssh mr-dev-box-01.southamerica-east1-b.master-roofing-intelligence
```

### Step 5: If SSH works, try Cursor
1. Open Cursor
2. Ctrl+Shift+P → "Remote-SSH: Connect to Host..."
3. Select `mr-dev-box-01.southamerica-east1-b.master-roofing-intelligence`

### Step 6: Start the dev server (if not running)
Once connected via Cursor, open terminal (Ctrl+`) and run:
```bash
cd /home/iwagschal/v0-master-roofing-ai-2-1u
npm run dev -- -p 3002
```

### Step 7: Port forwarding
In Cursor, press Ctrl+Shift+P → "Forward a Port" → enter `3002`
Then open browser to: http://localhost:3002

---

## Alternative: Simpler Approach
If SSH keeps failing, try this in your SSH config (`C:\Users\iwagschal\.ssh\config`):

```
Host mr-dev-box-01.southamerica-east1-b.master-roofing-intelligence
    HostName 34.95.128.208
    User IWagschal
    ProxyCommand gcloud compute start-iap-tunnel mr-dev-box-01 22 --zone=southamerica-east1-b --listen-on-stdin --project=master-roofing-intelligence
    StrictHostKeyChecking no
```

This uses gcloud's IAP tunnel which always works.

---

## Files Changed This Session
- `components/ko/customer-dashboard.jsx` - NEW (Top 20 Customers Dashboard)
- `components/ko/navigation-rail.jsx` - Added Customers nav item
- `app/page.jsx` - Added showCustomers state and routing
- `lib/api/types.ts` - Added customer analytics types
- `lib/api/endpoints.ts` - Added analytics API endpoints

## Deployed?
Yes - pushed to main branch, Vercel should have auto-deployed.
Production URL: https://v0-master-roofing-ai-2-1u-iwagschal-2035s-projects.vercel.app
(Note: Site has password protection enabled)

---

Good Shabbos! See you Motzi Shabbos.
