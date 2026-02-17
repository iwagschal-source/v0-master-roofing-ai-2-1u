"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, Search, Loader2, AlertCircle, CheckCircle2,
  Wrench, Eye, Palette, Copy, Plus, ArrowLeft,
  Ruler, Hash, Square, Hexagon, Filter, Save,
  AlertTriangle, ChevronDown, ChevronRight, Pencil
} from "lucide-react"

const SECTIONS = ['ALL', 'ROOFING', 'BALCONIES', 'EXTERIOR', 'WATERPROOFING']
const TOOL_TYPES = ['Area', 'Polylength', 'Count', 'Perimeter']
const TYPE_ICONS = { Area: Square, Polylength: Ruler, Count: Hash, Perimeter: Hexagon }
const TYPE_UNITS = { Area: 'SF', Polylength: 'LF', Count: 'EA', Perimeter: 'LF' }

const VISUAL_TEMPLATES = {
  Area: [
    { id: 'A_light_overlay', label: 'Light Overlay (20-30%)', opacity: 0.25 },
    { id: 'B_medium_fill', label: 'Medium Fill (40-70%)', opacity: 0.55 },
    { id: 'C_heavy_solid', label: 'Heavy/Solid (80-100%)', opacity: 0.9 },
  ],
  Polylength: [
    { id: 'D_thin_line', label: 'Thin Line (2-2.75pt)', width: 2.5 },
    { id: 'E_medium_line', label: 'Medium Line (3-4pt)', width: 3.5 },
    { id: 'F_thick_line', label: 'Thick Line (5-8pt)', width: 6 },
  ],
  Count: [{ id: 'G_count_marker', label: 'Count Marker', width: 0 }],
  Perimeter: [
    { id: 'H_perimeter', label: 'Perimeter Line (2.5-4pt)', width: 3 },
  ],
}

const LABEL_STATUS_BADGES = {
  empty: { text: 'Missing Label', bg: 'bg-red-500/20', fg: 'text-red-400', icon: AlertTriangle },
  matches_subject: { text: 'Auto Label', bg: 'bg-yellow-500/20', fg: 'text-yellow-400', icon: CheckCircle2 },
  custom: { text: 'Custom Label', bg: 'bg-green-500/20', fg: 'text-green-400', icon: CheckCircle2 },
}

// 32-color palette from production Teju toolset
const COLOR_PALETTE = [
  '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80', '#00ffff', '#0080ff',
  '#0000ff', '#8000ff', '#ff00ff', '#ff0080', '#800000', '#804000', '#808000', '#408000',
  '#008000', '#008040', '#008080', '#004080', '#000080', '#400080', '#800080', '#800040',
  '#c00000', '#c06000', '#c0c000', '#60c000', '#00c000', '#646464', '#a0a0a0', '#ffffff',
]

