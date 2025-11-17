import { memo, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import Avatar from './shared/Avatar.jsx';

const MessageList = ({
  messages,
  currentUserId,
  onLoadMore,
  hasMore,
  isLoading,
  autoScroll = true,
}) => {
  const containerRef = useRef(null);
  const stickToBottomRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const nearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
      stickToBottomRef.current = nearBottom;
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!autoScroll || !containerRef.current) return;
    if (stickToBottomRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  return (
    <div className="message-list" ref={containerRef}>
      {hasMore && messages.length > 0 && (
        <button className="link-button" onClick={onLoadMore} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load previous messages'}
        </button>
      )}
      {messages.length === 0 && <p className="message-list__empty">No messages yet. Be the first to say hi!</p>}
      {messages.map((message) => {
        const authorId =
          typeof message.from === 'object' && message.from?._id ? message.from._id : message.from;
        return (
          <MessageBubble
            key={message._id || message.meta?.clientMessageId}
            message={message}
            isMine={String(authorId) === String(currentUserId)}
          />
        );
      })}
    </div>
  );
};

const MessageBubble = memo(({ message, isMine }) => {
  const readByCount = message.readBy?.length || 0;
  const timestamp = formatDistanceToNow(new Date(message.ts || message.createdAt || Date.now()), {
    addSuffix: true,
  });

  return (
    <div className={clsx('message-bubble', { 'message-bubble--self': isMine })}>
      {!isMine && (
        <Avatar
          name={message.fromName}
          color={message.avatarColor || '#60a5fa'}
          size={36}
        />
      )}
      <div className="message-bubble__body">
        <div className="message-bubble__meta">
          <span className="message-bubble__author">{isMine ? 'You' : message.fromName}</span>
          <span className="message-bubble__time">{timestamp}</span>
        </div>
        <p className="message-bubble__text">{message.text}</p>
        {isMine && (
          <span className="message-bubble__status">
            {readByCount > 1 ? `Read by ${readByCount - 1}` : 'Sent'}
          </span>
        )}
      </div>
    </div>
  );
});

export default MessageList;


