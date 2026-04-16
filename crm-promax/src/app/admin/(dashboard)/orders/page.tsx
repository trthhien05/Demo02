'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Plus, Filter, Search, Loader2, Clock, CheckCircle2, ChefHat, RotateCcw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

// Maps to .NET Enums
type OrderStatus = 0 | 1 | 2 | 3 | 4; 
// 0: Pending, 1: Preparing, 2: Served, 3: Completed, 4: Cancelled

interface OrderItem {
  id: number;
  menuItemId: number;
  quantity: number;
  unitPrice: number;
  menuItem: {
    name: string;
  };
}

interface Order {
  id: number;
  diningTableId: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  diningTable: {
    tableNumber: string;
  };
  orderItems: OrderItem[];
}

const STATUS_MAP: Record<number, { label: string, color: string, icon: React.ReactNode }> = {
  0: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: <Clock size={14} /> },
  1: { label: 'Preparing', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', icon: <ChefHat size={14} /> },
  2: { label: 'Served', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <CheckCircle2 size={14} /> },
  3: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle2 size={14} /> },
  4: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: <RotateCcw size={14} /> },
};

export default function OrdersPage() {
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => {
      const res = await apiClient.get('/order');
      return res.data;
    },
    refetchInterval: 15000 // Refetch every 15s to keep kitchen stream alive (fallback to signalR later)
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Transaction Center</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Order <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Management</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search table or ID..." 
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-colors focus:bg-white/10 w-[220px]"
            />
          </div>
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

      {isLoading ? (
         <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
            <p className="text-muted-foreground animate-pulse">Syncing Active Orders...</p>
         </div>
      ) : orders.length === 0 ? (
         <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center text-center">
            <ShoppingCart size={64} className="text-white/10 mb-6" />
            <h3 className="text-xl font-bold mb-2">Kitchen is Idle</h3>
            <p className="text-muted-foreground">No active orders found for today.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {orders.map((order, idx) => {
               const status = STATUS_MAP[order.status] || STATUS_MAP[0];
               return (
                 <motion.div 
                   key={order.id}
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ delay: idx * 0.05 }}
                   className="glass rounded-[1.5rem] p-6 border-white/5 hover:border-primary/30 transition-colors shadow-2xl relative overflow-hidden group"
                 >
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/20 transition-colors" />
                   
                   <div className="flex items-start justify-between mb-4 relative z-10">
                      <div>
                         <h3 className="text-2xl font-black">Table {order.diningTable.tableNumber}</h3>
                         <p className="text-xs text-muted-foreground font-mono mt-1">ORD-#{order.id.toString().padStart(5, '0')}</p>
                      </div>
                      <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider", status.color)}>
                         {status.icon}
                         {status.label}
                      </div>
                   </div>

                   <div className="space-y-3 mb-6 relative z-10">
                      {order.orderItems.slice(0, 3).map((item, i) => (
                         <div key={i} className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground flex items-center gap-2">
                               <span className="text-foreground/50 text-xs">x{item.quantity}</span> 
                               {item.menuItem.name}
                            </span>
                            <span className="font-medium font-mono">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                         </div>
                      ))}
                      {order.orderItems.length > 3 && (
                         <div className="text-xs text-primary font-bold italic">
                            + {order.orderItems.length - 3} more items...
                         </div>
                      )}
                   </div>

                   <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                      <div className="text-xs text-muted-foreground">Total Amount</div>
                      <div className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                         ${order.totalAmount.toFixed(2)}
                      </div>
                   </div>
                 </motion.div>
               );
            })}
         </div>
      )}
    </div>
  );
}
