"use client"

import { useState } from "react"
import { ArrowLeft, Save, Mail, Building2, User, Bell, FileText, AlertTriangle } from "lucide-react"
import { userAdminAPI } from "@/lib/api/endpoints"

const ROLES = ["CEO", "CFO", "Manager", "Coordinator", "Estimator", "System"]
const DEPARTMENTS = ["executive", "Operations", "Estimating", "Accounting", "IT"]

export function UserDetailScreen({ user, isCreateMode, onBack, onUpdate, onCreate, roleColors }) {
  const [formData, setFormData] = useState({
    user_email: user?.user_email || "",
    user_name: user?.user_name || "",
    display_name: user?.display_name || "",
    role: user?.role || "Estimator",
    department: user?.department || "Estimating",
    agent_status: user?.agent_status || "active",
    priority_level: user?.priority_level ?? 2,
    can_receive_nudges: user?.can_receive_nudges ?? true,
    can_receive_drafts: user?.can_receive_drafts ?? true,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(null)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (isCreateMode) {
        // Validate required fields for creation
        if (!formData.user_email || !formData.user_name) {
          setError("Email and full name are required")
          setSaving(false)
          return
        }

        const newUser = await userAdminAPI.createUser({
          user_email: formData.user_email,
          user_name: formData.user_name,
          display_name: formData.display_name || formData.user_name.split(" ")[0],
          role: formData.role,
          department: formData.department,
          priority_level: formData.priority_level,
          can_receive_nudges: formData.can_receive_nudges,
          can_receive_drafts: formData.can_receive_drafts,
        })

        setSuccess("User created successfully!")
        if (onCreate) onCreate(newUser)
      } else {
        // Update existing user
        const updatedUser = await userAdminAPI.updateUser(user.user_agent_id, {
          display_name: formData.display_name,
          role: formData.role,
          department: formData.department,
          agent_status: formData.agent_status,
          priority_level: formData.priority_level,
          can_receive_nudges: formData.can_receive_nudges,
          can_receive_drafts: formData.can_receive_drafts,
        })

        setSuccess("Changes saved successfully!")
        if (onUpdate) onUpdate(updatedUser)
      }
    } catch (err) {
      console.error("Failed to save user:", err)
      setError(err.message || "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!confirm("Are you sure you want to deactivate this user?")) return

    setSaving(true)
    try {
      await userAdminAPI.deactivateUser(user.user_agent_id)
      const updatedUser = { ...user, agent_status: "inactive" }
      if (onUpdate) onUpdate(updatedUser)
      onBack()
    } catch (err) {
      setError(err.message || "Failed to deactivate user")
    } finally {
      setSaving(false)
    }
  }

  const initials = formData.display_name
    ? formData.display_name.slice(0, 2).toUpperCase()
    : formData.user_name?.slice(0, 2).toUpperCase() || "??"

  const roleColorClass = roleColors?.[formData.role] || "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 flex-1">
            <div className={`
              w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold
              ${formData.agent_status === "inactive" ? "bg-gray-500/20 text-gray-400" : "bg-primary/20 text-primary"}
            `}>
              {initials}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {isCreateMode ? "Add New User" : formData.user_name || "Edit User"}
              </h1>
              {!isCreateMode && (
                <p className="text-sm text-muted-foreground">{user.user_agent_id}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : isCreateMode ? "Create User" : "Save Changes"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Status Messages */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <p className="text-emerald-400">{success}</p>
            </div>
          )}

          {/* Profile Section */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-muted-foreground" />
              Profile
            </h2>

            <div className="space-y-4">
              {/* Email (read-only for existing users) */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={formData.user_email}
                    onChange={(e) => handleChange("user_email", e.target.value)}
                    disabled={!isCreateMode}
                    placeholder="user@masterroofingus.com"
                    className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                {isCreateMode && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be @masterroofingus.com
                  </p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.user_name}
                  onChange={(e) => handleChange("user_name", e.target.value)}
                  disabled={!isCreateMode}
                  placeholder="First Last"
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={formData.display_name}
                  onChange={(e) => handleChange("display_name", e.target.value)}
                  placeholder="How KO addresses this user"
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleChange("role", e.target.value)}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Department
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange("department", e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    {DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Permissions Section */}
          <section className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-5 h-5 text-muted-foreground" />
              Permissions
            </h2>

            <div className="space-y-4">
              {/* Priority Level */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Priority Level
                </label>
                <select
                  value={formData.priority_level ?? ""}
                  onChange={(e) => handleChange("priority_level", e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Not set</option>
                  <option value="1">1 - High (CEO/CFO)</option>
                  <option value="2">2 - Medium (Manager)</option>
                  <option value="3">3 - Low (Standard)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Affects notification order and agent response priority
                </p>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <Bell className={`w-5 h-5 ${formData.can_receive_nudges ? "text-emerald-400" : "text-gray-500"}`} />
                  <div>
                    <p className="font-medium">Receive Nudges</p>
                    <p className="text-sm text-muted-foreground">Agent can send reminders and follow-ups</p>
                  </div>
                </div>
                <button
                  onClick={() => handleChange("can_receive_nudges", !formData.can_receive_nudges)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${formData.can_receive_nudges ? "bg-emerald-500" : "bg-gray-600"}
                  `}
                >
                  <span className={`
                    absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                    ${formData.can_receive_nudges ? "left-7" : "left-1"}
                  `} />
                </button>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="flex items-center gap-3">
                  <FileText className={`w-5 h-5 ${formData.can_receive_drafts ? "text-emerald-400" : "text-gray-500"}`} />
                  <div>
                    <p className="font-medium">Receive Drafts</p>
                    <p className="text-sm text-muted-foreground">Agent can generate email drafts for this user</p>
                  </div>
                </div>
                <button
                  onClick={() => handleChange("can_receive_drafts", !formData.can_receive_drafts)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${formData.can_receive_drafts ? "bg-emerald-500" : "bg-gray-600"}
                  `}
                >
                  <span className={`
                    absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                    ${formData.can_receive_drafts ? "left-7" : "left-1"}
                  `} />
                </button>
              </div>
            </div>
          </section>

          {/* Status Section (edit mode only) */}
          {!isCreateMode && (
            <section className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Status</h2>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">Account Status</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.agent_status === "active"
                      ? "User is active and can interact with KO"
                      : "User is deactivated"}
                  </p>
                </div>
                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
                  ${formData.agent_status === "active"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-500/20 text-gray-400"}
                `}>
                  {formData.agent_status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              {formData.agent_status === "active" && (
                <div className="mt-4 pt-4 border-t border-border">
                  <button
                    onClick={handleDeactivate}
                    disabled={saving}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Deactivate this user
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  )
}
