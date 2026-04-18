'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Loader2, UtensilsCrossed, ChevronRight, BellRing } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useOrderSignalR } from '@/lib/hooks/useOrderSignalR';

interface OrderItem {
  id: number;
  menuItem: { name: string; category?: { name: string } };
  quantity: number;
}

interface Order {
  id: number;
  diningTable: { tableNumber: string };
  status: number; // 0=Pending, 1=Preparing, 2=Served, 3=Completed
  createdAt: string;
  orderItems: OrderItem[];
}

const STATUS_CONFIG: Record<number, { label: string, color: string, nextAction: string, nextStatus: number }> = {
  0: { label: 'Chờ xử lý', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', nextAction: 'Bắt đầu làm', nextStatus: 1 },
  1: { label: 'Đang nấu', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', nextAction: 'Hoàn tất món', nextStatus: 2 },
  2: { label: 'Đã lên món', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', nextAction: 'Xong', nextStatus: 3 },
};

export default function KitchenPage() {
  const queryClient = useQueryClient();
  useOrderSignalR(); // Listen for real-time order creations

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => (await apiClient.get('/order')).data,
    // Filter to only show incomplete orders in Kitchen
    select: (data) => data.filter(o => o.status < 3).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    refetchInterval: 30000 // Polling fallback
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: number }) => apiClient.patch(`/order/${id}/status`, status, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Đã cập nhật trạng thái đơn hàng!');
    }
  });

  // Timer refresh every minute
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = (createdAt: string) => {
    const start = new Date(createdAt);
    const diff = Math.floor((now.getTime() - start.getTime()) / 60000);
    return diff;
  };

  return (
    <div className="h-screen flex flex-col bg-[#050608] text-white overflow-hidden p-6 gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
            <ChefHat size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black italic tracking-tight">KITCHEN <span className="text-primary italic">LIVE</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Điều hành chế biến thời gian thực</p>
          </div>
        </div>

        <div className="flex bg-white/5 border border-white/5 rounded-2xl p-2 gap-4">
          <div className="px-4 py-2 text-center border-r border-white/5">
             <div className="text-2xl font-black text-yellow-400">{orders.filter(o => o.status === 0).length}</div>
             <div className="text-[10px] font-bold uppercase text-muted-foreground">Đang chờ</div>
          </div>
          <div className="px-4 py-2 text-center">
             <div className="text-2xl font-black text-primary">{orders.filter(o => o.status === 1).length}</div>
             <div className="text-[10px] font-bold uppercase text-muted-foreground">Đang nấu</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-primary w-12 h-12" />
          <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs">Đang đồng bộ luồng bếp...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
          <UtensilsCrossed size={80} className="mb-6" />
          <h2 className="text-2xl font-bold uppercase tracking-widest">Bếp đang trống</h2>
          <p className="text-sm mt-2">Đang chờ đơn hàng mới từ quầy/phục vụ...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-6 h-full min-w-max">
            <AnimatePresence mode="popLayout">
              {orders.map((order, idx) => {
                const elapsed = getElapsedTime(order.createdAt);
                const config = STATUS_CONFIG[order.status] || STATUS_CONFIG[0];
                const isUrgent = elapsed > 20 && order.status < 2;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className={cn(
                      "w-[350px] flex flex-col bg-[#0f1115] rounded-[2rem] border-2 transition-all shadow-2xl relative overflow-hidden",
                      isUrgent ? "border-red-500/50 shadow-red-500/10" : "border-white/5 shadow-black/50"
                    )}
                  >
                    {/* Urgency Badge */}
                    {isUrgent && (
                      <div className="absolute top-0 right-10 bg-red-500 text-white px-3 py-1 rounded-b-xl text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 animate-pulse">
                        <AlertCircle size={10} /> Quá hạn
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="p-6 pb-2 border-b border-white/5">
                      <div className="flex justify-between items-start mb-2">
                        <h2 className="text-4xl font-black italic tracking-tighter">Bàn {order.diningTable?.tableNumber}</h2>
                        <div className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", config.color)}>
                          {config.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} />
                        <span className="text-sm font-bold">{elapsed} phút trước</span>
                        <span className="text-[10px] font-medium opacity-50 font-mono ml-auto">#{order.id.toString().padStart(5, '0')}</span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                      {order.orderItems.map((item, i) => (
                        <div key={i} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0 group">
                           <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xl text-primary group-hover:bg-primary/20 transition-colors">
                             {item.quantity}
                           </div>
                           <div className="flex-1">
                             <div className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">{item.menuItem?.name}</div>
                             {item.menuItem?.category && (
                               <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1">{item.menuItem.category.name}</div>
                             )}
                           </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-white/5 mt-auto">
                      <button 
                        onClick={() => updateStatusMutation.mutate({ id: order.id, status: config.nextStatus })}
                        disabled={updateStatusMutation.isPending}
                        className={cn(
                          "w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all",
                          order.status === 0 ? "bg-primary text-primary-foreground hover:scale-[1.02] active:scale-95 shadow-lg shadow-primary/20" : 
                          order.status === 1 ? "bg-emerald-500 text-white hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20" :
                          "bg-white/10 text-white hover:bg-white/20"
                        )}
                      >
                         {updateStatusMutation.isPending ? (
                           <Loader2 className="animate-spin" />
                         ) : (
                           <>
                             {config.nextAction}
                             <ChevronRight size={20} />
                           </>
                         )}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Footer / Status */}
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-muted-foreground">
         <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SignalR Đang kết nối</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-yellow-500" /> Chờ món: {orders.filter(o => o.status === 0).length}</div>
            <div className="flex items-center gap-2 text-white"><UtensilsCrossed size={14} /> VIP Promax Kitchen OS v2.0</div>
         </div>
         <div className="text-xs font-mono">{now.toLocaleTimeString('vi-VN')}</div>
      </div>
    </div>
  );
}
