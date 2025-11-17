import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import useSocket from '../hooks/useSocket.js';
import { api } from '../utils/api.js';

const RoomList = ({ rooms = [], isLoading, onRoomCreated, defaultRoomId, unreadByRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { emitWithAck } = useSocket();

  const activeRoomId = useMemo(() => {
    if (location.pathname.startsWith('/dm')) return null;
    return params.roomId || defaultRoomId || null;
  }, [params.roomId, defaultRoomId, location.pathname]);

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) => {
        if (a.slug === 'global') return -1;
        if (b.slug === 'global') return 1;
        return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      }),
    [rooms]
  );

  const handleSelectRoom = async (room) => {
    if (!room?._id) return;
    const roomId = room._id?.toString?.() || room._id;
    try {
      await emitWithAck('joinRoom', { roomId });
    } catch (error) {
      toast.error(error.message || 'Unable to join room');
    }
    navigate(`/rooms/${roomId}`);
  };

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    if (!roomName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/api/rooms', { name: roomName.trim() });
      const normalizedId = data._id?.toString?.() || data._id;
      onRoomCreated?.({ ...data, _id: normalizedId });
      await emitWithAck('joinRoom', { roomId: normalizedId });
      navigate(`/rooms/${normalizedId}`);
      setRoomName('');
      toast.success(`Room ${data.name} created`);
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to create room';
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    if (!sortedRooms.length || params.roomId || location.pathname.startsWith('/dm')) return;
    if (defaultRoomId) {
      navigate(`/rooms/${defaultRoomId}`, { replace: true });
    }
  }, [defaultRoomId, params.roomId, sortedRooms.length, navigate, location.pathname]);

  return (
    <div className="room-list">
      <div className="room-list__header">
        <h3>Rooms</h3>
        {isLoading && <span>Loading…</span>}
      </div>
      <ul>
        {sortedRooms.map((room) => {
          const roomId = room._id?.toString?.() || room._id;
          const unread = unreadByRoom?.[roomId];
          return (
            <li
              key={roomId}
              className={roomId === activeRoomId ? 'active' : ''}
              onClick={() => handleSelectRoom(room)}
            >
              <span>{room.name}</span>
              {Boolean(unread) && <span className="badge">{unread}</span>}
            </li>
          );
        })}
      </ul>
      <form className="room-list__form" onSubmit={handleCreateRoom}>
        <input
          placeholder="Create new room"
          value={roomName}
          onChange={(event) => setRoomName(event.target.value)}
        />
        <button type="submit" disabled={!roomName.trim() || creating}>
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>
    </div>
  );
};

export default RoomList;


