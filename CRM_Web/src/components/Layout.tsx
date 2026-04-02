import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useSignalR } from '../hooks/useSignalR';
import { Bell, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Layout: React.FC = () => {
  const { notifications, setNotifications } = useSignalR('http://localhost:5013/notificationHub');

  const removeNotification = (index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Background Decor */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 blur-[100px] rounded-full"></div>
      </div>

      {/* Real-time Notifications Toast */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 w-80">
        <AnimatePresence>
          {notifications.map((n, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="glass p-4 shadow-2xl border-l-4 border-l-primary flex gap-3 items-start relative overflow-hidden group"
            >
              <div className="p-2 bg-primary/20 rounded-lg text-primary">
                <Bell size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{n.user}</span>
                  <button onClick={() => removeNotification(i)} className="text-muted-foreground hover:text-white">
                    <X size={14} />
                  </button>
                </div>
                <p className="text-sm mt-1 text-zinc-200">{n.message}</p>
                <div className="text-[10px] text-muted-foreground mt-2">
                  {n.timestamp.toLocaleTimeString()}
                </div>
              </div>
              {/* Progress bar effect */}
              <div className="absolute bottom-0 left-0 h-0.5 bg-primary/30 animate-progress"></div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Sidebar />
      <main className="flex-1 ml-64 p-8 min-h-screen">
        <Outlet />
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-background { background-color: hsl(var(--background)); }
        .text-foreground { color: hsl(var(--foreground)); }
        .min-h-screen { min-h: 100vh; }
        .inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
        .pointer-events-none { pointer-events: none; }
        .-z-10 { z-index: -10; }
        .overflow-hidden { overflow: hidden; }
        .ml-64 { margin-left: 16rem; }
        .p-8 { padding: 2rem; }
        .bg-primary\\/20 { background-color: hsla(var(--primary), 0.2); }
        .bg-blue-500\\/10 { background-color: rgba(59, 130, 246, 0.1); }
        .blur-\\[120px\\] { filter: blur(120px); }
        .blur-\\[100px\\] { filter: blur(100px); }
        .rounded-full { border-radius: 9999px; }
        .w-\\[40\\%\\] { width: 40%; }
        .h-\\[40\\%\\] { height: 40%; }
        .w-\\[30\\%\\] { width: 30%; }
        .h-\\[30\\%\\] { height: 30%; }

        .z-\\[100\\] { z-index: 100; }
        .top-6 { top: 1.5rem; }
        .right-6 { right: 1.5rem; }
        .w-80 { width: 20rem; }
        .border-l-4 { border-left-width: 4px; }
        .border-l-primary { border-left-color: hsl(var(--primary)); }
        .animate-progress {
          width: 100%;
          animation: progress 5s linear forwards;
        }
        @keyframes progress {
          from { width: 100%; }
          to { width: 0%; }
        }
        .text-\\[10px\\] { font-size: 10px; }
      `}} />
    </div>
  );
};

export default Layout;
