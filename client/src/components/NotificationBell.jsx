import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ notifications = [], unreadTotal = 0 }) => {
  const [open, setOpen] = useState(false);
  const latest = useMemo(() => notifications.slice(0, 10), [notifications]);

  return (
    <div className="notification-bell">
      <button className="notification-bell__button" onClick={() => setOpen((prev) => !prev)}>
        🔔
        {unreadTotal > 0 && <span className="notification-bell__badge">{unreadTotal}</span>}
      </button>
      {open && (
        <div className="notification-bell__panel">
          <h4>Notifications</h4>
          {latest.length === 0 && <p>No notifications yet</p>}
          <ul>
            {latest.map((item, index) => (
              <li key={`${item.ts}-${index}`}>
                <p className="notification-bell__text">
                  {item.message || `${item.fromName ?? 'Someone'}: ${item.text ?? ''}`}
                </p>
                <span>{formatDistanceToNow(new Date(item.ts || Date.now()), { addSuffix: true })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;



