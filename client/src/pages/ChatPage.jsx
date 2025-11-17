import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth.js';
import useSocket from '../hooks/useSocket.js';
import { api } from '../utils/api.js';
import RoomList from '../components/RoomList.jsx';
import UserList from '../components/UserList.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import ConnectionStatus from '../components/ConnectionStatus.jsx';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const { notifications, unreadByRoom, presenceMap } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchRooms = useCallback(async () => {
    setLoadingRooms(true);
    try {
      const { data } = await api.get('/api/rooms');
      setRooms(data);
    } catch (error) {
      toast.error('Failed to load rooms');
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const { data } = await api.get('/api/users');
      setUsers(data);
      return data;
    } catch (error) {
      toast.error('Failed to load users');
      return [];
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    fetchUsers();
  }, [fetchRooms, fetchUsers]);

  const defaultRoomId = useMemo(
    () => rooms.find((room) => room.slug === 'global')?._id,
    [rooms]
  );

  const totalUnread = useMemo(
    () => Object.values(unreadByRoom || {}).reduce((sum, value) => sum + value, 0),
    [unreadByRoom]
  );

  const outletContext = useMemo(
    () => ({
      rooms,
      refreshRooms: fetchRooms,
      users,
      refreshUsers: fetchUsers,
      defaultRoomId,
      loadingRooms,
      loadingUsers,
    }),
    [rooms, users, fetchRooms, fetchUsers, defaultRoomId, loadingRooms, loadingUsers]
  );

  return (
    <div className="chat-page">
      <aside className="chat-page__sidebar">
        <RoomList
          rooms={rooms}
          isLoading={loadingRooms}
          onRoomCreated={(room) => {
            setRooms((prev) => [room, ...prev.filter((item) => item._id !== room._id)]);
            fetchRooms();
          }}
          defaultRoomId={defaultRoomId}
          unreadByRoom={unreadByRoom}
        />
        <UserList
          users={users}
          presenceMap={presenceMap}
          currentUserId={user?.id}
          isLoading={loadingUsers}
        />
      </aside>
      <section className="chat-page__content">
        <header className="chat-page__header">
          <div>
            <p>Hello, {user?.displayName}</p>
            <ConnectionStatus />
          </div>
          <div className="chat-page__header-actions">
            <NotificationBell notifications={notifications} unreadTotal={totalUnread} />
            <button onClick={logout}>Logout</button>
          </div>
        </header>
        <Outlet context={outletContext} />
      </section>
    </div>
  );
};

export default ChatPage;


