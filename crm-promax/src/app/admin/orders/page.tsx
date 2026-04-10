'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Filter, Search } from 'lucide-react';

export default function OrdersPage() {
  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Transaction Center</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Order <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Management</span></h1>
        </motion.div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
            <Filter size={18} /> Filters
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Plus size={18} className="text-primary group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">New POS Order</span>
            </div>
          </motion.button>
        </div>
      </div>

      <motion.div 
         initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
         className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center text-center"
      >
         <ShoppingCart size={64} className="text-white/10 mb-6 group-hover:scale-110 transition-transform duration-500" />
         <h3 className="text-2xl font-bold mb-2">POS Interface & Orders Setup</h3>
         <p className="text-muted-foreground max-w-md mx-auto">This module will connect your waitstaff layer and kitchen tracking logic. Hook it up to TanStack Query for live data.</p>
      </motion.div>
    </div>
  );
}
