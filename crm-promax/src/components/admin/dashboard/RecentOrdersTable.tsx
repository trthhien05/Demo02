'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, MoreHorizontal, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Order {
  id: number;
  status: number;
  createdAt: string;
  totalAmount: number;
  diningTable: { tableNumber: string };
  orderItems: any[];
}

const statusStyles: Record<number, { label: string, css: string }> = {
  0: { label: 'Pending', css: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  1: { label: 'Preparing', css: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { label: 'Served', css: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  3: { label: 'Completed', css: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  4: { label: 'Cancelled', css: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function RecentOrdersTable() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['live-feed-orders'],
    queryFn: async () => {
      const res = await apiClient.get('/order');
      return res.data;
    },
    refetchInterval: 15000 // Poll every 15s to keep dashboard alive
  });

  const recentOrders = orders.slice(0, 5); // Take top 5

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
         <Link href="/admin/orders">
           <button className="text-xs font-bold text-primary hover:text-primary-foreground transition-colors px-4 py-2 rounded-full border border-primary/20 hover:bg-primary">
              View All
           </button>
         </Link>
      </div>

      <div className="w-full overflow-x-auto flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary mb-2" size={24} />
            <span className="text-xs text-muted-foreground">Syncing feed...</span>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center opacity-50">
            <span className="text-sm">No recent orders</span>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Order ID</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Table</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="pb-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right w-16">Act</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {recentOrders.map((order, idx) => {
                  const statusInfo = statusStyles[order.status] || statusStyles[0];
                  return (
                    <motion.tr 
                      key={order.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 font-bold">ORD-#{order.id.toString().padStart(4, '0')}
                        <div className="text-[10px] text-muted-foreground font-normal">{order.orderItems?.length || 0} items</div>
                      </td>
                      <td className="py-4">
                        <span className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 font-bold text-xs inline-block">
                          {order.diningTable?.tableNumber || 'N/A'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold border flex items-center w-fit gap-1.5", statusInfo.css)}>
                          {order.status === 1 && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
                          {order.status === 0 && <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-ping" />}
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-4 font-mono font-bold text-xs">
                        ${order.totalAmount?.toFixed(2)}
                      </td>
                      <td className="py-4 text-right">
                        <Link href="/admin/orders">
                          <button className="p-2 hover:bg-white/10 rounded-xl transition-colors text-muted-foreground hover:text-white">
                              <MoreHorizontal size={16} />
                          </button>
                        </Link>
                      </td>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
