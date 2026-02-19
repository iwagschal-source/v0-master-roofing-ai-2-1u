"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Loader2, Trash2, AlertTriangle } from "lucide-react"
import { CompanySelector } from "./company-selector"

/**
 * Modal for creating and editing people
 *
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Callback to close the modal
 * @param {function} onSuccess - Callback after successful save/delete
 * @param {object|null} person - Person to edit, or null for add mode
 */
export function PersonModal({ isOpen, onClose, onSuccess, person }) {
  const isEditMode = !!person

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    companyId: null,
    title: "",
    phone: "",
    email: ""
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Populate form when person changes
  useEffect(() => {
    if (person) {
      // Handle name parsing - could be "First Last" format or separate fields
      let firstName = person.firstName || ""
      let lastName = person.lastName || ""

      // If name field exists and firstName/lastName don't, parse it
      if (person.name && !firstName && !lastName) {
        const parts = person.name.trim().split(/\s+/)
        firstName = parts[0] || ""
        lastName = parts.slice(1).join(" ") || ""
      }

      setFormData({
        firstName,
        lastName,
        companyId: person.companyId || null,
        title: person.title || "",
        phone: person.phone || "",
        email: person.email || ""
      })
    } else {
      setFormData({
        firstName: "",
        lastName: "",
        companyId: null,
        title: "",
        phone: "",
        email: ""
      })
    }
    setError(null)
    setShowDeleteConfirm(false)
  }, [person, isOpen])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCompanyChange = (companyId) => {
    setFormData(prev => ({ ...prev, companyId }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.firstName.trim()) {
      setError("First name is required")
      return
    }
    if (!formData.lastName.trim()) {
      setError("Last name is required")
      return
    }

    try {
      setSaving(true)
      setError(null)

      const payload = {
        type: "person",
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        name: `${formData.firstName.trim()} ${formData.lastName.trim()}`,
        companyId: formData.companyId,
        title: formData.title,
        phone: formData.phone,
        email: formData.email
      }

      if (isEditMode) {
        payload.id = person.id
      }

      const res = await fetch("/api/ko/contacts", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to ${isEditMode ? "update" : "create"} person`)
      }

      const data = await res.json()
      onSuccess(data.person || data)
      onClose()
    } catch (err) {
      console.error("Error saving person:", err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      setError(null)

      const res = await fetch(`/api/ko/contacts?type=person&id=${person.id}`, {
        method: "DELETE"
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete person")
      }

      onSuccess(null) // Signal deletion
      onClose()
    } catch (err) {
      console.error("Error deleting person:", err)
      setError(err.message)
      setShowDeleteConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  const fullName = `${formData.firstName} ${formData.lastName}`.trim()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {isEditMode ? "Edit Person" : "Add Person"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-secondary rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="px-6 py-4 bg-red-500/10 border-b border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-500">
                  Delete {fullName || "this person"}?
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This cannot be undone.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {deleting && <Loader2 className="w-3 h-3 animate-spin" />}
                    {deleting ? "Deleting..." : "Yes, Delete"}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto">
          <div className="px-6 py-4 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-500">
                {error}
              </div>
            )}

            {/* First & Last Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Company</label>
              <CompanySelector
                value={formData.companyId}
                onChange={handleCompanyChange}
                placeholder="Select a company..."
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Job title"
                className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Phone & Email Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 bg-secondary/30 border border-border/50 rounded-lg text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/20">
            <div>
              {isEditMode && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10 rounded-lg text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || deleting}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : (isEditMode ? "Save Changes" : "Add Person")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
