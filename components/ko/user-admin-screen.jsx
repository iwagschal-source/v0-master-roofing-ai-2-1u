"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Plus, Users, Shield, Mail } from "lucide-react"
import { UserCard } from "./user-card"
import { UserDetailScreen } from "./user-detail-screen"
import { userAdminAPI } from "@/lib/api/endpoints"

const roleColors = {
  CEO: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  CFO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Manager: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Coordinator: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  Estimator: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  System: "bg-gray-500/20 text-gray-400 border-gray-500/30",
}

export function UserAdminScreen({ onBack }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedUser, setSelectedUser] = useState(null)
  const [showAddUser, setShowAddUser] = useState(false)

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await userAdminAPI.listUsers()
      setUsers(response.users || [])
    } catch (err) {
      console.error("Failed to load users:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm ||
      user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.display_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = roleFilter === "all" ||
      user.role?.toLowerCase() === roleFilter.toLowerCase()

    const matchesStatus = statusFilter === "all" ||
      user.agent_status === statusFilter

    return matchesSearch && matchesRole && matchesStatus
  })

  // Get unique roles for filter
  const uniqueRoles = [...new Set(users.map(u => u.role).filter(Boolean))]

  // Handle user update from detail screen
  const handleUserUpdate = (updatedUser) => {
    setUsers(prev => prev.map(u =>
      u.user_agent_id === updatedUser.user_agent_id ? updatedUser : u
    ))
  }

  // Handle user creation
  const handleUserCreate = (newUser) => {
    setUsers(prev => [...prev, newUser])
    setShowAddUser(false)
  }

  // If a user is selected, show detail screen
  if (selectedUser) {
    return (
      <UserDetailScreen
        user={selectedUser}
        onBack={() => setSelectedUser(null)}
        onUpdate={handleUserUpdate}
        roleColors={roleColors}
      />
    )
  }

  // If adding a new user, show detail screen in create mode
  if (showAddUser) {
    return (
      <UserDetailScreen
        user={null}
        isCreateMode={true}
        onBack={() => setShowAddUser(false)}
        onCreate={handleUserCreate}
        roleColors={roleColors}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">User Management</h1>
              <p className="text-sm text-muted-foreground">
                {users.length} users • {users.filter(u => u.agent_status === 'active').length} active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="p-2 rounded-lg bg-secondary border border-border hover:bg-accent transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAddUser(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add User
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Loading users...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-400 mb-2">Failed to load users</p>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-secondary border border-border rounded-lg hover:bg-accent"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                  ? "No users match your filters"
                  : "No users found"}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUsers.map(user => (
              <UserCard
                key={user.user_agent_id}
                user={user}
                roleColors={roleColors}
                onClick={() => setSelectedUser(user)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
