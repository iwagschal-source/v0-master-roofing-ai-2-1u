"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeft,
  Play,
  RefreshCw,
  Zap,
  DollarSign,
  Clock,
  Trophy,
  Target,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  SkipForward,
  Cpu,
  Sparkles,
  TrendingUp,
  ChevronRight,
  Eye,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"

// Provider colors
const PROVIDER_COLORS = {
  anthropic: "#D4A574",
  openai: "#10A37F",
  google: "#4285F4",
  deepseek: "#5B6EE1",
  together: "#FF6B6B",
  mistral: "#FF7F50",
  xai: "#1DA1F2",
  groq: "#00D4AA",
  cohere: "#6366F1",
  amazon: "#FF9900",
  alibaba: "#FF6A00",
}

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    completed: "bg-green-500/20 text-green-400 border-green-500/30",
    running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    failed: "bg-red-500/20 text-red-400 border-red-500/30",
    skipped: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  }

  const icons = {
    completed: <CheckCircle2 className="w-3 h-3" />,
    running: <Loader2 className="w-3 h-3 animate-spin" />,
    failed: <XCircle className="w-3 h-3" />,
    skipped: <SkipForward className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border ${styles[status] || styles.pending}`}>
      {icons[status]}
      {status}
    </span>
  )
}

// Progress bar component
function ProgressBar({ progress, showLabel = true }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        {showLabel && <span>Progress</span>}
        <span>{progress.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  )
}

// Model result row
function ModelResultRow({ result, rank, onClick }) {
  return (
    <tr
      className="border-b border-gray-700/50 hover:bg-gray-800/50 cursor-pointer transition-colors"
      onClick={() => onClick?.(result)}
    >
      <td className="py-3 px-4 text-gray-400">{rank}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: PROVIDER_COLORS[result.provider] || "#666" }}
          />
          <span className="text-white font-medium">{result.model_name}</span>
        </div>
        <span className="text-xs text-gray-500">{result.provider}</span>
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={result.status} />
      </td>
      <td className="py-3 px-4 text-right">
        {result.score !== null && result.score !== undefined ? (
          <span className={`font-mono ${result.score >= 85 ? 'text-green-400' : result.score >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
            {result.score.toFixed(1)}%
          </span>
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right font-mono text-gray-300">
        {result.cost !== null && result.cost !== undefined ? (
          `$${result.cost.toFixed(5)}`
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right font-mono text-gray-300">
        {result.time_seconds !== null && result.time_seconds !== undefined ? (
          `${result.time_seconds.toFixed(2)}s`
        ) : (
          <span className="text-gray-500">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-right">
        <ChevronRight className="w-4 h-4 text-gray-500" />
      </td>
    </tr>
  )
}

// Recommendation card
function RecommendationCard({ title, icon: Icon, model, score, cost, time, reason, color }) {
  return (
    <div className={`p-4 rounded-lg border ${color} bg-opacity-10`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5" />
        <span className="font-semibold text-white">{title}</span>
      </div>
      {model ? (
        <>
          <p className="text-lg font-bold text-white">{model}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            {score !== undefined && <span>Score: {score.toFixed(1)}%</span>}
            {cost !== undefined && <span>Cost: ${cost.toFixed(5)}</span>}
            {time !== undefined && <span>Time: {time.toFixed(2)}s</span>}
          </div>
          {reason && <p className="text-xs text-gray-500 mt-2">{reason}</p>}
        </>
      ) : (
        <p className="text-gray-500">No qualifying model</p>
      )}
    </div>
  )
}

export function ModelArenaDashboard({ onBack }) {
  const [status, setStatus] = useState("idle") // idle, running, completed
  const [testPrompt, setTestPrompt] = useState("What is the capital of France? Reply with just the city name.")
  const [progress, setProgress] = useState(null)
  const [results, setResults] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [models, setModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(true)

  const wsRef = useRef(null)
  const testRunIdRef = useRef(null)
  const pingIntervalRef = useRef(null)

  // Backend URL
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://34.95.128.208"
  const WS_URL = BACKEND_URL.replace("https://", "wss://").replace("http://", "ws://")

  // Load available models on mount
  useEffect(() => {
    loadModels()
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const loadModels = async () => {
    try {
      setLoadingModels(true)
      const response = await fetch(`${BACKEND_URL}/arena/models`)
      if (response.ok) {
        const data = await response.json()
        setModels(data)
      }
    } catch (err) {
      console.error("Failed to load models:", err)
    } finally {
      setLoadingModels(false)
    }
  }

  // Connect to WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(`${WS_URL}/arena/ws`)

    ws.onopen = () => {
      console.log("Arena WebSocket connected")
      // Start keep-alive ping every 15 seconds
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
      }
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ action: "ping" }))
        }
      }, 15000)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === "progress") {
          setProgress(msg.data)
          // Update results from top_results
          if (msg.data.top_results) {
            setResults(prev => {
              const newResults = [...prev]
              msg.data.top_results.forEach(r => {
                const idx = newResults.findIndex(nr => nr.model_name === r.model_name)
                if (idx >= 0) {
                  newResults[idx] = { ...newResults[idx], ...r, status: "completed" }
                } else {
                  newResults.push({ ...r, status: "completed" })
                }
              })
              return newResults.sort((a, b) => (b.score || 0) - (a.score || 0))
            })
          }
        } else if (msg.type === "complete") {
          setStatus("completed")
          setSummary(msg.data)
          setProgress(prev => ({ ...prev, progress_pct: 100, status: "completed" }))
        } else if (msg.type === "error") {
          console.error("Arena error:", msg.data.message)
        } else if (msg.type === "pong" || msg.type === "subscribed") {
          // Keep-alive response or subscription confirmation - no action needed
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e)
      }
    }

    ws.onerror = (err) => {
      console.error("Arena WebSocket error:", err)
    }

    ws.onclose = () => {
      console.log("Arena WebSocket closed")
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = null
      }
    }

    wsRef.current = ws
  }, [WS_URL])

  // Start a test
  const startTest = async () => {
    if (!testPrompt.trim()) return

    setStatus("running")
    setProgress(null)
    setResults([])
    setSummary(null)
    setSelectedResult(null)

    // Connect WebSocket first and wait for it to be ready
    connectWebSocket()

    // Helper to wait for WebSocket to be ready
    const waitForWs = () => new Promise((resolve) => {
      const checkWs = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          resolve(true)
        } else if (wsRef.current?.readyState === WebSocket.CONNECTING) {
          setTimeout(checkWs, 100)
        } else {
          resolve(false)
        }
      }
      setTimeout(checkWs, 100)
    })

    try {
      const response = await fetch(`${BACKEND_URL}/arena/test/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: `manual-test-${Date.now()}`,
          prompt: testPrompt,
          threshold: 85.0,
          test_type: "manual",
          test_reason: "Manual test from dashboard"
        })
      })

      if (response.ok) {
        const data = await response.json()
        testRunIdRef.current = data.test_run_id
        console.log("Test started:", data.test_run_id)

        // Wait for WebSocket then subscribe
        const wsReady = await waitForWs()
        if (wsReady) {
          wsRef.current.send(JSON.stringify({
            action: "subscribe",
            test_run_id: data.test_run_id
          }))
          console.log("Subscribed to test:", data.test_run_id)
        } else {
          console.error("WebSocket not ready for subscription")
        }
      } else {
        const errText = await response.text()
        setStatus("idle")
        console.error("Failed to start test:", response.status, errText)
      }
    } catch (err) {
      setStatus("idle")
      console.error("Failed to start test:", err)
    }
  }

  // Run quick test
  const runQuickTest = async () => {
    if (!testPrompt.trim()) return

    setStatus("running")
    setProgress({ progress_pct: 0, models_total: 0, models_completed: 0 })
    setResults([])
    setSummary(null)

    try {
      const response = await fetch(
        `${BACKEND_URL}/arena/test/quick?prompt=${encodeURIComponent(testPrompt)}`,
        { method: "POST" }
      )

      if (response.ok) {
        const data = await response.json()
        const formattedResults = data.results.map((r, i) => ({
          ...r,
          rank: i + 1,
          model_name: r.model_name,
          score: r.score,
          cost: r.cost,
          time_seconds: r.time
        }))
        setResults(formattedResults)
        setStatus("completed")
        setProgress({ progress_pct: 100, models_total: data.results.length, models_completed: data.results.length })
      } else {
        setStatus("idle")
      }
    } catch (err) {
      setStatus("idle")
      console.error("Quick test failed:", err)
    }
  }

  // Get provider stats from models
  const providerStats = models.reduce((acc, m) => {
    if (!acc[m.provider]) {
      acc[m.provider] = { count: 0, free: 0 }
    }
    acc[m.provider].count++
    if (m.is_free) acc[m.provider].free++
    return acc
  }, {})

  // Chart data for results
  const chartData = results
    .filter(r => r.status === "completed" && r.score !== null)
    .slice(0, 10)
    .map(r => ({
      name: r.model_name?.substring(0, 15) || "Unknown",
      score: r.score,
      cost: (r.cost || 0) * 10000, // Scale up for visibility
      time: r.time_seconds || 0,
      provider: r.provider
    }))

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Model Arena
            </h1>
            <p className="text-sm text-gray-400">Test recipes against all LLM models</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadModels}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            title="Refresh models"
          >
            <RefreshCw className={`w-5 h-5 text-gray-400 ${loadingModels ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Test Input Section */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">Test Prompt</h2>
          <div className="flex gap-3">
            <textarea
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a prompt to test against all models..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              disabled={status === "running"}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={runQuickTest}
                disabled={status === "running" || !testPrompt.trim()}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <Zap className="w-4 h-4" />
                Quick Test
              </button>
              <button
                onClick={startTest}
                disabled={status === "running" || !testPrompt.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                {status === "running" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Full Arena
              </button>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        {(status === "running" || progress) && (
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-300">Test Progress</h2>
              {progress && (
                <span className="text-sm text-gray-400">
                  {progress.models_completed || 0} / {progress.models_total || 0} models
                </span>
              )}
            </div>

            <ProgressBar progress={progress?.progress_pct || 0} />

            {progress && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{progress.models_completed || 0}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{progress.models_failed || 0}</p>
                  <p className="text-xs text-gray-500">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-400">{progress.models_skipped || 0}</p>
                  <p className="text-xs text-gray-500">Skipped</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-cyan-400">${(progress.total_cost || 0).toFixed(4)}</p>
                  <p className="text-xs text-gray-500">Total Cost</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recommendations (when complete) */}
        {summary && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Recommendations</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <RecommendationCard
                title="Best Quality"
                icon={Trophy}
                model={summary.top_by_score?.[0]?.model_name}
                score={summary.top_by_score?.[0]?.score}
                cost={summary.top_by_score?.[0]?.cost}
                color="border-yellow-500/30 bg-yellow-500"
              />
              <RecommendationCard
                title="Best Value"
                icon={TrendingUp}
                model={summary.top_by_value?.[0]?.model_name}
                score={summary.top_by_value?.[0]?.score}
                cost={summary.top_by_value?.[0]?.cost}
                color="border-green-500/30 bg-green-500"
              />
              <RecommendationCard
                title="Fastest"
                icon={Zap}
                model={summary.top_by_speed?.[0]?.model_name}
                score={summary.top_by_speed?.[0]?.score}
                time={summary.top_by_speed?.[0]?.time}
                color="border-blue-500/30 bg-blue-500"
              />
              <RecommendationCard
                title="Best Free"
                icon={DollarSign}
                model={summary.top_free?.[0]?.model_name}
                score={summary.top_free?.[0]?.score}
                color="border-purple-500/30 bg-purple-500"
              />
            </div>

            {summary.recommended_model && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/30">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-white">Recommended: {summary.recommended_model}</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">{summary.recommendation_reason}</p>
              </div>
            )}
          </div>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-sm font-semibold text-gray-300">Results ({results.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr className="text-left text-xs text-gray-400 uppercase">
                    <th className="py-3 px-4 w-12">#</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Score</th>
                    <th className="py-3 px-4 text-right">Cost</th>
                    <th className="py-3 px-4 text-right">Time</th>
                    <th className="py-3 px-4 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <ModelResultRow
                      key={result.model_id || result.model_name || idx}
                      result={result}
                      rank={idx + 1}
                      onClick={setSelectedResult}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-300 mb-3">Score Comparison (Top 10)</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" width={120} stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151" }}
                    labelStyle={{ color: "#F3F4F6" }}
                  />
                  <Bar dataKey="score" fill="#3B82F6" name="Score %" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Provider Stats */}
        <div className="bg-gray-800 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-3">
            Available Models ({models.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(providerStats).map(([provider, stats]) => (
              <div
                key={provider}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-700/50 border border-gray-600"
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PROVIDER_COLORS[provider] || "#666" }}
                />
                <span className="text-sm text-white capitalize">{provider}</span>
                <span className="text-xs text-gray-400">({stats.count})</span>
                {stats.free > 0 && (
                  <span className="text-xs text-green-400">🆓{stats.free}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Result Detail Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">{selectedResult.model_name}</h3>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-1 hover:bg-gray-700 rounded"
              >
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Provider</p>
                  <p className="text-white capitalize">{selectedResult.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Status</p>
                  <StatusBadge status={selectedResult.status} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Score</p>
                  <p className="text-2xl font-bold text-white">
                    {selectedResult.score?.toFixed(1) || "—"}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Cost</p>
                  <p className="text-white font-mono">
                    ${selectedResult.cost?.toFixed(6) || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Response Time</p>
                  <p className="text-white font-mono">
                    {selectedResult.time_seconds?.toFixed(2) || "—"}s
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Tokens/sec</p>
                  <p className="text-white font-mono">
                    {selectedResult.tokens_per_second?.toFixed(1) || "—"}
                  </p>
                </div>
              </div>

              {selectedResult.response_preview && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Response Preview</p>
                  <pre className="bg-gray-900 p-3 rounded text-sm text-gray-300 whitespace-pre-wrap">
                    {selectedResult.response_preview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
