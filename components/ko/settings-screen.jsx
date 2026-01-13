"use client"

import { useTheme } from "@/components/theme-provider"
import { Moon, Sun, Monitor, UserPlus, Users, Trash2, Copy, Check, Mail, Shield, Clock, Loader2, Bot, ChevronRight } from "lucide-react"
import { useEffect, useState, useCallback } from "react"

/** @param {any} props */
export function SettingsScreen({ onOpenAgentPermissions }) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Team Management State
  const [invites, setInvites] = useState({ pending: [], accepted: [] })
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("viewer")
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  useEffect(() => {
    setMounted(true)
    fetchInvites()
  }, [])

  const fetchInvites = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/invites')
      const data = await res.json()
      setInvites(data)
    } catch (err) {
      console.error('Failed to fetch invites:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const sendInvite = async (e) => {
    e.preventDefault()
    if (!newEmail.trim()) return

    setIsSending(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newEmail.trim(),
          role: newRole,
          invitedBy: 'Admin', // Would come from auth in production
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send invite')
        return
      }

      setSuccess(`Invite sent to ${newEmail}`)
      setNewEmail("")
      fetchInvites()
    } catch (err) {
      setError('Failed to send invite')
    } finally {
      setIsSending(false)
    }
  }

  const revokeInvite = async (inviteId) => {
    try {
      const res = await fetch(`/api/admin/invites?id=${inviteId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        fetchInvites()
      }
    } catch (err) {
      console.error('Failed to revoke invite:', err)
    }
  }

  const copyInviteLink = async (token) => {
    const url = `${window.location.origin}/accept-invite?token=${token}`
    await navigator.clipboard.writeText(url)
    setCopiedId(token)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'editor': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default: return 'bg-muted text-muted-foreground border-border'
    }
  }

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ]

  return (
    <div className="w-full h-full flex items-start justify-center p-8 overflow-auto">
      <div className="w-full max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your application preferences</p>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium">Appearance</h2>
              <p className="text-sm text-muted-foreground">Customize how KO looks on your device</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isSelected = theme === option.value

                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`
                      flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all
                      ${isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                      }
                    `}
                  >
                    <div
                      className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      ${isSelected ? "bg-primary/20" : "bg-muted"}
                    `}
                    >
                      <Icon className={`w-6 h-6 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <span className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Admin Section */}
          <div className="pt-6 border-t border-border space-y-4">
            <div>
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Administration
              </h2>
              <p className="text-sm text-muted-foreground">Manage team and agent permissions</p>
            </div>

            {/* Agent Permissions Card */}
            {onOpenAgentPermissions && (
              <button
                onClick={onOpenAgentPermissions}
                className="w-full flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">Agent Permissions</p>
                    <p className="text-xs text-muted-foreground">Configure which agents each role can access</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            )}
          </div>

          {/* Team Management */}
          <div className="pt-6 border-t border-border space-y-4">
            <div>
              <h2 className="text-lg font-medium flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Management
              </h2>
              <p className="text-sm text-muted-foreground">Invite and manage team members</p>
            </div>

            {/* Invite Form */}
            <form onSubmit={sendInvite} className="space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@masterroofingus.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-3 py-2.5 bg-muted border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={isSending || !newEmail.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Invite
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Only @masterroofingus.com email addresses can be invited
              </p>
            </form>

            {/* Messages */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400">
                {success}
              </div>
            )}

            {/* Pending Invites */}
            {invites.pending.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Invites ({invites.pending.length})
                </h3>
                <div className="space-y-2">
                  {invites.pending.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{invite.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires {formatDate(invite.expiresAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(invite.role)}`}>
                          {invite.role}
                        </span>
                        <button
                          onClick={() => copyInviteLink(invite.token)}
                          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          title="Copy invite link"
                        >
                          {copiedId === invite.token ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={() => revokeInvite(invite.id)}
                          className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                          title="Revoke invite"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Team Members */}
            {invites.accepted.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Team Members ({invites.accepted.length})
                </h3>
                <div className="space-y-2">
                  {invites.accepted.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(member.name || member.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name || member.email}</p>
                          <p className="text-xs text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(member.role)}`}>
                          {member.role}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Joined {formatDate(member.acceptedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && invites.pending.length === 0 && invites.accepted.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No team members yet</p>
                <p className="text-xs mt-1">Invite your first team member above</p>
              </div>
            )}
          </div>

          {/* Additional Settings Sections */}
          <div className="pt-6 border-t border-border space-y-4">
            <div>
              <h2 className="text-lg font-medium">General</h2>
              <p className="text-sm text-muted-foreground">General application settings</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Sound Effects</p>
                  <p className="text-xs text-muted-foreground">Enable startup and interaction sounds</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Animations</p>
                  <p className="text-xs text-muted-foreground">Enable UI animations and transitions</p>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* App Info */}
          <div className="pt-6 border-t border-border">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Version:</span> 1.0.0
              </p>
              <p>
                <span className="font-medium text-foreground">Build:</span> 2025.01.12
              </p>
              <p className="text-xs pt-2">KO - Chief Agent Officer for Master Roofing</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
