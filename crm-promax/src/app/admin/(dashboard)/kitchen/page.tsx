'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Clock, CheckCircle2, AlertCircle, Loader2, UtensilsCrossed, ChevronRight, BellRing, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useOrderSignalR } from '@/lib/hooks/useOrderSignalR';
import InventoryModal from '@/components/admin/kitchen/InventoryModal';

interface OrderItem {
  id: number;
  menuItem: { name: string; category?: { name: string } };
  quantity: number;
}

interface Order {
  id: number;
  diningTable: { tableNumber: string } | null;
  status: number; // 0=Pending, 1=Preparing, 2=Served, 3=Completed
  specialNotes?: string;
  createdAt: string;
  orderItems: OrderItem[];
}

const STATUS_CONFIG: Record<number, { label: string, color: string, nextAction: string, nextStatus: number }> = {
  0: { label: 'Chờ xử lý', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', nextAction: 'Bắt đầu làm', nextStatus: 1 },
  1: { label: 'Đang nấu', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', nextAction: 'Xong món - Lên bàn', nextStatus: 2 },
  2: { label: 'Đã lên món', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', nextAction: 'Đã ra món xong', nextStatus: 2 },
};

const CATEGORY_COLORS: Record<string, string> = {
  'Đồ uống': 'bg-blue-500/40',
  'Bar': 'bg-blue-500/40',
  'Hải sản': 'bg-orange-500/40',
  'Khai vị': 'bg-indigo-500/40',
  'Món chính': 'bg-emerald-500/40',
};

export default function KitchenPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'active' | 'history'>('active');
  const [recentlyFinished, setRecentlyFinished] = useState<Order[]>([]);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useOrderSignalR((event) => {
    if (event === 'OrderCreated') {
      audioRef.current?.play().catch(() => {});
      toast.info("Đơn hàng mới vừa về!", { 
        icon: <BellRing className="text-primary" />,
        description: "Vui lòng kiểm tra danh sách chờ nấu."
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    }
  }, 'Kitchen');

  const { data: pagedResult, isLoading } = useQuery<any>({
    queryKey: ['orders', view],
    queryFn: async () => {
      if (view === 'history') {
         // Lấy các đơn đã ra món hoặc hoàn thành trong hôm nay
         const today = new Date().toISOString().split('T')[0];
         const res = await apiClient.get(`/order?status=2&pageSize=50&date=${today}`);
         const resCompleted = await apiClient.get(`/order?status=3&pageSize=50&date=${today}`);
         
         const items = [...(res.data.items || []), ...(resCompleted.data.items || [])];
         return { items };
      }
      const res = await apiClient.get('/order');
      return res.data;
    },
    select: (data: any) => {
        const items = data.items || [];
        if (view === 'history') {
           return items.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
        return items
          .filter((o: Order) => o.status < 2)
          .sort((a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    },
    refetchInterval: view === 'active' ? 30000 : 60000 
  });
  
  const orders = pagedResult || [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, orderObj }: { id: number, status: number, orderObj?: Order }) => 
      apiClient.patch(`/order/${id}/status`, status, { headers: { 'Content-Type': 'application/json' } }),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      
      // If Served (2) or completed (3), add to recall list
      if ((variables.status === 2 || variables.status === 3) && variables.orderObj) {
        setRecentlyFinished(prev => [{ ...variables.orderObj, status: variables.status } as Order, ...prev].slice(0, 5));
      } else if (variables.status < 2) {
        // If recalled, remove from history
        setRecentlyFinished(prev => prev.filter(o => o.id !== variables.id));
      }

      toast.success('Cập nhật trạng thái thành công!');
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

        <div className="flex bg-white/5 border border-white/5 rounded-2xl p-1.5 gap-1 shadow-inner">
          <button 
            onClick={() => setView('active')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              view === 'active' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white"
            )}
          >
             <ChefHat size={16} /> Đang chế biến
          </button>
          <button 
            onClick={() => setView('history')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
              view === 'history' ? "bg-white/10 text-white shadow-lg" : "text-muted-foreground hover:text-white"
            )}
          >
             <Clock size={16} /> Lịch sử hôm nay
          </button>
        </div>

        <div className="flex bg-white/5 border border-white/5 rounded-2xl p-2 gap-4">
          <button 
            onClick={() => setIsInventoryModalOpen(true)}
            className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
          >
             Báo hết món
          </button>
          <div className="px-4 py-2 text-center border-l border-white/5">
             <div className="text-2xl font-black text-yellow-400">{orders.filter((o: Order) => o.status === 0).length}</div>
             <div className="text-[10px] font-bold uppercase text-muted-foreground">Chờ xử lý</div>
          </div>
          <div className="px-4 py-2 text-center">
             <div className="text-2xl font-black text-primary">{orders.filter((o: Order) => o.status === 1).length}</div>
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
          <h2 className="text-2xl font-bold uppercase tracking-widest">{view === 'active' ? 'Bếp đang trống' : 'Chưa có lịch sử'}</h2>
          <p className="text-sm mt-2">{view === 'active' ? 'Đang chờ đơn hàng mới từ quầy/phục vụ...' : 'Hôm nay chưa có đơn hàng nào được ra món.'}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-6 h-full min-w-max">
            <AnimatePresence mode="popLayout">
              {orders.map((order, idx) => {
                const elapsed = getElapsedTime(order.createdAt);
                const config = STATUS_CONFIG[order.status] || (order.status === 3 ? { label: 'Hoàn tất', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' } : STATUS_CONFIG[0]);
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
                      isUrgent ? "border-red-500/50 shadow-red-500/10" : 
                      !order.diningTable ? "border-emerald-500/30 shadow-emerald-500/10" :
                      view === 'history' ? "border-white/5 opacity-80" : "border-white/5 shadow-black/50"
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
                        <h2 className={cn("text-4xl font-black italic tracking-tighter", !order.diningTable && "text-emerald-400")}>
                           {order.diningTable?.tableNumber ? `Bàn ${order.diningTable.tableNumber}` : 'MANG VỀ'}
                        </h2>
                        <div className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border", config.color)}>
                          {config.label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock size={14} />
                        <span className="text-sm font-bold">{view === 'active' ? `${elapsed} phút trước` : new Date(order.createdAt).toLocaleTimeString('vi-VN')}</span>
                        <span className="text-[10px] font-medium opacity-50 font-mono ml-auto">#{order.id.toString().padStart(5, '0')}</span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                        {order.orderItems.map((item, i) => (
                           <div key={item.id} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0 group relative pr-4">
                            <div className={cn("absolute right-0 top-0 w-1 h-full rounded-full opacity-30", CATEGORY_COLORS[item.menuItem?.category?.name || ''])} />
                            
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-xl text-primary group-hover:bg-primary/20 transition-colors">
                              {item.quantity}
                            </div>
                            <div className="flex-1">
                              <div className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">{item.menuItem?.name}</div>
                              {item.menuItem?.category && (
                                <div className="text-[10px] text-muted-foreground uppercase font-bold mt-1 text-primary/70">{item.menuItem.category.name}</div>
                              )}
                            </div>
                         </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="p-4 bg-white/5 mt-auto">
                      {view === 'active' ? (
                        <button 
                          onClick={() => updateStatusMutation.mutate({ id: order.id, status: (STATUS_CONFIG[order.status] || STATUS_CONFIG[0]).nextStatus, orderObj: order })}
                          disabled={updateStatusMutation.isPending}
                          className={cn(
                            "w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all",
                            order.status === 0 ? "bg-primary text-primary-foreground hover:bg-primary/80 shadow-lg shadow-primary/20" : 
                            "bg-orange-500 text-white hover:bg-orange-400 shadow-lg shadow-orange-500/20"
                          )}
                        >
                           {updateStatusMutation.isPending ? <Loader2 className="animate-spin" /> : <>{(STATUS_CONFIG[order.status] || STATUS_CONFIG[0]).nextAction} <ChevronRight size={20} /></>}
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                             if (confirm("Bạn có muốn hoàn tác đơn hàng này về trạng thái Đang nấu?")) {
                               updateStatusMutation.mutate({ id: order.id, status: 1 });
                             }
                          }}
                          disabled={updateStatusMutation.isPending}
                          className="w-full py-5 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 border border-white/5 transition-all"
                        >
                           <RotateCcw size={16} /> HOÀN TÁC VỀ BẾP
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Recently Finished (Recall) Bar */}
      {view === 'active' && recentlyFinished.length > 0 && (
         <div className="flex gap-4 overflow-x-auto pb-2 border-t border-white/5 pt-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground py-2 flex items-center gap-2">
               <RotateCcw size={14} /> Hoàn tất gần đây:
            </span>
            {recentlyFinished.map(o => (
               <button 
                  key={o.id}
                  onClick={() => updateStatusMutation.mutate({ id: o.id, status: 1 })}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold transition-all"
               >
                  Bàn {o.diningTable?.tableNumber || 'MV'} - Hoàn tác
               </button>
            ))}
         </div>
      )}

      {/* Footer / Status */}
      <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-muted-foreground">
         <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> SignalR Active
            </div>
            <div className="flex items-center gap-2 text-white"><UtensilsCrossed size={14} /> VIP Promax Kitchen OS v2.1</div>
         </div>
         <div className="text-xs font-mono">{now.toLocaleTimeString('vi-VN')}</div>
      </div>

      <InventoryModal isOpen={isInventoryModalOpen} onClose={() => setIsInventoryModalOpen(false)} />
    </div>
  );
}
