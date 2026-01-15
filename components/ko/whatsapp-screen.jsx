"use client"

import { useState, useEffect } from "react"
import {
  MessageCircle,
  Phone,
  Plus,
  ExternalLink,
  Search,
  Star,
  StarOff,
  Trash2,
  Edit2,
  X,
  Check,
  Users,
  Clock
} from "lucide-react"
import Image from "next/image"

// Default contacts for Master Roofing (can be customized)
const DEFAULT_CONTACTS = [
  { id: "1", name: "Isaac Wagschal", phone: "+17185551234", favorite: true, category: "Team" },
  { id: "2", name: "Office Main", phone: "+17185555678", favorite: true, category: "Team" },
]

// Contact categories
const CATEGORIES = ["All", "Team", "GC", "Supplier", "Client", "Other"]

// Format phone for display
function formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }
  return phone
}

// Format phone for WhatsApp link (just digits)
function formatPhoneForLink(phone) {
  return phone.replace(/\D/g, '')
}

// Contact Card Component
function ContactCard({ contact, onOpen, onEdit, onDelete, onToggleFavorite }) {
  return (
    <div className="group flex items-center gap-3 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-md transition-all">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
        {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {contact.name}
          </p>
          {contact.favorite && (
            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-zinc-500 truncate">{formatPhone(contact.phone)}</p>
        {contact.category && (
          <span className="text-xs text-zinc-400 bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 rounded mt-1 inline-block">
            {contact.category}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onToggleFavorite(contact)}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          title={contact.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          {contact.favorite ? (
            <StarOff className="w-4 h-4 text-zinc-400" />
          ) : (
            <Star className="w-4 h-4 text-zinc-400" />
          )}
        </button>
        <button
          onClick={() => onEdit(contact)}
          className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg transition-colors"
          title="Edit contact"
        >
          <Edit2 className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={() => onDelete(contact)}
          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          title="Delete contact"
        >
          <Trash2 className="w-4 h-4 text-zinc-400 hover:text-red-500" />
        </button>
      </div>

      {/* Open WhatsApp Button */}
      <button
        onClick={() => onOpen(contact)}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        Chat
      </button>
    </div>
  )
}

// Add/Edit Contact Modal
function ContactModal({ contact, onSave, onClose }) {
  const [name, setName] = useState(contact?.name || "")
  const [phone, setPhone] = useState(contact?.phone || "")
  const [category, setCategory] = useState(contact?.category || "Other")

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    onSave({
      id: contact?.id || Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      category,
      favorite: contact?.favorite || false
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {contact ? "Edit Contact" : "Add Contact"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg"
          >
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact name"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {CATEGORIES.filter(c => c !== "All").map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {contact ? "Save Changes" : "Add Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function WhatsAppScreen() {
  const [contacts, setContacts] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [recentChats, setRecentChats] = useState([])

  // Load contacts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("whatsapp_contacts")
    if (saved) {
      try {
        setContacts(JSON.parse(saved))
      } catch {
        setContacts(DEFAULT_CONTACTS)
      }
    } else {
      setContacts(DEFAULT_CONTACTS)
    }

    // Load recent chats
    const recent = localStorage.getItem("whatsapp_recent")
    if (recent) {
      try {
        setRecentChats(JSON.parse(recent))
      } catch {
        setRecentChats([])
      }
    }
  }, [])

  // Save contacts to localStorage
  const saveContacts = (newContacts) => {
    setContacts(newContacts)
    localStorage.setItem("whatsapp_contacts", JSON.stringify(newContacts))
  }

  // Open WhatsApp chat
  const openWhatsApp = (contact) => {
    const phoneNumber = formatPhoneForLink(contact.phone)
    const url = `https://web.whatsapp.com/send?phone=${phoneNumber}`
    window.open(url, '_blank', 'noopener,noreferrer')

    // Add to recent chats
    const recent = [
      { ...contact, lastOpened: Date.now() },
      ...recentChats.filter(c => c.id !== contact.id)
    ].slice(0, 5)
    setRecentChats(recent)
    localStorage.setItem("whatsapp_recent", JSON.stringify(recent))
  }

  // Add/Edit contact
  const handleSaveContact = (contact) => {
    if (editingContact) {
      saveContacts(contacts.map(c => c.id === contact.id ? contact : c))
    } else {
      saveContacts([...contacts, contact])
    }
    setShowModal(false)
    setEditingContact(null)
  }

  // Delete contact
  const handleDeleteContact = (contact) => {
    if (confirm(`Delete ${contact.name}?`)) {
      saveContacts(contacts.filter(c => c.id !== contact.id))
    }
  }

  // Toggle favorite
  const handleToggleFavorite = (contact) => {
    saveContacts(contacts.map(c =>
      c.id === contact.id ? { ...c, favorite: !c.favorite } : c
    ))
  }

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
    const matchesCategory = selectedCategory === "All" || contact.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Sort: favorites first, then alphabetically
  const sortedContacts = [...filteredContacts].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1
    if (!a.favorite && b.favorite) return 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp</h1>
            <p className="text-xs text-zinc-500">Quick access to contacts</p>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingContact(null)
            setShowModal(true)
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="px-6 py-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-10 pr-4 py-2 bg-zinc-100 dark:bg-zinc-700 border-0 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                  selectedCategory === cat
                    ? 'bg-green-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Recent Chats */}
        {recentChats.length > 0 && searchQuery === "" && selectedCategory === "All" && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-medium text-zinc-500">Recent</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {recentChats.map(contact => (
                <button
                  key={contact.id}
                  onClick={() => openWhatsApp(contact)}
                  className="flex flex-col items-center gap-2 p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-md transition-all min-w-[80px]"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-medium">
                    {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[70px]">
                    {contact.name.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Contacts List */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-zinc-400" />
            <h2 className="text-sm font-medium text-zinc-500">
              Contacts ({sortedContacts.length})
            </h2>
          </div>

          {sortedContacts.length > 0 ? (
            <div className="space-y-2">
              {sortedContacts.map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onOpen={openWhatsApp}
                  onEdit={(c) => {
                    setEditingContact(c)
                    setShowModal(true)
                  }}
                  onDelete={handleDeleteContact}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-zinc-500 mb-4">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    setEditingContact(null)
                    setShowModal(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Contact
                </button>
              )}
            </div>
          )}
        </div>

        {/* Open WhatsApp Web Button */}
        <div className="mt-8 p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Open WhatsApp Web</h3>
              <p className="text-sm text-green-100">Access all your chats in a new tab</p>
            </div>
            <button
              onClick={() => window.open('https://web.whatsapp.com', '_blank', 'noopener,noreferrer')}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <ContactModal
          contact={editingContact}
          onSave={handleSaveContact}
          onClose={() => {
            setShowModal(false)
            setEditingContact(null)
          }}
        />
      )}
    </div>
  )
}
