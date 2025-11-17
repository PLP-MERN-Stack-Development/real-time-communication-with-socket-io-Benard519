import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './shared/Avatar.jsx';

const UserList = ({ users = [], presenceMap = {}, currentUserId, isLoading = false }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return users
      .filter((user) => user.id !== currentUserId)
      .filter((user) => user.displayName.toLowerCase().includes(query.toLowerCase()));
  }, [users, currentUserId, query]);

  const getPresence = (user) => presenceMap[user.id] || user.presence || { online: false };

  return (
    <div className="user-list">
      <div className="user-list__header">
        <h3>People</h3>
        {isLoading ? (
          <span>Loading…</span>
        ) : (
          <input placeholder="Search" value={query} onChange={(event) => setQuery(event.target.value)} />
        )}
      </div>
      <ul>
        {filtered.map((user) => {
          const presence = getPresence(user);
          const isOnline = presence?.online ?? presence?.status === 'online';
          return (
            <li key={user.id} onClick={() => navigate(`/dm/${user.id}`)}>
              <div className="user-list__info">
                <Avatar name={user.displayName} color={user.avatarColor} size={32} />
                <div>
                  <p>{user.displayName}</p>
                  <span className={isOnline ? 'online' : 'offline'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <button>Chat</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default UserList;


