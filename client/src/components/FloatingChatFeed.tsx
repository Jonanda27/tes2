import React, { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '../types.js';
import { X, Bot, User, Sparkles } from 'lucide-react';

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
          onDismiss={onDismiss}
          onOpenChat={onOpenChat}
        />
      ))}
    </div>
  );
};

const AUTO_DISMISS_MS = 3800;
const FADE_OUT_MS = 350;

const FloatingChatBubble: React.FC<{
  item: FloatingChatItem;
  onDismiss: (id: string) => void;
  onOpenChat: () => void;
}> = ({ item, onDismiss, onOpenChat }) => {
  const { msg } = item;
  const [isLeaving, setIsLeaving] = useState(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  // Auto dismiss reliably once per bubble mount (never reset on parent re-renders)
  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsLeaving(true);
    }, AUTO_DISMISS_MS - FADE_OUT_MS);

    const removeTimer = setTimeout(() => {
      onDismissRef.current(item.id);
    }, AUTO_DISMISS_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [item.id]);

  const handleManualDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLeaving(true);
    setTimeout(() => {
      onDismissRef.current(item.id);
    }, 180);
  };

  const handleClickBubble = () => {
    onOpenChat();
    onDismissRef.current(item.id);
  };

  // Check if message is a pure emote / emoji
  const isEmojiOnly = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Extended_Pictographic}|\s)+$/u.test(msg.message.trim());

  return (
    <div
      className={`floating-chat-bubble ${msg.isSystem ? 'system-msg' : ''} ${isLeaving ? 'leaving' : ''}`}
      onClick={handleClickBubble}
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
          onClick={handleManualDismiss}
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
