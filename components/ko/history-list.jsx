"use client";

import * as React from "react";
import { MessageSquare, Trash2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/useChat";

/**
 * Format relative time (e.g., "2 hours ago", "Yesterday")
 * Accepts: Date | string | number
 */
function formatRelativeTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";

  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Simple confirmation dialog component
 */
function ConfirmDialog({ isOpen, onClose, onConfirm, item }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-background border border-border rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Delete Conversation
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Are you sure you want to delete this conversation? This action cannot
            be undone.
          </p>

          {item && (
            <div className="p-3 bg-accent rounded border border-border">
              <p className="text-sm font-medium text-foreground">
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {item.message_count} messages
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-border hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * HistoryList component - displays chat sessions
 */
export function HistoryList({
  items = [],
  selectedId,
  onSelectItem,
  onDeleteItem,
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [itemToDelete, setItemToDelete] = React.useState(null);

  const handleDeleteClick = (e, item) => {
    e.stopPropagation(); // Prevent triggering onSelectItem
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete && onDeleteItem) {
      onDeleteItem(itemToDelete.session_id);
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const closeDialog = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleSelect = (item) => {
    if (onSelectItem) onSelectItem(item);
  };

  const handleKeyDown = (e, item) => {
    // Enter or Space triggers selection
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleSelect(item);
    }
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <MessageSquare className="w-8 h-8 text-[#9b9b9b] mb-2" />
              <p className="text-[#9b9b9b] text-sm">No conversations yet</p>
              <p className="text-[#9b9b9b] text-xs mt-1">
                Start chatting with KO to see your history here
              </p>
            </div>
          ) : (
            items.map((item) => {
              const id = item.session_id; // ✅ Consistent ID

              return (
                <div
                  key={id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelect(item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  className={`w-full text-left p-3 rounded-lg border transition-all hover:bg-accent group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    selectedId === id
                      ? "border-l-4 border-l-primary bg-accent"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Chat Icon */}
                    <div className="flex-shrink-0 mt-1 text-[#9b9b9b]">
                      <MessageSquare className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-[#ececec] truncate flex-1">
                          {item.label}
                        </p>

                        {/* Delete button - only show on hover */}
                        {onDeleteItem && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(e, item)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>

                      {item.preview && (
                        <p className="text-xs text-[#9b9b9b] line-clamp-2 mb-1">
                          {item.preview}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-[#9b9b9b]">
                          {formatRelativeTime(item.timestamp)}
                        </p>

                        {item.message_count > 0 && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0 bg-blue-500/10 text-blue-400 border-blue-500/30"
                          >
                            {item.message_count}{" "}
                            {item.message_count === 1 ? "msg" : "msgs"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={closeDialog}
        onConfirm={confirmDelete}
        item={itemToDelete}
      />
    </>
  );
}
