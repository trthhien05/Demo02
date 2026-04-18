'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Filter, Search, Loader2, Clock, CheckCircle2, ChefHat, RotateCcw, Receipt, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import CheckoutModal from '@/components/admin/orders/CheckoutModal';
import { useOrderSignalR } from '@/lib/hooks/useOrderSignalR';

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

const STATUS_MAP: Record<number, { label: string, color: string, icon: React.ReactNode, ring: string }> = {
  0: { label: 'Đang chờ', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', ring: 'ring-yellow-500/20', icon: <Clock size={14} /> },
  1: { label: 'Đang nấu', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', ring: 'ring-orange-500/20', icon: <ChefHat size={14} /> },
  2: { label: 'Đã lên món', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', ring: 'ring-blue-500/20', icon: <CheckCircle2 size={14} /> },
  3: { label: 'Hoàn tất', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', ring: 'ring-emerald-500/20', icon: <CheckCircle2 size={14} /> },
  4: { label: 'Đã hủy', color: 'bg-red-500/10 text-red-400 border-red-500/20', ring: 'ring-red-500/20', icon: <RotateCcw size={14} /> },
};

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState<{ id: number, tableNumber: string } | null>(null);
  
  // Real-time synchronization
  useOrderSignalR();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => (await apiClient.get('/order')).data,
    refetchInterval: 30000 // Polling fallback
  });

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    return orders.filter(o => 
      o.diningTable?.tableNumber.includes(search) || 
      o.id.toString().includes(search)
    );
  }, [orders, search]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Transaction Center</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Quản Lý <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Đơn Hàng</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tìm bàn hoặc ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-colors focus:bg-white/10 w-[220px]"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
            <Filter size={18} /> Lọc
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3 text-primary">
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">Tạo Order Tại Quầy</span>
            </div>
          </motion.button>
        </div>
      </div>

      {isLoading ? (
         <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
            <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Đang đồng bộ đơn hàng...</p>
         </div>
      ) : filteredOrders.length === 0 ? (
         <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center text-center">
            <ShoppingCart size={64} className="text-white/10 mb-6" />
            <h3 className="text-xl font-bold mb-2">Chưa có đơn hàng nào</h3>
            <p className="text-muted-foreground text-sm">Hệ thống đang sẵn sàng tiếp nhận yêu cầu từ bàn.</p>
         </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence mode="popLayout">
               {filteredOrders.map((order, idx) => {
                  const status = STATUS_MAP[order.status] || STATUS_MAP[0];
                  // If Served (2), it is ready for checkout!
                  const isCheckoutReady = order.status === 2 || order.status === 3;
                  
                  return (
                    <motion.div 
                      key={order.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                         "glass rounded-[2rem] p-6 border transition-all relative overflow-hidden group hover:-translate-y-1",
                         isCheckoutReady ? "border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.1)]" : "border-white/5 hover:border-primary/30 shadow-2xl"
                      )}
                    >
                      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors",
                         isCheckoutReady ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-primary/5 group-hover:bg-primary/10"
                      )} />
                      
                      <div className="flex items-start justify-between mb-5 relative z-10">
                         <div>
                            <h3 className="text-3xl font-black italic tracking-tighter">Bàn {order.diningTable?.tableNumber || '?'}</h3>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Mã ĐH: #{order.id.toString().padStart(5, '0')}</p>
                         </div>
                         <div className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest bg-background/50 backdrop-blur-md", status.color)}>
                            {status.icon}
                            {status.label}
                         </div>
                      </div>

                      <div className="space-y-3 mb-6 relative z-10 min-h-[120px]">
                         {order.orderItems?.slice(0, 4).map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm group/item">
                               <span className="text-muted-foreground flex items-center gap-2 group-hover/item:text-foreground transition-colors text-xs font-medium">
                                  <span className="text-primary font-black">×{item.quantity}</span> 
                                  <span className="truncate max-w-[140px]">{item.menuItem?.name || 'Món ăn'}</span>
                               </span>
                               <span className="font-bold text-[11px] text-foreground/70">{(item.unitPrice * item.quantity).toLocaleString()}đ</span>
                            </div>
                         ))}
                         {order.orderItems?.length > 4 && (
                            <div className="text-[10px] text-primary font-black uppercase tracking-widest pl-6 border-l border-primary/20 italic">
                               + {order.orderItems.length - 4} món khác...
                            </div>
                         )}
                      </div>

                      <div className="pt-5 border-t border-white/10 flex flex-col gap-4 relative z-10">
                         <div className="flex items-center justify-between">
                            <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Tổng Cộng</div>
                            <div className="text-2xl font-black italic text-foreground tracking-tighter">
                               {order.totalAmount?.toLocaleString()} <span className="text-xs not-italic text-muted-foreground ml-1">đ</span>
                            </div>
                         </div>
                         
                         {isCheckoutReady && order.status !== 3 && (
                            <button 
                               onClick={() => setCheckoutTarget({ id: order.id, tableNumber: order.diningTable?.tableNumber || '?' })}
                               className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95"
                            >
                               <Calculator size={18} />
                               THANH TOÁN
                            </button>
                         )}
                         {order.status === 3 && (
                            <div className="w-full bg-white/5 text-muted-foreground font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/5 uppercase text-[10px] tracking-widest">
                               <CheckCircle2 size={16} className="text-emerald-500" /> Đã Thanh Toán
                            </div>
                         )}
                      </div>
                    </motion.div>
                  );
               })}
            </AnimatePresence>
         </div>
      )}

      {/* The Checkout Glass Modal */}
      <CheckoutModal 
         isOpen={!!checkoutTarget} 
         onClose={() => setCheckoutTarget(null)} 
         orderId={checkoutTarget?.id || null}
         tableNumber={checkoutTarget?.tableNumber || ''}
      />
    </div>
  );
}

