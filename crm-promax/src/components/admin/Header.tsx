'use client';

import React from 'react';
import { Bell, Search, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Header() {
  return (
    <header className="glass-header h-20 px-8 flex items-center justify-between">
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

        {/* Profile */}
        <motion.div 
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 pl-4 border-l border-white/10 cursor-pointer"
        >
          <div className="text-right">
            <p className="text-sm font-bold">Admin ProMax</p>
            <p className="text-[10px] text-primary font-bold uppercase tracking-wider">Quản lý</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5">
            <div className="w-full h-full rounded-[10px] bg-background flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
