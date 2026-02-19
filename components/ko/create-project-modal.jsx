"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Building2, User, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Create New Project Modal
 * @param {{isOpen: boolean, onClose: () => void, onSuccess: (project: any) => void}} props
 */
export function CreateProjectModal({ isOpen, onClose, onSuccess }) {
  // Form state
  const [formData, setFormData] = useState({
    projectName: "",
    companyId: "",
    contactId: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  })

  // Data state
  const [companies, setCompanies] = useState([])
  const [contacts, setContacts] = useState([])

  // Loading/error state
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Fetch companies when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCompanies()
      // Reset form when opening
      setFormData({
        projectName: "",
        companyId: "",
        contactId: "",
        address: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
      })
      setContacts([])
      setError(null)
    }
  }, [isOpen])

  // Fetch contacts when company changes
  useEffect(() => {
    if (formData.companyId) {
      fetchContacts(formData.companyId)
      setFormData(prev => ({ ...prev, contactId: "" }))
    } else {
      setContacts([])
    }
  }, [formData.companyId])

  async function fetchCompanies() {
    try {
      setLoadingCompanies(true)
      const res = await fetch('/api/ko/contacts?type=companies')
      if (!res.ok) throw new Error('Failed to load companies')
      const data = await res.json()
      setCompanies(data.companies || [])
    } catch (err) {
      console.error('Error loading companies:', err)
      setError('Failed to load companies')
    } finally {
      setLoadingCompanies(false)
    }
  }

  async function fetchContacts(companyId) {
    try {
      setLoadingContacts(true)
      const res = await fetch(`/api/ko/contacts?type=people&companyId=${companyId}`)
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(data.people || [])
    } catch (err) {
      console.error('Error loading contacts:', err)
      setError('Failed to load contacts')
    } finally {
      setLoadingContacts(false)
    }
  }

  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (error) setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    // Validate required fields
    if (!formData.projectName.trim()) {
      setError('Project name is required')
      return
    }
    if (!formData.companyId) {
      setError('Please select a company')
      return
    }
    if (!formData.contactId) {
      setError('Please select a contact')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/ko/project-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: formData.projectName.trim(),
          companyId: formData.companyId,
          contactId: formData.contactId,
          address: formData.address.trim() || null,
          city: formData.city.trim() || null,
          state: formData.state.trim() || null,
          zip: formData.zip.trim() || null,
          notes: formData.notes.trim() || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409 && data.duplicate) {
          setError('A project with this name already exists')
        } else {
          setError(data.error || 'Failed to create project')
        }
        return
      }

      // Success - call onSuccess with the new project
      onSuccess(data.project)
    } catch (err) {
      console.error('Error creating project:', err)
      setError('Failed to create project. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Create New Project</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="projectName"
              value={formData.projectName}
              onChange={handleChange}
              placeholder="e.g. Downtown Office Complex"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
          </div>

          {/* Company Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <Building2 className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
              Company <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                disabled={loadingCompanies}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">Select a company...</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {loadingCompanies && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Contact Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <User className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
              Contact <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="contactId"
                value={formData.contactId}
                onChange={handleChange}
                disabled={!formData.companyId || loadingContacts}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer disabled:opacity-50"
              >
                <option value="">
                  {!formData.companyId 
                    ? 'Select a company first...' 
                    : loadingContacts 
                      ? 'Loading contacts...'
                      : contacts.length === 0 
                        ? 'No contacts for this company'
                        : 'Select a contact...'}
                </option>
                {contacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.email ? `(${c.email})` : ''}</option>
                ))}
              </select>
              {loadingContacts && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Address Section */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              <MapPin className="w-4 h-4 inline mr-1.5 text-muted-foreground" />
              Address <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Street address"
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors mb-2"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="City"
                className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="State"
                className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              />
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                placeholder="Zip"
                className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Notes <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Project notes or description..."
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={cn(
                "flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium transition-colors",
                submitting ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90"
              )}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
