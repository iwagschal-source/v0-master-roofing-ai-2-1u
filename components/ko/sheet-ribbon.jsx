"use client"

import { useState, useEffect, useRef } from "react"
import { ArrowLeft, ExternalLink, ChevronDown, Loader2 } from "lucide-react"
import { BRAND_COLORS } from "@/lib/brand-colors"

export function SheetRibbon({
  projectName,
  tabName,
  embeddedSheetId,
  selectedVersionTab,
  versions,
  creatingVersion,
  generatingBtx,
  setupTabSheetId,
  libraryTabSheetId,
  onBack,
  onGenerateBtx,
  onOpenToolManager,
  onCreateVersion,
  onImportCsv,
  onImportHistory,
  onCreateProposal,
  onSetDefault,
  onTabSwitch,
}) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const ribbonRef = useRef(null)

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!openDropdown) return

    const handleClickOutside = (e) => {
      if (ribbonRef.current && !ribbonRef.current.contains(e.target)) {
        setOpenDropdown(null)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openDropdown])

  const toggleDropdown = (name) => {
    setOpenDropdown(prev => prev === name ? null : name)
  }

  const isSetup = selectedVersionTab === 'Setup'
  const isLibrary = selectedVersionTab === 'Library'
  const isVersion = !isSetup && !isLibrary
  const currentVersion = versions?.find(v => v.sheetName === selectedVersionTab)
  const isDefault = currentVersion?.active === true

  return (
    <div ref={ribbonRef}>
      {/* Row 1: Ribbon action buttons */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
        {/* Left: Back arrow + Project/Tab name */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
            title="Back to project"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-sm leading-tight">{projectName}</h2>
            <p className="text-xs text-muted-foreground">{tabName || selectedVersionTab}</p>
          </div>
        </div>

        {/* Center: Ribbon buttons — context-dependent */}
        <div className="flex items-center gap-2">
          {isSetup ? (
            /* ───── SETUP RIBBON (11C) ───── */
            <>
              {/* BTX Tools dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('btx')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: BRAND_COLORS.bluebeamBlue }}
                >
                  BTX TOOLS
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openDropdown === 'btx' && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={() => { setOpenDropdown(null); onGenerateBtx() }}
                      disabled={generatingBtx}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {generatingBtx && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Create Project Tools
                    </button>
                    <button
                      onClick={() => { setOpenDropdown(null); onOpenToolManager('create') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Setup New Tool
                    </button>
                    <button
                      onClick={() => { setOpenDropdown(null); onOpenToolManager('tools') }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Edit Existing Tool
                    </button>
                  </div>
                )}
              </div>

              {/* Setup Takeoff dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('takeoff')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{ backgroundColor: BRAND_COLORS.takeoffGreen }}
                >
                  SETUP TAKEOFF
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openDropdown === 'takeoff' && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={() => { setOpenDropdown(null); onCreateVersion() }}
                      disabled={creatingVersion}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingVersion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Create New Sheet
                    </button>
                    <button
                      disabled
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
                    >
                      Update Default Sheet
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : isVersion ? (
            /* ───── VERSION RIBBON (11D) ───── */
            <>
              {/* Import Bluebeam CSV dropdown */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('import')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                  style={{
                    backgroundColor: BRAND_COLORS.drawingsDark,
                    border: `2px solid ${BRAND_COLORS.bluebeamBlue}`,
                  }}
                >
                  IMPORT BLUEBEAM CSV
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {openDropdown === 'import' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                    <button
                      onClick={() => { setOpenDropdown(null); onImportCsv() }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Import CSV
                    </button>
                    <button
                      onClick={() => { setOpenDropdown(null); onImportHistory() }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      Import History
                    </button>
                  </div>
                )}
              </div>

              {/* Create Proposal button */}
              <button
                onClick={onCreateProposal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: BRAND_COLORS.proposalRed }}
              >
                CREATE PROPOSAL
              </button>

              {/* Default toggle */}
              {currentVersion && (
                <button
                  onClick={() => !isDefault && onSetDefault(selectedVersionTab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    isDefault
                      ? 'bg-green-600/20 text-green-400 border border-green-600/40 cursor-default'
                      : 'bg-muted hover:bg-muted/80 border border-border text-foreground'
                  }`}
                >
                  {isDefault ? 'Default Sheet' : 'Set as Default'}
                </button>
              )}
            </>
          ) : (
            /* ───── LIBRARY RIBBON — no action buttons ───── */
            <span className="text-xs text-muted-foreground">Read-only reference</span>
          )}
        </div>

        {/* Right: Open in Sheets */}
        <a
          href={`https://docs.google.com/spreadsheets/d/${embeddedSheetId}/edit`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-lg text-sm transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open in Sheets
        </a>
      </div>

      {/* Row 2: Tab bar — Setup | Versions... | Library */}
      {onTabSwitch && (
        <div className="flex items-center gap-0 px-4 bg-card border-b border-border overflow-x-auto">
          {/* Setup tab */}
          <button
            onClick={() => onTabSwitch('Setup', setupTabSheetId)}
            className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              isSetup
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
            }`}
          >
            Setup
          </button>

          {/* Version tabs — chronological order */}
          {(versions || []).map((v) => {
            const isSelected = selectedVersionTab === v.sheetName
            const isActiveDefault = v.active === true
            return (
              <button
                key={v.sheetName}
                onClick={() => onTabSwitch(v.sheetName, v.tabSheetId)}
                className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
                }`}
              >
                {isActiveDefault && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                )}
                {v.sheetName}
              </button>
            )
          })}

          {/* Library tab */}
          {libraryTabSheetId != null && (
            <button
              onClick={() => onTabSwitch('Library', libraryTabSheetId)}
              className={`px-4 py-1.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                isLibrary
                  ? 'border-gray-400 text-gray-300'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40'
              }`}
            >
              Library
            </button>
          )}
        </div>
      )}
    </div>
  )
}
