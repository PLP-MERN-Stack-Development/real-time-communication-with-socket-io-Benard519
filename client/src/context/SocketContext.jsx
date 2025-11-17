import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { createSocketConnection } from '../socket/index.js';
import useAuth from '../hooks/useAuth.js';
import {
  playNotificationSound,
  requestNotificationPermission,
  showDesktopNotification,
} from '../utils/notifications.js';
import { fetchUnreadCounts } from '../utils/api.js';

export const SocketContext = createContext(null);

const mapMessageRoomId = (message) => {
  if (!message) return null;
  if (typeof message.roomId === 'string') return message.roomId;
  if (message.roomId?._id) return message.roomId._id.toString();
  return message.roomId?.toString?.() || null;
};

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [typingState, setTypingState] = useState({});
  const [presenceMap, setPresenceMap] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadByRoom, setUnreadByRoom] = useState({});
  const activeRoomRef = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!token) {
      setUnreadByRoom({});
      return;
    }
    const loadUnread = async () => {
      try {
        const { data } = await fetchUnreadCounts();
        const map = {};
        data.forEach((entry) => {
          map[entry._id?.toString?.() || entry._id] = entry.unread;
        });
        setUnreadByRoom(map);
      } catch (error) {
        console.warn('Unable to load unread counts', error);
      }
    };
    loadUnread();
  }, [token]);

  useEffect(() => {
    if (!token || !user) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setTypingState({});
      setPresenceMap({});
      return;
    }

    const instance = createSocketConnection(token);
    socketRef.current = instance;
    setSocket(instance);

    const handleConnect = () => {
      setIsConnected(true);
      setIsReconnecting(false);
      instance.emit('reconnect', {}, () => {});
      instance.emit('presence');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleReconnectAttempt = () => {
      setIsReconnecting(true);
    };
    const handleReconnectFailed = () => setIsReconnecting(false);
    const handleReconnected = () => setIsReconnecting(false);

    const handleNewMessage = (message) => {
      const roomId = mapMessageRoomId(message);
      if (!roomId) return;
      if (activeRoomRef.current === roomId) return;
      setUnreadByRoom((prev) => ({
        ...prev,
        [roomId]: (prev[roomId] || 0) + 1,
      }));
    };

    const handleNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 25));
      if (notification.fromName === user?.displayName) {
        return;
      }
      playNotificationSound();
      if (notification.type === 'message' || notification.type === 'private') {
        const title = notification.type === 'private' ? 'Private message' : 'New room message';
        toast(`${notification.fromName}: ${notification.text ?? ''}`.trim(), { icon: '💬' });
        showDesktopNotification({
          title,
          body: `${notification.fromName}: ${notification.text ?? ''}`,
        });
      } else if (notification.type === 'user-joined' || notification.type === 'user-left') {
        toast(notification.message, { icon: notification.type === 'user-joined' ? '👋' : '🚪' });
      }
    };

    const handleTyping = ({ roomId, userId, username, isTyping }) => {
      if (!roomId || !userId) return;
      setTypingState((prev) => {
        const currentRoom = prev[roomId] ? { ...prev[roomId] } : {};
        if (isTyping) {
          currentRoom[userId] = username;
        } else {
          delete currentRoom[userId];
        }
        return { ...prev, [roomId]: currentRoom };
      });
    };

    const handlePresence = (payload) => {
      if (!payload?.userId) return;
      setPresenceMap((prev) => ({
        ...prev,
        [payload.userId]: payload,
      }));
    };

    const handleAuthEvent = (payload) => {
      if (!payload?.rooms) return;
      setUnreadByRoom((prev) => {
        const next = { ...prev };
        payload.rooms.forEach((roomId) => {
          const id = roomId?.toString?.() || roomId;
          if (typeof next[id] === 'undefined') {
            next[id] = 0;
          }
        });
        return next;
      });
    };

    instance.on('connect', handleConnect);
    instance.on('disconnect', handleDisconnect);
    instance.io.on('reconnect_attempt', handleReconnectAttempt);
    instance.io.on('reconnect_failed', handleReconnectFailed);
    instance.io.on('reconnect', handleReconnected);
    instance.on('newMessage', handleNewMessage);
    instance.on('notification', handleNotification);
    instance.on('typing', handleTyping);
    instance.on('presence', handlePresence);
    instance.on('auth', handleAuthEvent);

    instance.connect();

    return () => {
      instance.off('connect', handleConnect);
      instance.off('disconnect', handleDisconnect);
      instance.off('newMessage', handleNewMessage);
      instance.off('notification', handleNotification);
      instance.off('typing', handleTyping);
      instance.off('presence', handlePresence);
      instance.io.off('reconnect_attempt', handleReconnectAttempt);
      instance.io.off('reconnect_failed', handleReconnectFailed);
      instance.io.off('reconnect', handleReconnected);
      instance.off('auth', handleAuthEvent);
      instance.disconnect();
    };
  }, [token, user]);

  const setActiveRoomId = useCallback((roomId) => {
    activeRoomRef.current = roomId;
    if (!roomId) return;
    setUnreadByRoom((prev) => ({
      ...prev,
      [roomId]: 0,
    }));
  }, []);

  const emitWithAck = useCallback(
    (event, payload, timeout = 8000) =>
      new Promise((resolve, reject) => {
        if (!socketRef.current) {
          reject(new Error('Socket is not connected'));
          return;
        }
        let settled = false;
        const timer = setTimeout(() => {
          if (!settled) {
            settled = true;
            reject(new Error('Request timed out'));
          }
        }, timeout);

        socketRef.current.emit(event, payload, (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          if (response?.ok === false) {
            reject(new Error(response.error || 'Socket action failed'));
          } else {
            resolve(response);
          }
        });
      }),
    []
  );

  const value = useMemo(
    () => ({
      socket,
      isConnected,
      isReconnecting,
      typingState,
      presenceMap,
      notifications,
      unreadByRoom,
      emitWithAck,
      setActiveRoomId,
    }),
    [socket, isConnected, isReconnecting, typingState, presenceMap, notifications, unreadByRoom, emitWithAck]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};


