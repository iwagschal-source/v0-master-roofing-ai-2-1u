"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Building2, Loader2 } from "lucide-react"

/**
 * Reusable company selector dropdown
 * Fetches companies from /api/ko/contacts?type=companies
 *
 * @param {string} value - Selected company ID
 * @param {function} onChange - Callback with selected company ID
 * @param {boolean} disabled - Disable the selector
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Additional CSS classes
 */
export function CompanySelector({
  value,
  onChange,
  disabled = false,
  placeholder = "Select a company...",
  className = ""
}) {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  // Fetch companies on mount
  useEffect(() => {
    async function fetchCompanies() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/ko/contacts?type=companies')
        if (!res.ok) throw new Error(`Failed to fetch companies: ${res.status}`)
        const data = await res.json()
        setCompanies(data.companies || [])
      } catch (err) {
        console.error('Error fetching companies:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchCompanies()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (isOpen && !e.target.closest('.company-selector')) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const selectedCompany = companies.find(c => c.id === value)

  const handleSelect = (companyId) => {
    onChange(companyId)
    setIsOpen(false)
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div className={`company-selector relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm transition-colors ${
          disabled || loading
            ? "opacity-50 cursor-not-allowed"
            : "hover:border-primary/50 cursor-pointer"
        } ${isOpen ? "border-primary/50" : ""}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
          ) : (
            <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <span className={`truncate ${selectedCompany ? "text-foreground" : "text-muted-foreground"}`}>
            {loading ? "Loading companies..." : (selectedCompany?.name || placeholder)}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedCompany && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
            >
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
          {error ? (
            <div className="px-3 py-2 text-sm text-red-500">
              Error loading companies
            </div>
          ) : companies.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No companies found
            </div>
          ) : (
            companies.map((company) => (
              <button
                key={company.id}
                type="button"
                onClick={() => handleSelect(company.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 transition-colors ${
                  company.id === value ? "bg-primary/10 text-primary" : ""
                }`}
              >
                <div className="font-medium">{company.name}</div>
                {(company.city || company.state) && (
                  <div className="text-xs text-muted-foreground">
                    {[company.city, company.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