function LabelStatusBadge({ status }) {
  const cfg = LABEL_STATUS_BADGES[status] || LABEL_STATUS_BADGES.empty
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${cfg.bg} ${cfg.fg}`}>
      <Icon size={12} /> {cfg.text}
    </span>
  )
}

function ColorSwatch({ color, size = 16 }) {
  if (!color) return <span className="text-zinc-600 text-xs">none</span>
  return (
    <span
      className="inline-block rounded border border-zinc-600"
      style={{ width: size, height: size, backgroundColor: color }}
      title={color}
    />
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export function BluebeamToolManager({ isOpen, onClose, onSuccess, initialView }) {
  const [tools, setTools] = useState([])
  const [libraryItems, setLibraryItems] = useState([])
  const [gaps, setGaps] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Filters
  const [section, setSection] = useState('ALL')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('tools') // 'tools' | 'gaps' | 'edit' | 'create'

  // Selected tool for editing
  const [selectedTool, setSelectedTool] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)

  // Create/Clone form
  const [createForm, setCreateForm] = useState({
    subject: '', label: '', type: 'Area', item_id: '',
    scope_name: '', visual_template: 'A_light_overlay',
    border_color_hex: '#ff0000', fill_color_hex: '#00ff00',
    fill_opacity: 0.5, line_width: 3, line_style: 'S',
  })
  const [cloneSource, setCloneSource] = useState(null)

  const fetchTools = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (section !== 'ALL') params.set('section', section)
      if (search) params.set('search', search)
      const res = await fetch(`/api/ko/bluebeam/tools?${params}`)
      if (!res.ok) throw new Error('Failed to fetch tools')
      const data = await res.json()
      setTools(data.tools || [])
      setLibraryItems(data.libraryItems || [])
      setGaps(data.gaps || [])
      setStats(data.stats || null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [section, search])

  useEffect(() => {
    if (isOpen) {
      fetchTools()
      if (initialView) setView(initialView)
    }
  }, [isOpen, fetchTools, initialView])

  // ─── EDIT TOOL ────────────────────────────────────────────
  function openEdit(tool) {
    setSelectedTool(tool)
    setEditForm({
      subject: tool.subject || '',
      label: tool.label || '',
      layer: tool.layer || '',
      type: tool.type || 'Area',
      visual_template: tool.visual_template || '',
      border_color_hex: tool.border_color_hex || '#ff0000',
      fill_color_hex: tool.fill_color_hex || '',
      fill_opacity: tool.fill_opacity ?? 0.5,
      line_width: tool.line_width ?? 3,
      line_style: tool.line_style || 'S',
      line_opacity: tool.line_opacity ?? 1,
      item_id: tool.item_id || '',
      scope_name: tool.scope_name || '',
    })
    setView('edit')
    setSaveMsg(null)
  }

  async function saveEdit() {
    if (!selectedTool) return
    if (!editForm.label?.trim()) {
      setSaveMsg({ type: 'error', text: 'Label is REQUIRED. Every tool must have a human-readable label.' })
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/ko/bluebeam/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', tool_id: selectedTool.tool_id, updates: editForm })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setSaveMsg({ type: 'success', text: `Updated tool ${selectedTool.tool_id}` })
      fetchTools()
    } catch (e) {
      setSaveMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  // ─── CREATE TOOL ──────────────────────────────────────────
  function openCreate(source = null) {
    if (source) {
      setCloneSource(source)
      setCreateForm({
        subject: '', label: '', type: source.type || 'Area',
        item_id: '', scope_name: '',
        visual_template: source.visual_template || '',
        border_color_hex: source.border_color_hex || '#ff0000',
        fill_color_hex: source.fill_color_hex || '',
        fill_opacity: source.fill_opacity ?? 0.5,
        line_width: source.line_width ?? 3,
        line_style: source.line_style || 'S',
      })
    } else {
      setCloneSource(null)
      setCreateForm({
        subject: '', label: '', type: 'Area', item_id: '',
        scope_name: '', visual_template: 'A_light_overlay',
        border_color_hex: '#ff0000', fill_color_hex: '#00ff00',
        fill_opacity: 0.5, line_width: 3, line_style: 'S',
      })
    }
    setView('create')
    setSaveMsg(null)
  }

  async function saveCreate() {
    if (!createForm.subject?.trim()) {
      setSaveMsg({ type: 'error', text: 'Subject is required.' })
      return
    }
    if (!createForm.label?.trim()) {
      setSaveMsg({ type: 'error', text: 'Label is REQUIRED. Every tool must have a human-readable label.' })
      return
    }
    setSaving(true)
    setSaveMsg(null)
    try {
      const action = cloneSource ? 'clone' : 'create'
      const body = cloneSource
        ? {
            action: 'clone',
            source_tool_id: cloneSource.tool_id,
            new_subject: createForm.subject,
            new_label: createForm.label,
            new_item_id: createForm.item_id || null,
            new_scope_name: createForm.scope_name || null,
          }
        : { action: 'create', tool: { ...createForm } }

      const res = await fetch('/api/ko/bluebeam/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setSaveMsg({ type: 'success', text: data.message })
      fetchTools()
      if (onSuccess) onSuccess()
    } catch (e) {
      setSaveMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  // ─── ASSIGN/UNASSIGN ─────────────────────────────────────
  async function handleAssign(itemId, toolName) {
    try {
      await fetch('/api/ko/bluebeam/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', item_id: itemId, tool_name: toolName })
      })
      fetchTools()
    } catch (e) {
      setError(e.message)
    }
  }

  if (!isOpen) return null

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-zinc-900 rounded-xl border border-zinc-700 w-[95vw] h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-700">
          <div className="flex items-center gap-3">
            {view !== 'tools' && view !== 'gaps' && (
              <button onClick={() => { setView('tools'); setSelectedTool(null) }}
                className="p-1.5 hover:bg-zinc-700 rounded">
                <ArrowLeft size={18} />
              </button>
            )}
            <Wrench size={20} className="text-orange-400" />
            <h2 className="text-lg font-semibold">Bluebeam Tool Manager</h2>
            {stats && (
              <span className="text-xs text-zinc-400 ml-2">
                {stats.totalTools} tools | {stats.mappedCount} mapped | {stats.missingLabels} missing labels | {stats.gapCount} gaps
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-700 rounded"><X size={20} /></button>
        </div>

        {/* Tab bar + Filters */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-zinc-800">
          <div className="flex gap-1">
            {[
              { key: 'tools', label: 'All Tools', icon: Wrench },
              { key: 'gaps', label: `Gaps (${gaps.length})`, icon: AlertTriangle },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setView(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm ${
                  view === tab.key ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}>
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Section filter */}
          <select value={section} onChange={e => setSection(e.target.value)}
            className="bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm">
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-500" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tools..."
              className="bg-zinc-800 border border-zinc-600 rounded pl-8 pr-3 py-1.5 text-sm w-48" />
          </div>

          <button onClick={() => openCreate()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded text-sm font-medium">
            <Plus size={14} /> New Tool
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin" size={32} /></div>
          ) : error ? (
            <div className="flex items-center gap-2 text-red-400 justify-center h-full">
              <AlertCircle size={20} /> {error}
            </div>
          ) : view === 'tools' ? (
            <ToolList tools={tools} onEdit={openEdit} onClone={openCreate} />
          ) : view === 'gaps' ? (
            <GapList gaps={gaps} tools={tools} onAssign={handleAssign} onCreate={openCreate} />
          ) : view === 'edit' ? (
            <EditPanel form={editForm} setForm={setEditForm} tool={selectedTool}
              saving={saving} saveMsg={saveMsg} onSave={saveEdit} />
          ) : view === 'create' ? (
            <CreatePanel form={createForm} setForm={setCreateForm}
              cloneSource={cloneSource} libraryItems={libraryItems} gaps={gaps}
              saving={saving} saveMsg={saveMsg} onSave={saveCreate} />
          ) : null}
        </div>
      </div>
    </div>
  )
}

// ─── TOOL LIST ──────────────────────────────────────────────
function ToolList({ tools, onEdit, onClone }) {
  if (!tools.length) return <p className="text-zinc-500 text-center py-8">No tools found</p>
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[60px_1fr_1fr_100px_80px_80px_100px_120px_80px] gap-2 px-3 py-2 text-xs text-zinc-500 uppercase font-medium border-b border-zinc-800">
        <span>ID</span><span>Subject</span><span>Label</span><span>Type</span>
        <span>Unit</span><span>Colors</span><span>Label Status</span><span>Item ID</span><span>Actions</span>
      </div>
      {tools.map(tool => {
        const TypeIcon = TYPE_ICONS[tool.type] || Square
        return (
          <div key={tool.tool_id}
            className="grid grid-cols-[60px_1fr_1fr_100px_80px_80px_100px_120px_80px] gap-2 px-3 py-2 hover:bg-zinc-800/50 rounded items-center text-sm">
            <span className="text-zinc-500 font-mono">{tool.tool_id}</span>
            <span className="truncate font-medium" title={tool.subject}>{tool.subject || '—'}</span>
            <span className={`truncate ${!tool.label ? 'text-red-400 italic' : ''}`}>
              {tool.label || '(empty — needs label)'}
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <TypeIcon size={14} /> {tool.type}
            </span>
            <span className="text-zinc-400">{tool.unit}</span>
            <span className="flex items-center gap-1">
              <ColorSwatch color={tool.border_color_hex} />
              <ColorSwatch color={tool.fill_color_hex} />
            </span>
            <LabelStatusBadge status={tool.label_status} />
            <span className="text-zinc-500 text-xs truncate" title={tool.item_id}>
              {tool.item_id || '—'}
            </span>
            <span className="flex items-center gap-1">
              <button onClick={() => onEdit(tool)} title="Edit"
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                <Pencil size={14} />
              </button>
              <button onClick={() => onClone(tool)} title="Clone"
                className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white">
                <Copy size={14} />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── GAP LIST ───────────────────────────────────────────────
function GapList({ gaps, tools, onAssign, onCreate }) {
  if (!gaps.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-green-400">
      <CheckCircle2 size={48} className="mb-3" />
      <p className="text-lg font-medium">All library items have Bluebeam tools assigned!</p>
    </div>
  )
  return (
    <div className="space-y-1">
      <p className="text-sm text-zinc-400 mb-4">{gaps.length} library items without Bluebeam tools</p>
      <div className="grid grid-cols-[1fr_1fr_100px_80px_150px] gap-2 px-3 py-2 text-xs text-zinc-500 uppercase font-medium border-b border-zinc-800">
        <span>Item ID</span><span>Display Name</span><span>Section</span><span>UOM</span><span>Actions</span>
      </div>
      {gaps.map(item => (
        <div key={item.item_id}
          className="grid grid-cols-[1fr_1fr_100px_80px_150px] gap-2 px-3 py-2 hover:bg-zinc-800/50 rounded items-center text-sm">
          <span className="font-mono text-orange-400">{item.item_id}</span>
          <span>{item.display_name}</span>
          <span className="text-zinc-400">{item.section}</span>
          <span className="text-zinc-400">{item.uom}</span>
          <span className="flex gap-1">
            <button onClick={() => onCreate()}
              className="flex items-center gap-1 px-2 py-1 bg-orange-600/20 hover:bg-orange-600/40 rounded text-xs text-orange-400">
              <Plus size={12} /> Create Tool
            </button>
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── EDIT PANEL ─────────────────────────────────────────────
function EditPanel({ form, setForm, tool, saving, saveMsg, onSave }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        <Pencil size={20} className="text-orange-400" />
        <h3 className="text-lg font-semibold">Edit Tool #{tool.tool_id}</h3>
        <LabelStatusBadge status={tool.label_status} />
      </div>

      {/* Three Text Fields — Subject, Label, Comment */}
      <fieldset className="border border-zinc-700 rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium text-zinc-300 px-2">Text Fields (Bluebeam BTX)</legend>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Subject <span className="text-zinc-600">— System name for CSV matching. Auto-generated.</span>
          </label>
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" />
        </div>

        <div>
          <label className="block text-xs mb-1">
            <span className="text-orange-400 font-semibold">Label *</span>
            <span className="text-zinc-400"> — Human-readable name shown on plan. REQUIRED — never leave empty.</span>
          </label>
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
            className={`w-full bg-zinc-800 border rounded px-3 py-2 text-sm ${
              !form.label?.trim() ? 'border-red-500' : 'border-zinc-600'
            }`}
            placeholder="e.g., 2-Ply BUR System" />
          {!form.label?.trim() && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Label is empty. Estimators won't see what this tool represents on the plan.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Comment <span className="text-zinc-600">— Always left empty. Bluebeam auto-fills with measurement data.</span>
          </label>
          <input value="" disabled
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-600 cursor-not-allowed"
            placeholder="(auto-filled by Bluebeam at markup time)" />
        </div>
      </fieldset>

      {/* Visual Properties */}
      <fieldset className="border border-zinc-700 rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium text-zinc-300 px-2">Visual Properties</legend>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Visual Template</label>
            <select value={form.visual_template}
              onChange={e => setForm({ ...form, visual_template: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              <option value="">None</option>
              {(VISUAL_TEMPLATES[form.type] || []).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Style</label>
            <select value={form.line_style} onChange={e => setForm({ ...form, line_style: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              <option value="S">Solid</option>
              <option value="D">Dashed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorPicker label="Border Color" value={form.border_color_hex}
            onChange={c => setForm({ ...form, border_color_hex: c })} />
          <ColorPicker label="Fill Color" value={form.fill_color_hex}
            onChange={c => setForm({ ...form, fill_color_hex: c })} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fill Opacity ({Math.round((form.fill_opacity || 0) * 100)}%)</label>
            <input type="range" min="0" max="1" step="0.05" value={form.fill_opacity || 0}
              onChange={e => setForm({ ...form, fill_opacity: parseFloat(e.target.value) })}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Width ({form.line_width}pt)</label>
            <input type="range" min="0" max="10" step="0.25" value={form.line_width || 0}
              onChange={e => setForm({ ...form, line_width: parseFloat(e.target.value) })}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Opacity ({Math.round((form.line_opacity || 0) * 100)}%)</label>
            <input type="range" min="0" max="1" step="0.05" value={form.line_opacity || 0}
              onChange={e => setForm({ ...form, line_opacity: parseFloat(e.target.value) })}
              className="w-full" />
          </div>
        </div>

        {/* Preview swatch */}
        <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded">
          <span className="text-xs text-zinc-400">Preview:</span>
          <div className="relative w-24 h-12 rounded border-2"
            style={{
              borderColor: form.border_color_hex || '#ff0000',
              backgroundColor: form.fill_color_hex
                ? `${form.fill_color_hex}${Math.round((form.fill_opacity || 0) * 255).toString(16).padStart(2, '0')}`
                : 'transparent',
            }}>
            {form.label && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/80 truncate px-1">
                {form.label}
              </span>
            )}
          </div>
        </div>
      </fieldset>

      {/* Mapping */}
      <fieldset className="border border-zinc-700 rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium text-zinc-300 px-2">Library Mapping</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Item ID</label>
            <input value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm font-mono"
              placeholder="e.g., MR-2PLYBUR" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Scope Name</label>
            <input value={form.scope_name} onChange={e => setForm({ ...form, scope_name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm"
              placeholder="e.g., 2-Ply BUR System" />
          </div>
        </div>
      </fieldset>

      {/* Save */}
      {saveMsg && (
        <div className={`flex items-center gap-2 p-3 rounded text-sm ${
          saveMsg.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {saveMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {saveMsg.text}
        </div>
      )}
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded font-medium">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  )
}

