import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types.js';
import { Send, MessageSquare, Sparkles } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggle
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickEmotes = ['🔥', '👏', '🤑', '😎', '🃏', '🍀', '😭', '🤯'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleSendEmote = (emote: string) => {
    onSendMessage(emote);
  };

  const userMsgCount = messages.filter(m => !m.isSystem).length;
  const [lastReadCount, setLastReadCount] = useState(userMsgCount);

  useEffect(() => {
    if (isOpen) {
      setLastReadCount(userMsgCount);
    }
  }, [isOpen, userMsgCount]);

  const unreadCount = isOpen ? 0 : Math.max(0, userMsgCount - lastReadCount);

  return (
    <>
      {/* Floating Toggle Button */}
      <button onClick={onToggle} className="chat-toggle-btn">
        <MessageSquare size={18} />
        <span>Chat & Dealer Log</span>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '999px',
              marginLeft: '4px',
              boxShadow: '0 0 10px rgba(239, 68, 68, 0.6)'
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Slide-out Drawer */}
      {isOpen && (
        <div className="chat-drawer">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} />
              <span>Dealer Log & Chat</span>
            </div>
            <button
              onClick={onToggle}
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.08)'
              }}
            >
              Tutup
            </button>
          </div>

          {/* Messages Feed */}
          <div className="chat-feed">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-bubble ${msg.isSystem ? 'system' : ''}`}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#94a3b8',
                    marginBottom: '2px'
                  }}
                >
                  <strong style={{ color: msg.isSystem ? '#f59e0b' : '#38bdf8' }}>
                    {msg.senderName}
                  </strong>
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div>{msg.message}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Emote Row */}
          <div className="chat-emotes-row">
            {quickEmotes.map((em) => (
              <button
                key={em}
                onClick={() => handleSendEmote(em)}
                className="btn-emote"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSubmit} className="chat-form">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ketik pesan..."
              className="chat-input"
            />
            <button type="submit" className="btn-send">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
