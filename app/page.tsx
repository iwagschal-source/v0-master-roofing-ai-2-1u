"use client"

import { useState } from "react"
import { ProposalPDFDownload } from "@/components/proposal-pdf-download"
import { DEFAULT_EXCLUSIONS, type ProposalData } from "@/lib/generate-proposal-pdf"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

// Sample data matching the 120 Ellery Street proposal
const SAMPLE_DATA: ProposalData = {
  projectName: "120 Ellery Street",
  projectAddress: "120 Ellery Street, Brooklyn, NY",
  clientName: "",
  clientCompany: "",
  date: "October 30, 2025",
  drawingsDate: "05/26/2025",
  summary:
    "This project involves the installation of new roofing, waterproofing, and EIFS systems at the existing two-story building with cellar and balconies. The scope includes a Firestone APP 160/180 built-up roofing system at main and bulkhead roofs, aluminum coping and counter-flashing at parapets, EIFS with air-vapor barrier across the rear and side elevations, and balcony waterproofing using the Alsan RS 289 textured finish. Recessed floor waterproofing at the cellar level is provided with the Soprema RS 230 PMMA system, and air-vapor barrier waterproofing is included beneath brick façade areas. All work is performed in accordance with manufacturer requirements and standard installation practices.",
  lineItems: [
    {
      title: "Built-Up Roofing – Firestone APP 160/180 System",
      amount: 42203,
      description:
        'Built-up roof system includes installation of Firestone ISO 95 GL flat and tapered insulation mechanically fastened with Firestone plates, primed DensDeck coverboard, and fiber cant at parapets and bulkheads. Lead sheets installed and sealed at all drains. Assembly includes torch-applied Firestone APP160 smooth base ply and APP180 white granulated cap sheet with 3" laps, with walls and curbs primed and flashed 12" up using APP160/180 binder flashing. Door pans furnished and installed at openings.',
    },
    {
      title: "Aluminum Coping System",
      amount: 7934,
      description:
        "Work includes installation of waterproofing membrane on parapet walls prior to setting steel brackets and under plates. Aluminum coping installed over anchored plates and all seams and joints flashed and sealed per manufacturer specifications.",
    },
    {
      title: "Aluminum Flashing",
      amount: 5794,
      description: 'Install two-piece aluminum counter flashing overlapping roofing membrane minimum 4".',
    },
    {
      title: "Exterior Insulation and Finish System (EIFS)",
      amount: 39209,
      description:
        'Scope includes priming and waterproofing window heads, jambs, and sills with air and vapor barrier, sealing all joints with mesh tape. Apply continuous air and moisture barrier, followed by 3" EIFS EPS insulation (R-11.4), base coat with mesh, and finish coat. Caulk and seal all window and door perimeters.',
    },
    {
      title: "Tie-In",
      amount: 3817,
      description: "Apply PMMA waterproofing membrane where the 1st floor meets the foundation.",
    },
    {
      title: "Balcony Waterproofing",
      amount: 1965,
      description:
        'Balcony waterproofing includes application of Alsan RS 276 Primer, Alsan RS 230 flashing 12" up walls, and Alsan RS 289 Textured Finish with color pack. Aluminum drip edge installed at perimeter terminations as required.',
    },
    {
      title: "Brick Area Waterproofing",
      amount: 4234,
      description:
        "Prime and waterproof window heads, jambs, and sills with an air–vapor barrier membrane, then apply a continuous air–vapor–water barrier over exterior brick walls. The membrane is installed to provide a seamless moisture and air seal around all openings and across the wall surface. Beauty caulking at exterior joints is excluded from this scope. Application methods, primers, and termination details follow the manufacturer's recommendations.",
    },
    {
      title: "Recessed Floor Waterproofing",
      amount: 15115,
      description:
        "Prepare the recessed concrete slab by scarifying to achieve a clean, smooth surface, then apply a uniform coat of Soprema RS 276 primer. Install new flashings using Soprema RS 230 Flash grade PMMA resin with Alsan RS fleece reinforcement around all terminations and penetrations, followed by application of the field membrane consisting of Soprema RS 230 Flash grade PMMA with fleece. All work is performed in accordance with Soprema's installation guidelines to produce a seamless, cold liquid‑applied waterproofing system.",
    },
  ],
  exclusions: DEFAULT_EXCLUSIONS,
}

export default function Home() {
  const [proposalData, setProposalData] = useState<ProposalData>(SAMPLE_DATA)

  const updateField = (field: keyof ProposalData, value: string) => {
    setProposalData((prev) => ({ ...prev, [field]: value }))
  }

  const updateLineItem = (index: number, field: "title" | "amount" | "description", value: string | number) => {
    setProposalData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }))
  }

  const addLineItem = () => {
    setProposalData((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { title: "", amount: 0, description: "" }],
    }))
  }

  const removeLineItem = (index: number) => {
    setProposalData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }))
  }

  const grandTotal = proposalData.lineItems.reduce((sum, item) => sum + item.amount, 0)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Proposal PDF Template</h1>
            <p className="text-muted-foreground">Edit the fields below and export to PDF</p>
          </div>
          <ProposalPDFDownload data={proposalData} className="bg-[#c41e2a] hover:bg-[#a01824]" />
        </div>

        {/* Project Info */}
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={proposalData.projectName}
                onChange={(e) => updateField("projectName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectAddress">Project Address</Label>
              <Input
                id="projectAddress"
                value={proposalData.projectAddress}
                onChange={(e) => updateField("projectAddress", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientCompany">Client Company</Label>
              <Input
                id="clientCompany"
                value={proposalData.clientCompany || ""}
                onChange={(e) => updateField("clientCompany", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" value={proposalData.date} onChange={(e) => updateField("date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="drawingsDate">Date of Drawings</Label>
              <Input
                id="drawingsDate"
                value={proposalData.drawingsDate || ""}
                onChange={(e) => updateField("drawingsDate", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Project Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Project Summary</CardTitle>
            <CardDescription>This appears at the top of the proposal</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={5}
              value={proposalData.summary}
              onChange={(e) => updateField("summary", e.target.value)}
              className="resize-none"
            />
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              <CardDescription>Base bid items with descriptions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addLineItem}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {proposalData.lineItems.map((item, index) => (
              <div key={index} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label>Title</Label>
                        <Input
                          value={item.title}
                          onChange={(e) => updateLineItem(index, "title", e.target.value)}
                          placeholder="e.g., Built-Up Roofing System"
                        />
                      </div>
                      <div className="w-32">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateLineItem(index, "amount", Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateLineItem(index, "description", e.target.value)}
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeLineItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-end border-t pt-4">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Grand Total</p>
                <p className="text-2xl font-bold text-[#c41e2a]">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(grandTotal)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Note */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Integration with Your System</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>To integrate this template into your existing Master Roofing platform:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Copy <code className="bg-muted px-1 rounded">components/proposal-pdf-template.tsx</code> and{" "}
                <code className="bg-muted px-1 rounded">lib/proposal-utils.ts</code>
              </li>
              <li>
                Use <code className="bg-muted px-1 rounded">ProposalPDFDownload</code> component with your takeoff data
              </li>
              <li>
                Call <code className="bg-muted px-1 rounded">createProposalFromTakeoff()</code> to convert spreadsheet
                data to proposal format
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
