import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket.js';

const randomId = () => {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const MessageInput = ({ roomId, onSendMessage, disabled = false, placeholder = 'Type a message' }) => {
  const [value, setValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [failedMessages, setFailedMessages] = useState([]);
  const typingTimeoutRef = useRef(null);
  const { socket } = useSocket();

  const emitTyping = (isTyping) => {
    if (!socket || !roomId) return;
    socket.emit('typing', { roomId, isTyping });
  };

  const handleChange = (event) => {
    setValue(event.target.value);
    emitTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => emitTyping(false), 1000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!value.trim() || !roomId || !onSendMessage) return;
    const clientMessageId = randomId();
    setIsSending(true);
    try {
      await onSendMessage(value.trim(), clientMessageId);
      setValue('');
    } catch (error) {
      toast.error(error.message || 'Failed to send message');
      setFailedMessages((prev) => [...prev, { id: clientMessageId, text: value.trim() }]);
    } finally {
      setIsSending(false);
      emitTyping(false);
    }
  };

  const retryMessage = async (failed) => {
    if (!failed) return;
    setIsSending(true);
    try {
      await onSendMessage(failed.text, failed.id);
      setFailedMessages((prev) => prev.filter((item) => item.id !== failed.id));
    } catch (error) {
      toast.error(error.message || 'Retry failed');
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      if (socket && roomId) {
        socket.emit('typing', { roomId, isTyping: false });
      }
    };
  }, [socket, roomId]);

  return (
    <div className="message-input">
      {failedMessages.length > 0 && (
        <div className="message-input__retry">
          {failedMessages.map((item) => (
            <div key={item.id} className="message-input__retry-row">
              <span>Failed: {item.text}</span>
              <button onClick={() => retryMessage(item)}>Retry</button>
            </div>
          ))}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <textarea
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled || !roomId}
          rows={2}
        />
        <button type="submit" disabled={disabled || isSending || !value.trim()}>
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default MessageInput;


