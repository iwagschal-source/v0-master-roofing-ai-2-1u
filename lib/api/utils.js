
export function parseAnswer(answer) {
  if (typeof answer !== "string") {
    return { text: "", documents: [] }
  }

  // Find JSON block by locating outer braces
  const start = answer.indexOf("{")
  const end = answer.lastIndexOf("}")

  if (start === -1 || end === -1 || end <= start) {
    return { text: answer, documents: [] }
  }

  const jsonCandidate = answer.slice(start, end + 1)

  try {
    const parsed = JSON.parse(jsonCandidate)
    const documents = Array.isArray(parsed?.documents) ? parsed.documents : []

    // Remove the JSON block from displayed text
    const text =
      (answer.slice(0, start) + answer.slice(end + 1))
        .replace(/\n{3,}/g, "\n\n")
        .trim()

    return { text, documents }
  } catch {
    // If it isn't valid JSON, just show it as text
    return { text: answer, documents: [] }
  }
}
