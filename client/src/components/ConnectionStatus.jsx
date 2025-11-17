import useSocket from '../hooks/useSocket.js';

const ConnectionStatus = () => {
  const { isConnected, isReconnecting } = useSocket();
  const label = isReconnecting ? 'Reconnecting…' : isConnected ? 'Connected' : 'Offline';
  return <span className={`connection-status connection-status--${isConnected ? 'online' : 'offline'}`}>{label}</span>;
};

export default ConnectionStatus;



