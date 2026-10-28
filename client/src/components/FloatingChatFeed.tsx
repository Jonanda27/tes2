import React, { useEffect } from 'react';
import { ChatMessage } from '../types.js';
import { MessageSquare, X, Bot, User, Sparkles } from 'lucide-react';

export interface FloatingChatItem {
  id: string;
  msg: ChatMessage;
}

interface FloatingChatFeedProps {
  items: FloatingChatItem[];
  onDismiss: (id: string) => void;
  onOpenChat: () => void;
}

export const FloatingChatFeed: React.FC<FloatingChatFeedProps> = ({
  items,
  onDismiss,
  onOpenChat
}) => {
  return (
    <div className="floating-chat-container">
      {items.map((item) => (
        <FloatingChatBubble
          key={item.id}
          item={item}
          onDismiss={() => onDismiss(item.id)}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  );
};

const FloatingChatBubble: React.FC<{
  item: FloatingChatItem;
  onDismiss: () => void;
  onOpenChat: () => void;
}> = ({ item, onDismiss, onOpenChat }) => {
  const { msg } = item;

  // Auto dismiss after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  // Check if message is a pure emote / emoji
  const isEmojiOnly = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic}|\s)+$/u.test(msg.message.trim());

  return (
    <div
      className={`floating-chat-bubble ${msg.isSystem ? 'system-msg' : ''}`}
      onClick={onOpenChat}
      title="Klik untuk membuka chat penuh"
    >
      {/* Header with Avatar and Sender */}
      <div className="floating-chat-header">
        <div className="floating-chat-sender">
          {msg.isSystem ? (
            <div className="floating-chat-avatar system">
              <Sparkles size={11} />
            </div>
          ) : msg.senderName.toLowerCase().includes('bot') ? (
            <div className="floating-chat-avatar bot">
              <Bot size={11} />
            </div>
          ) : (
            <div className="floating-chat-avatar user">
              <User size={11} />
            </div>
          )}
          <span className="floating-chat-name">
            {msg.senderName}
          </span>
          {msg.senderSeat !== undefined && (
            <span className="floating-chat-seat">#{msg.senderSeat + 1}</span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="floating-chat-close"
          title="Tutup notifikasi"
        >
          <X size={12} />
        </button>
      </div>

      {/* Message Body */}
      <div className={`floating-chat-body ${isEmojiOnly ? 'emoji-large' : ''}`}>
        {msg.message}
      </div>

      {/* Progress countdown bar */}
      <div className="floating-chat-timer-bar" />
    </div>
  );
};
