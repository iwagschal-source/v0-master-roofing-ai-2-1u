"use client"

import { useState, useEffect } from "react"
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Package,
  Layers,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Building2,
  Loader2,
  BarChart3,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  Treemap,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts"
import { api } from "@/lib/api/client"

// Color palette for charts
const COLORS = [
  "#E63226", "#2563eb", "#16a34a", "#ea580c", "#8b5cf6",
  "#0891b2", "#65a30d", "#dc2626", "#7c3aed", "#0d9488",
  "#ca8a04", "#be185d", "#4f46e5", "#059669", "#d97706"
]

// Section/System colors
const SECTION_COLORS = {
  "Roofing": "#E63226",
  "Waterproofing": "#2563eb",
  "Flashing": "#16a34a",
  "Details & Accessories": "#ea580c",
  "Coping": "#8b5cf6",
  "Balconies": "#0891b2",
  "Exterior": "#65a30d",
  "Pavers": "#ca8a04",
  "Overburden": "#be185d",
  "Waterproofing-Exterior": "#0d9488",
}

export function CustomerDashboard({ onBack }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [viewMode, setViewMode] = useState("overview") // overview | detail

  // Fetch top customers data
  useEffect(() => {
    loadCustomerData()
  }, [])

  const loadCustomerData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Try to fetch from backend API
      const response = await api.get('/analytics/top-customers')
      setData(response)
    } catch (err) {
      console.error("Failed to load customer data:", err)
      // Use sample data for demo if API not available
      setData(getSampleData())
      setError("Using sample data - backend endpoint not available")
    } finally {
      setLoading(false)
    }
  }

  // Sample data generator for demo
  const getSampleData = () => {
    const customers = [
      { name: "Turner Construction", projects: 87, totalValue: 45200000 },
      { name: "Skanska USA", projects: 72, totalValue: 38500000 },
      { name: "Suffolk Construction", projects: 65, totalValue: 32100000 },
      { name: "Gilbane Building", projects: 58, totalValue: 28700000 },
      { name: "Lendlease", projects: 52, totalValue: 25400000 },
      { name: "AECOM Tishman", projects: 48, totalValue: 23100000 },
      { name: "Structure Tone", projects: 45, totalValue: 21800000 },
      { name: "Plaza Construction", projects: 42, totalValue: 19500000 },
      { name: "Hunter Roberts", projects: 38, totalValue: 17200000 },
      { name: "JRM Construction", projects: 35, totalValue: 15800000 },
      { name: "Triton Construction", projects: 32, totalValue: 14100000 },
      { name: "L&K Partners", projects: 30, totalValue: 12900000 },
      { name: "EW Howell", projects: 28, totalValue: 11500000 },
      { name: "Cauldwell Wingate", projects: 26, totalValue: 10200000 },
      { name: "Urban Atelier", projects: 24, totalValue: 9800000 },
      { name: "Omnibuild", projects: 22, totalValue: 8500000 },
      { name: "Monadnock Construction", projects: 20, totalValue: 7200000 },
      { name: "CN Cotts", projects: 18, totalValue: 6100000 },
      { name: "Consigli Construction", projects: 16, totalValue: 5400000 },
      { name: "W&H Properties", projects: 14, totalValue: 4200000 },
    ]

    return {
      customers: customers.map((c, i) => ({
        ...c,
        rank: i + 1,
        winRate: Math.random() * 0.4 + 0.4, // 40-80%
        avgProjectValue: c.totalValue / c.projects,
        systems: generateSystemsForCustomer(c.projects),
        topItems: generateTopItems(),
      })),
      totals: {
        totalCustomers: 336,
        totalProjects: 1529,
        totalValue: 357000000,
        avgWinRate: 0.62,
      },
      systemsSummary: [
        { name: "Roofing", value: 42, projects: 890 },
        { name: "Waterproofing", value: 28, projects: 595 },
        { name: "Flashing", value: 12, projects: 255 },
        { name: "Details & Accessories", value: 10, projects: 213 },
        { name: "Coping", value: 4, projects: 85 },
        { name: "Balconies", value: 2, projects: 43 },
        { name: "Exterior", value: 2, projects: 43 },
      ],
    }
  }

  const generateSystemsForCustomer = (projectCount) => {
    const systems = [
      { name: "Roofing", percentage: 35 + Math.random() * 20 },
      { name: "Waterproofing", percentage: 20 + Math.random() * 15 },
      { name: "Flashing", percentage: 10 + Math.random() * 10 },
      { name: "Details & Accessories", percentage: 8 + Math.random() * 8 },
      { name: "Coping", percentage: 3 + Math.random() * 5 },
      { name: "Balconies", percentage: 2 + Math.random() * 4 },
    ]
    // Normalize to 100%
    const total = systems.reduce((sum, s) => sum + s.percentage, 0)
    return systems.map(s => ({
      ...s,
      percentage: Math.round((s.percentage / total) * 100),
      projects: Math.round((s.percentage / total) * projectCount),
    }))
  }

  const generateTopItems = () => [
    { id: "MR-003BU2PLY", name: "Roofing - Builtup - 2 ply", count: Math.floor(Math.random() * 50) + 20, value: Math.floor(Math.random() * 500000) + 100000 },
    { id: "MR-001VB", name: "Vapor Barrier", count: Math.floor(Math.random() * 40) + 15, value: Math.floor(Math.random() * 200000) + 50000 },
    { id: "MR-025FLASHBLDG", name: "Metal Flashing at building wall", count: Math.floor(Math.random() * 35) + 10, value: Math.floor(Math.random() * 150000) + 40000 },
    { id: "MR-010DRAIN", name: "Drains", count: Math.floor(Math.random() * 30) + 8, value: Math.floor(Math.random() * 100000) + 30000 },
    { id: "MR-022COPELO", name: "Coping (Low Parapet)", count: Math.floor(Math.random() * 25) + 5, value: Math.floor(Math.random() * 80000) + 20000 },
  ]

  const formatCurrency = (value) => {
    if (!value) return "$0"
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num)
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const item = payload[0]?.payload
    return (
      <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
        <div className="text-sm font-medium text-foreground">{item?.name || label}</div>
        <div className="text-xs text-muted-foreground">
          {item?.projects && `${item.projects} projects`}
          {item?.value && ` • ${item.value}%`}
        </div>
      </div>
    )
  }

  // Customer detail view
  const renderCustomerDetail = () => {
    if (!selectedCustomer) return null

    return (
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setSelectedCustomer(null)
                  setViewMode("overview")
                }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground-secondary hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">{selectedCustomer.name}</h1>
                <p className="text-sm text-foreground-tertiary">Rank #{selectedCustomer.rank} • {selectedCustomer.projects} Projects</p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Stats */}
        <div className="px-6 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card rounded-lg p-4 border border-border/50">
              <div className="text-2xl font-bold text-foreground">{formatCurrency(selectedCustomer.totalValue)}</div>
              <div className="text-xs text-foreground-tertiary uppercase mt-1">Total Value</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border/50">
              <div className="text-2xl font-bold text-foreground">{selectedCustomer.projects}</div>
              <div className="text-xs text-foreground-tertiary uppercase mt-1">Projects</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border/50">
              <div className="text-2xl font-bold text-green-500">{(selectedCustomer.winRate * 100).toFixed(0)}%</div>
              <div className="text-xs text-foreground-tertiary uppercase mt-1">Win Rate</div>
            </div>
            <div className="bg-card rounded-lg p-4 border border-border/50">
              <div className="text-2xl font-bold text-foreground">{formatCurrency(selectedCustomer.avgProjectValue)}</div>
              <div className="text-xs text-foreground-tertiary uppercase mt-1">Avg Project</div>
            </div>
          </div>
        </div>

        {/* Systems & Items Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Systems Breakdown */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Systems Used</h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={selectedCustomer.systems}
                      dataKey="percentage"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                      labelLine={false}
                    >
                      {selectedCustomer.systems.map((entry, index) => (
                        <Cell key={entry.name} fill={SECTION_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Systems List */}
              <div className="mt-4 space-y-2">
                {selectedCustomer.systems.map((system, i) => (
                  <div key={system.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: SECTION_COLORS[system.name] || COLORS[i % COLORS.length] }}
                      />
                      <span className="text-foreground">{system.name}</span>
                    </div>
                    <span className="text-foreground-tertiary">{system.projects} projects ({system.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Items */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Top Line Items</h3>
              <div className="space-y-3">
                {selectedCustomer.topItems.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{item.name}</div>
                      <div className="text-xs text-foreground-tertiary">{item.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">{item.count}x</div>
                      <div className="text-xs text-foreground-tertiary">{formatCurrency(item.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Overview view
  if (viewMode === "detail" && selectedCustomer) {
    return renderCustomerDetail()
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-secondary transition-colors text-foreground-secondary hover:text-foreground"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-wide">Top 20 Customers</h1>
              <p className="text-sm text-foreground-tertiary">Systems and items by general contractor</p>
            </div>
          </div>
          <button
            onClick={loadCustomerData}
            disabled={loading}
            className="p-2 rounded-lg bg-secondary text-foreground-secondary hover:text-foreground hover:bg-secondary/80 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mx-6 mt-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <p className="text-yellow-600 dark:text-yellow-400 text-sm">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-foreground-secondary" />
        </div>
      ) : data ? (
        <>
          {/* Summary KPIs */}
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-card rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span className="text-xs text-foreground-tertiary uppercase">Customers</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{formatNumber(data.totals.totalCustomers)}</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <span className="text-xs text-foreground-tertiary uppercase">Projects</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{formatNumber(data.totals.totalProjects)}</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-green-500" />
                  <span className="text-xs text-foreground-tertiary uppercase">Total Value</span>
                </div>
                <div className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(data.totals.totalValue)}</div>
              </div>
              <div className="bg-card rounded-lg p-4 border border-border/50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-yellow-500" />
                  <span className="text-xs text-foreground-tertiary uppercase">Win Rate</span>
                </div>
                <div className="text-2xl font-bold text-green-500 tabular-nums">{(data.totals.avgWinRate * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Customer List - Takes 2 columns on xl */}
              <div className="xl:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Top 20 Customers by Value</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-xs text-foreground-tertiary uppercase border-b border-border/50">
                        <th className="text-left py-3 px-4">Rank</th>
                        <th className="text-left py-3 px-4">Customer</th>
                        <th className="text-right py-3 px-4">Projects</th>
                        <th className="text-right py-3 px-4">Total Value</th>
                        <th className="text-right py-3 px-4">Win Rate</th>
                        <th className="text-right py-3 px-4">Top System</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((customer) => (
                        <tr
                          key={customer.name}
                          className="border-b border-border/30 hover:bg-secondary/30 cursor-pointer transition-colors"
                          onClick={() => {
                            setSelectedCustomer(customer)
                            setViewMode("detail")
                          }}
                        >
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              customer.rank <= 3 ? "bg-primary/20 text-primary" :
                              customer.rank <= 10 ? "bg-blue-500/20 text-blue-500" :
                              "bg-secondary text-foreground-tertiary"
                            }`}>
                              {customer.rank}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground">{customer.name}</span>
                          </td>
                          <td className="py-3 px-4 text-right text-foreground tabular-nums">{customer.projects}</td>
                          <td className="py-3 px-4 text-right font-semibold text-foreground tabular-nums">{formatCurrency(customer.totalValue)}</td>
                          <td className="py-3 px-4 text-right">
                            <span className={`font-medium tabular-nums ${customer.winRate >= 0.6 ? "text-green-500" : customer.winRate >= 0.4 ? "text-yellow-500" : "text-red-500"}`}>
                              {(customer.winRate * 100).toFixed(0)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm text-foreground-secondary">{customer.systems[0]?.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <ChevronRight className="w-4 h-4 text-foreground-tertiary" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Systems Summary - Takes 1 column */}
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">Systems Distribution</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.systemsSummary}
                      layout="vertical"
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="value"
                        radius={[0, 4, 4, 0]}
                      >
                        {data.systemsSummary.map((entry, index) => (
                          <Cell key={entry.name} fill={SECTION_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {data.systemsSummary.slice(0, 6).map((system, i) => (
                    <div key={system.name} className="flex items-center gap-2 text-xs">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SECTION_COLORS[system.name] || COLORS[i % COLORS.length] }}
                      />
                      <span className="text-foreground-tertiary truncate">{system.name}</span>
                      <span className="text-foreground font-medium ml-auto">{system.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto text-foreground-tertiary mb-3" />
            <p className="text-foreground-secondary">No customer data available</p>
          </div>
        </div>
      )}

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
