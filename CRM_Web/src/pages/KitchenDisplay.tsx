import React, { useEffect, useState } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  UtensilsCrossed,
  Timer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type Order } from '../services/api';
import { useSignalR } from '../hooks/useSignalR';

const KitchenDisplay: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { notifications } = useSignalR('http://localhost:5013/notificationHub');

  useEffect(() => {
    fetchOrders();
  }, []);

  // Sync with SignalR notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const last = notifications[0];
      if (last.user === "Hệ thống POS") {
        fetchOrders();
      }
    }
  }, [notifications]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/order');
      // Chỉ lấy các order đang chờ (Pending) hoặc đang chế biến (Preparing)
      setOrders(response.data.filter((o: Order) => o.status === 0 || o.status === 1));
    } catch (err) {
      console.error('Error fetching kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (id: number, status: number) => {
    try {
      await api.patch(`/order/${id}/status`, status);
      fetchOrders();
    } catch (err) {
      console.error('Error updating order status:', err);
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diff = Math.floor((now - start) / 60000); // minutes
    return diff;
  };

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải dữ liệu Bếp...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ChefHat size={32} className="text-primary" />
            Màn hình Bếp (KDS)
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý và điều phối các đơn hàng đang được chế biến theo thời gian thực.</p>
        </div>
        <div className="flex gap-4">
           <div className="glass px-4 py-2 flex items-center gap-2 text-xs font-bold text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
              KẾT NỐI REAL-TIME: ON
           </div>
           <button onClick={fetchOrders} className="p-2 glass hover:bg-white/5 rounded-lg">
              <Timer size={20} />
           </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="glass p-20 text-center flex flex-col items-center gap-4 text-muted-foreground/30">
           <UtensilsCrossed size={64} />
           <p className="text-lg font-medium">Bếp hiện đang trống. Rảnh tay!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {orders.map((order) => {
              const elapsed = getTimeElapsed(order.createdAt);
              const isUrgent = elapsed > 15;

              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  key={order.id}
                  className={`glass-card flex flex-col overflow-hidden border-t-4 ${isUrgent ? 'border-t-red-500 shadow-2xl shadow-red-500/10' : order.status === 1 ? 'border-t-blue-400' : 'border-t-primary'}`}
                >
                  <div className="p-4 bg-white/5 flex justify-between items-center border-b border-white/5">
                     <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-primary">#{order.diningTable?.tableNumber}</span>
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-muted-foreground uppercase font-bold">ID: {order.id}</span>
                     </div>
                     <div className={`flex items-center gap-1.5 text-xs font-bold ${isUrgent ? 'text-red-400' : 'text-muted-foreground'}`}>
                        <Clock size={12} />
                        {elapsed}p
                     </div>
                  </div>

                  <div className="flex-1 p-4 space-y-4">
                     <div className="space-y-3">
                        {order.orderItems.map((item, idx) => (
                          <div key={idx} className="flex gap-3">
                             <div className="w-6 h-6 bg-primary/20 rounded flex items-center justify-center text-xs font-bold text-primary">
                                {item.quantity}x
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-bold text-zinc-100">{item.menuItem?.name}</p>
                                {item.note && (
                                  <p className="text-[10px] text-amber-400 font-medium italic mt-0.5 flex items-center gap-1">
                                    <AlertCircle size={10} /> {item.note}
                                  </p>
                                )}
                             </div>
                          </div>
                        ))}
                     </div>

                     {order.specialNotes && (
                       <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="text-[10px] text-red-400 font-bold uppercase mb-1">Ghi chú đặc biệt:</p>
                          <p className="text-xs italic text-zinc-300">{order.specialNotes}</p>
                       </div>
                     )}
                  </div>

                  <div className="p-4 bg-white/5 mt-auto flex gap-2 border-t border-white/5">
                     {order.status === 0 ? (
                       <button 
                         onClick={() => updateOrderStatus(order.id, 1)}
                         className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 uppercase"
                       >
                         BẮT ĐẦU CHẾ BIẾN
                       </button>
                     ) : (
                       <button 
                         onClick={() => updateOrderStatus(order.id, 2)}
                         className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 uppercase"
                       >
                         <CheckCircle2 size={16} /> HOÀN THÀNH
                       </button>
                     )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
