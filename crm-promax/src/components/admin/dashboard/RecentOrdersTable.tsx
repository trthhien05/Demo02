'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const liveOrders = [
  { id: '#ORD-001', table: 'T-12', items: 3, time: '2 mins ago', status: 'Pending', total: '$145.00' },
  { id: '#ORD-002', table: 'V-01', items: 5, time: '8 mins ago', status: 'Preparing', total: '$320.00' },
  { id: '#ORD-003', table: 'T-04', items: 2, time: '12 mins ago', status: 'Preparing', total: '$85.00' },
  { id: '#ORD-004', table: 'T-15', items: 8, time: '18 mins ago', status: 'Served', total: '$540.00' },
  { id: '#ORD-005', table: 'V-02', items: 1, time: '25 mins ago', status: 'Completed', total: '$95.00' },
];

const statusStyles: Record<string, string> = {
  'Pending': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Preparing': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Served': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Completed': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default function RecentOrdersTable() {
  return (
    <div className="glass rounded-[2rem] p-8 border-white/5 space-y-6 flex-1 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between">
         <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
               <ChefHat className="text-primary" size={24} />
               Live Kitchen Feed
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Real-time order execution status</p>
         </div>
         <button className="text-xs font-bold text-primary hover:text-primary-foreground transition-colors px-4 py-2 rounded-full border border-primary/20 hover:bg-primary">
            View All
         </button>
      </div>

      <div className="w-full overflow-x-auto flex-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-white/5">
              <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Order ID</th>
              <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Table</th>
              <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Time</th>
              <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right w-16">Act</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <AnimatePresence>
              {liveOrders.map((order, idx) => (
                <motion.tr 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group hover:bg-white/5 transition-colors"
                >
                  <td className="py-4 font-bold">{order.id}
                    <div className="text-[10px] text-muted-foreground font-normal">{order.items} items</div>
                  </td>
                  <td className="py-4">
                    <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 font-bold text-xs inline-block">
                      {order.table}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold border flex items-center w-fit gap-1.5", statusStyles[order.status])}>
                       {order.status === 'Preparing' && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                       {order.status === 'Pending' && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />}
                       {order.status}
                    </span>
                  </td>
                  <td className="py-4 text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1.5 pt-[22px]">
                    <Clock size={12} /> {order.time}
                  </td>
                  <td className="py-4 text-right">
                     <button className="p-2 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-white">
                        <MoreHorizontal size={16} />
                     </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
