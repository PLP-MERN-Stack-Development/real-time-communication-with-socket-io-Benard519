import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth.js';

const LoginPage = () => {
  const { login, loading, token } = useAuth();
  const [username, setUsername] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!username.trim()) return;
    try {
      await login(username.trim());
      toast.success('Welcome!');
      const redirect = location.state?.from?.pathname || '/';
      navigate(redirect, { replace: true });
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Socket.io Chat</h1>
        <p>Enter a username to start chatting in real-time.</p>
        <input
          placeholder="Pick a username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={32}
        />
        <button type="submit" disabled={loading || username.trim().length < 3}>
          {loading ? 'Signing in...' : 'Enter chat'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;



