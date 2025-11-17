import { io } from 'socket.io-client';
import { API_BASE_URL } from '../utils/api.js';

export const createSocketConnection = (token) =>
  io(API_BASE_URL, {
    autoConnect: false,
    transports: ['websocket'],
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    auth: {
      token,
    },
  });



