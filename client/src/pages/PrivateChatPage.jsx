import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import MessageList from '../components/MessageList.jsx';
import MessageInput from '../components/MessageInput.jsx';
import TypingIndicator from '../components/TypingIndicator.jsx';
import Loader from '../components/shared/Loader.jsx';
import { api, fetchRoomMessages } from '../utils/api.js';

const PrivateChatPage = () => {
  const { users, refreshUsers } = useOutletContext();
  const { user } = useAuth();
  const { emitWithAck, socket, typingState, setActiveRoomId } = useSocket();
  const params = useParams();
  const navigate = useNavigate();
  const targetUserId = params.userId;
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const targetUser = useMemo(() => users.find((item) => item.id === targetUserId), [users, targetUserId]);

  const ensureTargetUser = useCallback(async () => {
    if (targetUser) return targetUser;
    const updated = (await refreshUsers?.()) || [];
    return updated.find((item) => item.id === targetUserId) || users.find((item) => item.id === targetUserId);
  }, [targetUser, refreshUsers, users, targetUserId]);

  const ensureRoom = useCallback(async () => {
    const resolvedUser = await ensureTargetUser();
    if (!resolvedUser) {
      toast.error('User not found');
      navigate('/');
      return null;
    }
    try {
      const { data } = await api.post('/api/rooms/private', { userId: targetUserId });
      const normalizedRoom = { ...data, _id: data._id?.toString?.() || data._id };
      setRoom(normalizedRoom);
      setActiveRoomId(normalizedRoom._id);
      try {
        await emitWithAck('joinRoom', { roomId: normalizedRoom._id });
      } catch {
        // socket join is best-effort; failures will be retried later
      }
      return normalizedRoom;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Unable to start private chat');
      navigate('/');
      return null;
    }
  }, [ensureTargetUser, navigate, targetUserId, setActiveRoomId]);

  const loadMessages = useCallback(
    async ({ roomId, before } = {}) => {
      if (!roomId) return;
      setLoading(true);
      try {
        const { data } = await fetchRoomMessages({ roomId, before, limit: 20 });
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
    let mounted = true;
    const bootstrap = async () => {
      const existingRoom = await ensureRoom();
      if (!existingRoom) return;
      if (!mounted) return;
      loadMessages({ roomId: existingRoom._id });
    };
    bootstrap();
    return () => {
      mounted = false;
    };
  }, [ensureRoom, loadMessages]);

  useEffect(() => {
    if (!socket || !room?._id) return;
    const handleIncoming = (incoming) => {
      const roomId = typeof incoming.roomId === 'string' ? incoming.roomId : incoming.roomId?._id?.toString();
      if (roomId !== room._id) return;
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
  }, [socket, room]);

  useEffect(() => {
    if (!socket || !room?._id || !user) return;
    messages.forEach((message) => {
      if (!message?._id) return;
      if (String(message.from) === String(user.id)) return;
      const alreadyRead = (message.readBy || []).some((id) => String(id) === String(user.id));
      if (!alreadyRead) {
        socket.emit('messageRead', { messageId: message._id, roomId: room._id });
      }
    });
  }, [messages, socket, room, user]);

  if (loading && !room) {
    return (
      <div className="page-center">
        <Loader label="Preparing private chat..." />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-page__placeholder">
        <p>Select someone to start a private conversation.</p>
      </div>
    );
  }

  const typingUsers = typingState?.[room._id] || {};

  const handleSendMessage = (text, clientMessageId) =>
    emitWithAck('privateMessage', { toUserId: targetUserId, text, clientMessageId });

  return (
    <div className="room-page">
      <header>
        <h2>Chat with {targetUser?.displayName || 'Friend'}</h2>
        <p>Private room</p>
      </header>
      <MessageList
        messages={messages}
        currentUserId={user?.id}
        onLoadMore={() =>
          loadMessages({
            roomId: room._id,
            before: messages[0]?.ts || messages[0]?.createdAt,
          })
        }
        hasMore={hasMore}
        isLoading={loading}
      />
      <TypingIndicator typingUsers={typingUsers} />
      <MessageInput
        roomId={room._id}
        onSendMessage={handleSendMessage}
        placeholder={`Message ${targetUser?.displayName || 'user'}`}
      />
    </div>
  );
};

export default PrivateChatPage;


