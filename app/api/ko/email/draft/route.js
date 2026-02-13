import { NextResponse } from "next/server"

// Email Drafter Agent - generates reply drafts based on email context
// This connects to the backend Email Drafter agent (INT-002)

const BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://136.111.252.120:8000'

export async function POST(request) {
  try {
    const body = await request.json()
    const { emailId, subject, from, body: emailBody, projectName, gcName, tone = 'professional' } = body

    // Try backend Email Drafter agent first
    try {
      const res = await fetch(`${BACKEND_URL}/api/agents/email-drafter/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_id: emailId,
          subject,
          from_name: from?.name || from,
          from_email: from?.email,
          email_body: emailBody,
          project_name: projectName,
          gc_name: gcName,
          tone,
        }),
        signal: AbortSignal.timeout(15000), // 15 second timeout
      })

      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          draft: data.draft || data.response || data.message,
          tone,
          source: 'email_drafter_agent'
        })
      }
    } catch (backendErr) {
      console.log('Backend email drafter not available, using fallback:', backendErr.message)
    }

    // Fallback: Generate a simple context-aware draft
    const senderName = from?.name || 'there'
    const drafts = {
      professional: `Dear ${senderName},

Thank you for your email regarding ${subject || 'this matter'}${projectName ? ` for the ${projectName} project` : ''}.

I have reviewed your message and will address your request promptly. ${gcName ? `We value our partnership with ${gcName} and` : 'We'} will ensure this is handled with our usual attention to detail.

Please don't hesitate to reach out if you need any additional information in the meantime.

Best regards,
Master Roofing & Siding`,

      brief: `Hi ${senderName},

Thanks for your email${projectName ? ` about ${projectName}` : ''}. I'll review and get back to you shortly.

Best,
Master Roofing & Siding`,

      friendly: `Hi ${senderName}!

Thanks so much for reaching out${projectName ? ` regarding ${projectName}` : ''}! I really appreciate you taking the time to send this over.

I'll take a look at everything and circle back with you soon. Let me know if there's anything else you need in the meantime!

Cheers,
Master Roofing & Siding`
    }

    const draft = drafts[tone] || drafts.professional

    return NextResponse.json({
      draft,
      tone,
      source: 'fallback'
    })

  } catch (error) {
    console.error("Error generating email draft:", error)
    return NextResponse.json(
      { error: "Failed to generate draft", details: error.message },
      { status: 500 }
    )
  }
}
