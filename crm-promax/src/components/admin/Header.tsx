'use client';

import React, { useState } from 'react';
import { Bell, Search, User, LogOut, Settings, UserCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const ROLE_MAP: Record<number, { label: string, color: string }> = {
  0: { label: 'Quản Trị Viên', color: 'text-amber-400' },
  1: { label: 'Nhân Viên', color: 'text-blue-400' },
  2: { label: 'Thu Ngân', color: 'text-emerald-400' },
  3: { label: 'Bếp Trưởng', color: 'text-orange-400' },
  4: { label: 'Phục Vụ', color: 'text-violet-400' },
};

export default function Header() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const router = useRouter();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/profile')).data
  });

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout failed', e);
    } finally {
      clearAuth();
      toast.success('Đăng xuất thành công');
      router.push('/admin/login');
    }
  };

  return (
    <header className="glass-header h-20 px-8 flex items-center justify-between z-40">
      {/* Search Bar */}
      <div className="relative w-96 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Tìm kiếm đơn hàng, khách hoặc báo cáo... (Ctrl+K)" 
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
        />
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-6">
        {/* Notifications */}
        <button className="relative p-2.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full ring-4 ring-background"></span>
        </button>

        {/* Profile with Dropdown */}
        <div className="relative">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              {isLoading ? (
                <div className="h-4 w-24 bg-white/5 animate-pulse rounded mb-1" />
              ) : (
                <p className="text-sm font-bold truncate max-w-[150px]">{profile?.fullName || 'Anonymous'}</p>
              )}
              <p className={cn("text-[10px] font-black uppercase tracking-wider", ROLE_MAP[profile?.role]?.color || 'text-primary')}>
                {ROLE_MAP[profile?.role]?.label || 'QUẢN LÝ'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-lg shadow-primary/20">
              <div className="w-full h-full rounded-[10px] bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden">
                {profile?.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-primary" />
                )}
              </div>
            </div>
          </motion.div>

          <AnimatePresence>
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 bg-[#12141a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="px-3 py-2 mb-2 border-b border-white/5">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">Tài khoản</p>
                  </div>
                  
                  <Link href="/admin/profile" onClick={() => setIsDropdownOpen(false)}>
                    <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-bold group">
                      <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                         <UserCircle size={16} />
                      </div>
                      Hồ sơ cá nhân
                    </div>
                  </Link>

                  {profile?.role === 0 && (
                    <Link href="/admin/settings" onClick={() => setIsDropdownOpen(false)}>
                      <div className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm font-bold group">
                        <div className="p-2 bg-white/5 rounded-lg text-muted-foreground group-hover:bg-white group-hover:text-black transition-all">
                          <Settings size={16} />
                        </div>
                        Cài đặt hệ thống
                      </div>
                    </Link>
                  )}

                  <div className="mt-2 pt-2 border-t border-white/5">
                    <button 
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors text-sm font-bold group"
                    >
                      <div className="p-2 bg-red-500/10 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-all">
                        {isLoggingOut ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
                      </div>
                      {isLoggingOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
