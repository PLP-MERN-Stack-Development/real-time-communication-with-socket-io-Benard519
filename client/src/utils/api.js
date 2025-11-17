import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
});

export const fetchRoomMessages = ({ roomId, before, limit = 20 }) =>
  api.get(`/api/rooms/${roomId}/messages`, {
    params: {
      before,
      limit,
    },
  });

export const markMessageRead = (messageId) => api.post(`/api/messages/${messageId}/read`);

export const fetchUnreadCounts = () => api.get('/api/unread');



