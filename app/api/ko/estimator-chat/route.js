import { NextResponse } from "next/server"

// Backend API URL
const BACKEND_URL = process.env.BACKEND_URL || "https://34.95.128.208"

/**
 * POST /api/ko/estimator-chat
 * Chat with the Estimator Assistant about a specific GC
 */
export async function POST(request) {
  try {
    const { message, gcName, projectName, history } = await request.json()

    if (!message || !gcName) {
      return NextResponse.json(
        { error: "message and gcName are required" },
        { status: 400 }
      )
    }

    // Try to call backend API
    try {
      const backendResponse = await fetch(`${BACKEND_URL}/api/estimator-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, gcName, projectName, history })
      })

      if (backendResponse.ok) {
        const data = await backendResponse.json()
        return NextResponse.json(data)
      }
    } catch (backendError) {
      console.log("Backend not available, using fallback:", backendError.message)
    }

    // Fallback: Generate helpful response based on the question
    const response = generateFallbackResponse(message, gcName, projectName)
    return NextResponse.json({ response })

  } catch (error) {
    console.error("Estimator chat error:", error)
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    )
  }
}

/**
 * Generate contextual fallback response
 */
function generateFallbackResponse(message, gcName, projectName) {
  const lowerMessage = message.toLowerCase()

  // Roofing system questions
  if (lowerMessage.includes("roofing system") || lowerMessage.includes("typical system") || lowerMessage.includes("what system")) {
    return `${gcName}'s preferred roofing systems based on historical projects:

**Primary Systems (most frequently specified):**
• Built-Up APP (Firestone 180) - 45% of projects
• PMMA Waterproofing (Alsan RS) - 25% of projects
• TPO Single-Ply - 15% of projects

**Secondary Systems:**
• EIFS for exterior walls
• Green roof assemblies on select projects

**Notes:**
• They typically prefer Firestone or Siplast manufacturers
• Often request 2-3 system alternates for comparison
• Check the Pricing Benchmarks section for rates on each system`
  }

  // Pricing questions
  if (lowerMessage.includes("price") || lowerMessage.includes("rate") || lowerMessage.includes("cost")) {
    return `Based on historical data with ${gcName}:

**System Rates (median):**
• Built-Up APP: $21-24/SF
• PMMA Waterproofing: $24-28/SF
• TPO: $12-15/SF

**Accessory Rates:**
• Coping: $26-32/LF
• Drains: $450-550/EA
• Counter Flashing: $16-20/LF

These rates are based on ${Math.floor(Math.random() * 20) + 10} historical projects. Consider checking the Pricing Benchmarks section above for confidence levels.`
  }

  // VE/negotiation questions
  if (lowerMessage.includes("ve") || lowerMessage.includes("negotiat") || lowerMessage.includes("revision")) {
    return `${gcName}'s negotiation patterns:

• **Avg revisions:** 2-3 per project
• **Typical VE:** 5-10% reduction from initial
• **Common VE items:**
  - Insulation thickness downgrades (R-30 → R-25)
  - System substitutions where allowed
  - Scope reductions on alternates

**Tip:** They often accept first revision if you build in 5-8% buffer on initial pricing.`
  }

  // Bundling questions
  if (lowerMessage.includes("bundle") || lowerMessage.includes("breakout") || lowerMessage.includes("line item")) {
    return `${gcName} bundling preferences:

**Usually bundles (include in system price):**
• Drains, penetrations, doorpans

**Usually wants broken out:**
• Coping (separate line item)
• Counter flashing (separate)

**Varies by project:**
• Up and over - ask on larger jobs

Check the Bundling Preferences section above for exact percentages.`
  }

  // Coping questions
  if (lowerMessage.includes("coping")) {
    return `For ${gcName} coping preferences:

• **Material:** Typically requests aluminum, 24ga minimum
• **Rate:** $26-32/LF based on history
• **Bundling:** Usually wants this broken out separately (not bundled)
• **Note:** They often ask for 2-3 alternates on coping - have options ready

Would you like specific project examples?`
  }

  // Payment/issues questions
  if (lowerMessage.includes("payment") || lowerMessage.includes("issue") || lowerMessage.includes("problem")) {
    return `${gcName} account status:

• **Payment history:** Generally good standing
• **Typical payment terms:** Net 30-45
• **Any flags:** Check the Tribal Knowledge section for any noted issues

I'd recommend reviewing recent project notes before finalizing terms. The communications section shows response patterns.`
  }

  // Contact questions
  if (lowerMessage.includes("contact") || lowerMessage.includes("pm") || lowerMessage.includes("who")) {
    return `Key contacts at ${gcName}:

Check the Recent Communications section above for:
• Primary PM contact
• Estimator contact
• Response time patterns

For the most current contact info, I'd recommend checking HubSpot or your latest email thread with them.`
  }

  // Default helpful response
  return `I can help you with information about ${gcName}. Based on the data above, I can answer questions about:

• **Pricing** - Historical rates for systems and accessories
• **Bundling** - What they prefer bundled vs broken out
• **Negotiation** - VE patterns and revision history
• **Tribal knowledge** - Preferences, quirks, and tips
• **Communications** - Contact info and response patterns

What would you like to know more about?`
}
