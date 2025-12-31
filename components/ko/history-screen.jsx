import { useEffect, useState } from "react";
import { HistoryList } from "./history-list";
import { apiClient } from "@/lib/api/endpoints";
import { Loader2 } from "lucide-react";

export function HistoryScreen({ onSelectHistoryItem, selectedHistoryId }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await apiClient.history.getHistory({ 
          page_size: 50 // Get last 50 sessions
        });
        
        console.log("Fetched history items:", result);
        
        // Transform sessions into history items
        const transformedItems = result.sessions.map(session => ({
          id: session.session_id,
          session_id: session.session_id,
          label: session.preview || "Untitled Conversation",
          preview: session.preview,
          timestamp: new Date(session.updated_at),
          created_at: new Date(session.created_at),
          message_count: session.message_count,
          type: "chat", // Default type for chat sessions
          source: "Chat History",
          user_id: session.user_id,
        }));
        
        setHistoryItems(transformedItems);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        setError(err.message || "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleSelectItem = async (item) => {
    try {
      // Fetch full session data with all messages
      // const session = await apiClient.history.getConversation(item.session_id);
      
      console.log("Selected session:", item.session_id);
      
      // Pass the full session to parent component
      onSelectHistoryItem({
        ...item,
        /* messages: session.messages,
        session, */
      });
    } catch (err) {
      console.error("Failed to load conversation:", err);
      // Still pass the item, but without messages
      onSelectHistoryItem(item);
    }
  };

  const handleDeleteItem = async (sessionId) => {
    try {
      await apiClient.history.deleteConversation(sessionId);
      
      // Remove from local state
      setHistoryItems(prev => prev.filter(item => item.session_id !== sessionId));
      
      console.log("Deleted session:", sessionId);
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-medium text-foreground">History</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Your conversation history with KO
        </p>
      </div>
      
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading history...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-red-400 mb-2">Failed to load history</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : (
        <HistoryList 
          items={historyItems} 
          selectedId={selectedHistoryId} 
          onSelectItem={handleSelectItem}
          onDeleteItem={handleDeleteItem}
        />
      )}
    </div>
  );
}
