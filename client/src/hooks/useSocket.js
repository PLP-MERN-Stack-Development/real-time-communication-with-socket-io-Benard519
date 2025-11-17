import { useContext } from 'react';
import { SocketContext } from '../context/SocketContext.jsx';

const useSocket = () => useContext(SocketContext);

export default useSocket;



