import { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import Loader from '../components/shared/Loader.jsx';
import { fetchRoomMessages } from '../utils/api.js';

const getRoomIdFromMessage = (message) => {
  if (!message) return null;
  if (typeof message.roomId === 'string') return message.roomId;
  if (message.roomId?._id) return message.roomId._id.toString();
  return message.roomId?.toString?.() || null;
};

const RoomPage = () => {
  const { rooms, defaultRoomId, loadingRooms } = useOutletContext();
  const params = useParams();
  const { user } = useAuth();
  const { socket, emitWithAck, typingState, setActiveRoomId } = useSocket();
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState(null);

  const activeRoomId = params.roomId || defaultRoomId;
  const activeRoom = useMemo(
    () => rooms.find((room) => (room._id?.toString?.() || room._id) === activeRoomId),
    [rooms, activeRoomId]
  );

  const loadMessages = useCallback(
    async ({ roomId, before } = {}) => {
      if (!roomId) return;
      setLoading(true);
      try {
        const { data } = await fetchRoomMessages({
          roomId,
          before,
          limit: 20,
        });
        setMessages((prev) => (before ? [...data, ...prev] : data));
        if (data.length < 20) {
          setHasMore(false);
        }
      } catch (error) {
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!activeRoomId) return;
    setCurrentRoomId(activeRoomId);
    setMessages([]);
    setHasMore(true);
    setActiveRoomId(activeRoomId);
    loadMessages({ roomId: activeRoomId });
  }, [activeRoomId, loadMessages, setActiveRoomId]);

  useEffect(() => {
    if (!activeRoomId) return;
    emitWithAck('joinRoom', { roomId: activeRoomId }).catch(() => {});
  }, [activeRoomId, emitWithAck]);

  useEffect(() => {
    if (!socket || !currentRoomId) return;
    const handleIncoming = (incoming) => {
      if (getRoomIdFromMessage(incoming) !== currentRoomId) return;
      setMessages((prev) => [...prev, incoming]);
    };
    const handleMessageRead = ({ messageId, by }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg._id !== messageId) return msg;
          if ((msg.readBy || []).some((id) => String(id) === String(by))) return msg;
          return { ...msg, readBy: [...(msg.readBy || []), by] };
        })
      );
    };
    socket.on('newMessage', handleIncoming);
    socket.on('messageRead', handleMessageRead);
    return () => {
      socket.off('newMessage', handleIncoming);
      socket.off('messageRead', handleMessageRead);
    };
  }, [socket, currentRoomId]);

  useEffect(() => {
    if (!socket || !currentRoomId || !user) return;
    messages.forEach((message) => {
      if (!message?._id) return;
      if (String(message.from) === String(user.id)) return;
      const alreadyRead = (message.readBy || []).some((id) => String(id) === String(user.id));
      if (!alreadyRead) {
        socket.emit('messageRead', { messageId: message._id, roomId: currentRoomId });
      }
    });
  }, [messages, socket, currentRoomId, user]);

  if (loadingRooms && !rooms.length) {
    return (
      <div className="page-center">
        <Loader label="Loading rooms..." />
      </div>
    );
  }

  if (!activeRoomId) {
    return (
      <div className="room-page__placeholder">
        <p>Select or create a room to start chatting.</p>
      </div>
    );
  }

  const handleSendMessage = (text, clientMessageId) =>
    emitWithAck('sendMessage', { roomId: currentRoomId, text, clientMessageId });

  const typingUsers = typingState?.[currentRoomId] || {};

  return (
    <div className="room-page">
      <header>
        <h2>{activeRoom?.name || 'Room'}</h2>
        <p>{activeRoom?.participants?.length || 0} participants</p>
      </header>
      <MessageList
        messages={messages}
        currentUserId={user?.id}
        onLoadMore={() =>
          loadMessages({
            roomId: currentRoomId,
            before: messages[0]?.ts || messages[0]?.createdAt,
          })
        }
        hasMore={hasMore}
        isLoading={loading}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        roomId={currentRoomId}
        onSendMessage={handleSendMessage}
        placeholder={`Message ${activeRoom?.name || 'room'}`}
      />
    </div>
  );
};

export default RoomPage;


