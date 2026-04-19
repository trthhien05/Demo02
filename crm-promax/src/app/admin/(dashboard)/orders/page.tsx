'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Filter, Search, Loader2, Clock, CheckCircle2, ChefHat, RotateCcw, Receipt, Calculator } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import CheckoutModal from '@/components/admin/orders/CheckoutModal';
import OrderModal from '@/components/admin/orders/OrderModal';
import OrderDetailModal from '@/components/admin/orders/OrderDetailModal';
import InvoiceReprintModal from '@/components/admin/orders/InvoiceReprintModal';
import { useOrderSignalR } from '@/lib/hooks/useOrderSignalR';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Printer } from 'lucide-react';

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [checkoutTarget, setCheckoutTarget] = useState<{ id: number, tableNumber: string } | null>(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [reprintOrderId, setReprintOrderId] = useState<number | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number, status: number }) => 
      apiClient.patch(`/order/${id}/status`, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success("Cập nhật trạng thái thành công!");
    },
    onError: (err: any) => toast.error("Không thể cập nhật trạng thái", {
      description: err.response?.data || "Vui lòng kiểm tra lại."
    })
  });

  const handleCancelOrder = (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    if (window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này không?")) {
      updateStatusMutation.mutate({ id: orderId, status: 4 });
    }
  };
  
  // Real-time synchronization
  useOrderSignalR();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders'],
    queryFn: async () => (await apiClient.get('/order')).data,
    refetchInterval: 30000 // Polling fallback
  });

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // 1. Date Filter
    if (selectedDate) {
      result = result.filter(o => new Date(o.createdAt).toISOString().split('T')[0] === selectedDate);
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }

    // 3. Search
    if (search.trim()) {
      result = result.filter(o => 
        o.diningTable?.tableNumber.includes(search) || 
        o.id.toString().includes(search)
      );
    }

    return result;
  }, [orders, search, statusFilter, selectedDate]);

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
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 border rounded-2xl transition-all font-bold text-sm",
                isFilterOpen || statusFilter !== 'all' ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              <Filter size={18} />
              {statusFilter === 'all' ? 'Tất cả trạng thái' : STATUS_MAP[statusFilter as number]?.label}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-[#0c0e12]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-3 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground p-3">Lọc theo trạng thái</div>
                  <div className="space-y-1">
                    <button
                      onClick={() => { setStatusFilter('all'); setIsFilterOpen(false); }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold",
                        statusFilter === 'all' ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      )}
                    >
                      Tất cả đơn hàng
                    </button>
                    {Object.entries(STATUS_MAP).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setStatusFilter(parseInt(key));
                          setIsFilterOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold",
                          statusFilter === parseInt(key) ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {config.icon}
                          {config.label}
                        </div>
                        {statusFilter === parseInt(key) && <CheckCircle2 size={14} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-colors focus:bg-white/10 text-xs font-bold"
          />

          <motion.button 
            onClick={() => setIsOrderModalOpen(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3 text-primary">
              <Plus size={18} className="group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">POS</span>
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
                      onClick={() => setSelectedOrderDetails(order)}
                      className={cn(
                         "glass rounded-[2rem] p-6 border transition-all relative overflow-hidden group hover:-translate-y-1 cursor-pointer",
                         isCheckoutReady ? "border-emerald-500/30 shadow-[0_10px_40px_rgba(16,185,129,0.1)]" : "border-white/5 hover:border-primary/30 shadow-2xl"
                      )}
                    >
                      <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-colors",
                         isCheckoutReady ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-primary/5 group-hover:bg-primary/10"
                      )} />
                      
                      <div className="flex items-start justify-between mb-5 relative z-10">
                         <div>
                            <h3 className={cn("text-3xl font-black italic tracking-tighter", !order.diningTable && "text-emerald-400")}>
                               {order.diningTable?.tableNumber ? `Bàn ${order.diningTable.tableNumber}` : 'MANG VỀ'}
                            </h3>
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
                                                  
                          {order.status === 0 && (
                             <button 
                                onClick={(e) => handleCancelOrder(e, order.id)}
                                disabled={updateStatusMutation.isPending}
                                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all text-[10px] tracking-widest uppercase"
                             >
                                <RotateCcw size={16} /> Hủy Đơn Hàng
                             </button>
                          )}

                          {isCheckoutReady && order.status !== 3 && (
                             <button 
                                onClick={(e) => { e.stopPropagation(); setCheckoutTarget({ id: order.id, tableNumber: order.diningTable?.tableNumber || '?' }) }}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-black py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_10px_20px_rgba(16,185,129,0.2)] active:scale-95"
                             >
                                <Calculator size={18} />
                                THANH TOÁN
                             </button>
                          )}
                          {order.status === 3 && (
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

       <OrderModal 
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
       />

       <OrderDetailModal 
          isOpen={!!selectedOrderDetails}
          onClose={() => setSelectedOrderDetails(null)}
          order={selectedOrderDetails}
       />
    </div>
  );
}