// ─── CREATE PANEL ───────────────────────────────────────────
function CreatePanel({ form, setForm, cloneSource, libraryItems, gaps, saving, saveMsg, onSave }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-4">
        {cloneSource ? <Copy size={20} className="text-blue-400" /> : <Plus size={20} className="text-green-400" />}
        <h3 className="text-lg font-semibold">
          {cloneSource ? `Clone Tool #${cloneSource.tool_id} "${cloneSource.subject}"` : 'Create New Tool'}
        </h3>
      </div>

      {/* Three Text Fields */}
      <fieldset className="border border-zinc-700 rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium text-zinc-300 px-2">Text Fields (Bluebeam BTX)</legend>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Subject * <span className="text-zinc-600">— System name for CSV matching.</span>
          </label>
          <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm"
            placeholder="e.g., Fire-Rated Liquid Membrane" />
        </div>

        <div>
          <label className="block text-xs mb-1">
            <span className="text-orange-400 font-semibold">Label *</span>
            <span className="text-zinc-400"> — Human-readable name shown on plan. REQUIRED.</span>
          </label>
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })}
            className={`w-full bg-zinc-800 border rounded px-3 py-2 text-sm ${
              !form.label?.trim() ? 'border-red-500' : 'border-zinc-600'
            }`}
            placeholder="e.g., Fire-Rated Liquid Membrane" />
          {!form.label?.trim() && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Label is required.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs text-zinc-400 mb-1">
            Comment <span className="text-zinc-600">— Always left empty. Bluebeam auto-fills.</span>
          </label>
          <input value="" disabled
            className="w-full bg-zinc-800/50 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-600 cursor-not-allowed"
            placeholder="(auto-filled by Bluebeam at markup time)" />
        </div>
      </fieldset>

      {/* Visual Properties */}
      <fieldset className="border border-zinc-700 rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium text-zinc-300 px-2">Visual Properties</legend>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Type</label>
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              {TOOL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Visual Template</label>
            <select value={form.visual_template}
              onChange={e => setForm({ ...form, visual_template: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              <option value="">None</option>
              {(VISUAL_TEMPLATES[form.type] || []).map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Style</label>
            <select value={form.line_style} onChange={e => setForm({ ...form, line_style: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              <option value="S">Solid</option>
              <option value="D">Dashed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ColorPicker label="Border Color" value={form.border_color_hex}
            onChange={c => setForm({ ...form, border_color_hex: c })} />
          <ColorPicker label="Fill Color" value={form.fill_color_hex}
            onChange={c => setForm({ ...form, fill_color_hex: c })} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Fill Opacity ({Math.round((form.fill_opacity || 0) * 100)}%)</label>
            <input type="range" min="0" max="1" step="0.05" value={form.fill_opacity || 0}
              onChange={e => setForm({ ...form, fill_opacity: parseFloat(e.target.value) })}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Width ({form.line_width}pt)</label>
            <input type="range" min="0" max="10" step="0.25" value={form.line_width || 0}
              onChange={e => setForm({ ...form, line_width: parseFloat(e.target.value) })}
              className="w-full" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Line Style</label>
            <select value={form.line_style} onChange={e => setForm({ ...form, line_style: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm">
              <option value="S">Solid</option><option value="D">Dashed</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Library Mapping */}
      <fieldset className="border border-zinc-700 rounded-lg p-4 space-y-4">
        <legend className="text-sm font-medium text-zinc-300 px-2">Library Mapping (optional)</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Item ID</label>
            <input value={form.item_id} onChange={e => setForm({ ...form, item_id: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm font-mono"
              placeholder="e.g., MR-FIRE-LIQ" />
            {gaps.length > 0 && (
              <div className="mt-1 max-h-24 overflow-y-auto">
                <p className="text-xs text-zinc-500 mb-1">Unmapped items:</p>
                {gaps.slice(0, 10).map(g => (
                  <button key={g.item_id}
                    onClick={() => setForm({ ...form, item_id: g.item_id, scope_name: g.display_name || '' })}
                    className="block text-xs text-orange-400 hover:text-orange-300 py-0.5">
                    {g.item_id} — {g.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Scope Name</label>
            <input value={form.scope_name} onChange={e => setForm({ ...form, scope_name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm" />
          </div>
        </div>
      </fieldset>

      {saveMsg && (
        <div className={`flex items-center gap-2 p-3 rounded text-sm ${
          saveMsg.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
        }`}>
          {saveMsg.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          {saveMsg.text}
        </div>
      )}
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 rounded font-medium">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        {saving ? 'Saving...' : cloneSource ? 'Clone Tool' : 'Create Tool'}
      </button>
    </div>
  )
}

// ─── COLOR PICKER ───────────────────────────────────────────
function ColorPicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <button onClick={() => setOpen(!open)}
          className="w-8 h-8 rounded border border-zinc-600"
          style={{ backgroundColor: value || 'transparent' }} />
        <input value={value || ''} onChange={e => onChange(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-3 py-1.5 text-sm font-mono"
          placeholder="#ff0000" />
      </div>
      {open && (
        <div className="mt-2 grid grid-cols-8 gap-1 p-2 bg-zinc-800 rounded border border-zinc-700">
          {COLOR_PALETTE.map(c => (
            <button key={c} onClick={() => { onChange(c); setOpen(false) }}
              className={`w-6 h-6 rounded border ${value === c ? 'border-white border-2' : 'border-zinc-600'}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
      )}
    </div>
  )
}
