import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, User, Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data.token);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data || 'Đăng nhập thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-8 w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold title-gradient">CRM Portal</h1>
          <p className="text-muted-foreground mt-2 text-center text-sm">Hệ thống quản trị khách hàng & Đặt bàn nhà hàng</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Tên đăng nhập</label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-muted-foreground" size={18} />
              <input 
                type="text" 
                className="input-field pl-10" 
                placeholder="admin_thanhhien"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-muted-foreground" size={18} />
              <input 
                type="password" 
                className="input-field pl-10" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-500/20 text-center"
            >
              {error}
            </motion.div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary w-full justify-center py-3.5 text-base mt-2 shadow-xl shadow-primary/30"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            {!loading && <LogIn size={18} />}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground/60 mt-8">
          © 2026 Restaurante CRM System. Designed by Antigravity AI.
        </p>
      </motion.div>

      <style dangerouslySetInnerHTML={{ __html: `
        .justify-center { justify-content: center; }
        .text-3xl { font-size: 1.875rem; }
        .font-medium { font-weight: 500; }
        .block { display: block; }
        .mb-8 { margin-bottom: 2rem; }
        .mt-2 { margin-top: 0.5rem; }
        .mt-8 { margin-top: 2rem; }
        .space-y-5 > * + * { margin-top: 1.25rem; }
        .pl-10 { padding-left: 2.5rem; }
        .text-sm { font-size: 0.875rem; }
        .text-xs { font-size: 0.75rem; }
        .rounded-2xl { border-radius: 1rem; }
        .py-3\\.5 { padding-top: 0.875rem; padding-bottom: 0.875rem; }
        .max-w-md { max-width: 28rem; }
        .relative { position: relative; }
        .absolute { position: absolute; }
        .text-red-400 { color: #f87171; }
        .bg-red-400\\/10 { background-color: rgba(248, 113, 113, 0.1); }
        .border-red-500\\/20 { border-color: rgba(239, 68, 68, 0.2); }
      `}} />
    </div>
  );
};

export default Login;
