import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types.js';
import { Send, MessageSquare, Sparkles } from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  focusTrigger?: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isOpen,
  onToggle,
  focusTrigger = 0
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickEmotes = ['🔥', '👏', '🤑', '😎', '🃏', '🍀', '😭', '🤯'];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Automatically focus input whenever chat opens or Enter key triggers focus
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 15);
      return () => clearTimeout(timer);
    }
  }, [isOpen, focusTrigger]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    inputRef.current?.focus();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      inputRef.current?.blur();
      onToggle();
    }
  };

  const handleSendEmote = (emote: string) => {
    onSendMessage(emote);
    inputRef.current?.focus();
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
      <button onClick={onToggle} className="chat-toggle-btn" title="Tekan Enter untuk membuka Chat">
        <MessageSquare size={18} />
        <span>Chat & Dealer Log</span>
        <span className="chat-key-badge">Enter ↵</span>
        {unreadCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '1px 6px',
              borderRadius: '999px',
              marginLeft: '2px',
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
                background: 'rgba(255,255,255,0.08)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Tutup Chat (Esc)"
            >
              <span>Tutup</span>
              <span style={{ fontSize: '9px', opacity: 0.65 }}>[Esc]</span>
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
                type="button"
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
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ketik pesan... (Enter kirim, Esc tutup)"
              className="chat-input"
              autoFocus
            />
            <button type="submit" className="btn-send" title="Kirim Pesan (Enter)">
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
