import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import PrivateChatPage from './pages/PrivateChatPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<ChatPage />}>
          <Route index element={<RoomPage />} />
          <Route path="rooms/:roomId" element={<RoomPage />} />
          <Route path="dm/:userId" element={<PrivateChatPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;



