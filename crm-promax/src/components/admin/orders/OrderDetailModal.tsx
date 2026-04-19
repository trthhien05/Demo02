'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   X, Receipt, Clock, User, Hash, 
   Utensils, MapPin, CheckCircle2, 
   Calendar, CreditCard, ShoppingBag
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any | null;
}

const STATUS_CONFIG: Record<number, { label: string, color: string, bg: string }> = {
  0: { label: 'Đang chờ', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  1: { label: 'Đang nấu', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  2: { label: 'Đã lên món', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  3: { label: 'Hoàn tất', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  4: { label: 'Đã hủy', color: 'text-red-400', bg: 'bg-red-500/10' },
};

export default function OrderDetailModal({ isOpen, onClose, order }: OrderDetailModalProps) {
  if (!isOpen || !order) return null;

  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG[0];
  const date = new Date(order.createdAt);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0c0e12] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                   <Receipt size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black italic tracking-tight uppercase">Chi Tiết Đơn Hàng</h2>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mã: #{order.id.toString().padStart(5, '0')}</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-muted-foreground">
                <X size={24} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8">
             {/* Status Banner */}
             <div className={cn("p-4 rounded-2xl border flex items-center justify-between", status.bg, "border-white/5")}>
                <div className="flex items-center gap-3">
                   <CheckCircle2 className={status.color} size={18} />
                   <span className={cn("text-sm font-black uppercase tracking-widest", status.color)}>{status.label}</span>
                </div>
                <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-2">
                   <Clock size={12} />
                   {date.toLocaleTimeString()} - {date.toLocaleDateString()}
                </div>
             </div>

             {/* Info Cards */}
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                   <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={10} /> Vị trí
                   </div>
                   <div className="font-bold text-lg">{order.diningTable?.tableNumber ? `Bàn ${order.diningTable.tableNumber}` : 'Mang về'}</div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-1">
                   <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <CreditCard size={10} /> Tổng Tiền
                   </div>
                   <div className="font-bold text-lg text-emerald-400">{order.totalAmount?.toLocaleString()}đ</div>
                </div>
             </div>

             {/* Items List */}
             <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 flex items-center gap-2">
                   <ShoppingBag size={12} /> Danh sách món ăn
                </h3>
                <div className="space-y-3">
                   {order.orderItems?.map((item: any, idx: number) => (
                      <div key={idx} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-black/40 flex items-center justify-center text-primary font-black border border-white/5">
                            {item.quantity}
                         </div>
                         <div className="flex-1">
                            <div className="font-bold text-sm tracking-tight">{item.menuItem?.name || 'Món ăn'}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest italic">{item.unitPrice.toLocaleString()}đ / món</div>
                         </div>
                         <div className="font-mono font-black text-sm text-foreground">
                            {(item.unitPrice * item.quantity).toLocaleString()}đ
                         </div>
                      </div>
                   ))}
                </div>
             </div>

             {/* Special Notes (if any) */}
             {order.specialNotes && (
                <div className="p-5 bg-orange-500/5 border border-orange-500/10 rounded-2xl">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-2">
                      Ghi chú đặc biệt
                   </h4>
                   <p className="text-sm italic text-foreground opacity-80 leading-relaxed">"{order.specialNotes}"</p>
                </div>
             )}
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-white/5 bg-white/[0.02]">
             <button 
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
             >
                Đóng cửa sổ
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
