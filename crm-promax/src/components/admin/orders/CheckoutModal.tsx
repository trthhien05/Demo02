'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Receipt, CreditCard, Banknote, Wallet, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
  tableNumber: string;
}

const PAYMENT_METHODS = [
  { id: 0, label: 'Cash', icon: <Banknote size={16} />, color: 'emerald' },
  { id: 1, label: 'Card', icon: <CreditCard size={16} />, color: 'blue' },
  { id: 2, label: 'Transfer', icon: <Phone size={16} />, color: 'purple' },
  { id: 3, label: 'E-Wallet', icon: <Wallet size={16} />, color: 'orange' },
];

export default function CheckoutModal({ isOpen, onClose, orderId, tableNumber }: CheckoutModalProps) {
  const queryClient = useQueryClient();
  const [method, setMethod] = useState(0); // 0: Cash, 1: Card, 2: Transfer, 3: E-Wallet
  const [amountReceived, setAmountReceived] = useState<string>('');

  // Auto-fetch invoice preview when opening the modal
  const { data: preview, isLoading: isPreviewLoading } = useQuery({
    queryKey: ['invoice-preview', orderId],
    queryFn: async () => {
      const res = await apiClient.get(`/billing/preview/${orderId}`);
      return res.data;
    },
    enabled: isOpen && !!orderId,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/billing/pay', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Hóa đơn đã được thanh toán thành công!', {
        description: 'Kho đã trừ, bàn đã được reset sang dọn dẹp.',
        icon: <CheckCircle2 className="text-emerald-400" />
      });
      // Refresh Orders and Tables silently
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['diningTables'] });
      queryClient.invalidateQueries({ queryKey: ['revenue-stats'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error('Giao dịch thất bại', {
        description: error.response?.data || error.message
      });
    }
  });

  const handlePay = () => {
    if (!preview) return;
    const payload = {
      orderId: preview.orderId,
      customerId: null,
      subtotal: preview.subtotal,
      vatAmount: preview.vatAmount,
      serviceChargeAmount: preview.serviceChargeAmount,
      discountAmount: 0,
      finalAmount: preview.finalAmount,
      paymentMethod: method
    };
    checkoutMutation.mutate(payload);
  };

  const changeDue = preview ? Math.max(0, (Number(amountReceived) || 0) - preview.finalAmount) : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md glass bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
                   <Receipt size={20} />
                </div>
                <div>
                   <h2 className="font-bold text-lg">Checkout Table {tableNumber}</h2>
                   <p className="text-xs text-muted-foreground font-mono">ORD-#{orderId?.toString().padStart(5, '0')}</p>
                </div>
             </div>
             <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X size={16} />
             </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
             {isPreviewLoading ? (
                <div className="flex flex-col items-center justify-center py-10">
                   <Loader2 className="animate-spin text-primary mb-4" size={32} />
                   <p className="text-sm text-muted-foreground animate-pulse">Calculating bill...</p>
                </div>
             ) : preview ? (
                <>
                   {/* Bill Details */}
                    <div className="space-y-3 bg-black/20 p-5 rounded-2xl border border-white/5 font-mono text-sm leading-relaxed">
                       <div className="flex justify-between items-center text-muted-foreground">
                          <span>Tạm tính</span>
                          <span className="text-foreground">{preview.subtotal.toLocaleString()} VNĐ</span>
                       </div>
                       <div className="flex justify-between items-center text-muted-foreground">
                          <span>Thuế (VAT 8%)</span>
                          <span className="text-foreground">{preview.vatAmount.toLocaleString()} VNĐ</span>
                       </div>
                       <div className="flex justify-between items-center text-muted-foreground">
                          <span>Phí phục vụ (5%)</span>
                          <span className="text-foreground">{preview.serviceChargeAmount.toLocaleString()} VNĐ</span>
                       </div>
                       <div className="pt-3 mt-3 border-t border-dashed border-white/20 flex justify-between items-center">
                          <span className="font-bold text-base uppercase tracking-tighter">Tổng Cộng</span>
                          <span className="text-3xl font-black text-emerald-400 font-sans tracking-tighter">{preview.finalAmount.toLocaleString()} <span className="text-xs not-italic font-bold ml-1 opacity-50 uppercase">vnđ</span></span>
                       </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                       <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 block">Phương thức thanh toán</label>
                      <div className="grid grid-cols-2 gap-3">
                         {PAYMENT_METHODS.map(m => (
                            <button
                               key={m.id}
                               onClick={() => setMethod(m.id)}
                               className={cn(
                                  "flex items-center gap-3 p-4 rounded-xl border transition-all",
                                  method === m.id 
                                     ? `bg-${m.color}-500/20 border-${m.color}-500/50 text-${m.color}-400 shadow-[0_0_15px_rgba(var(--${m.color}-500),0.2)]` 
                                     : "bg-white/5 border-white/10 hover:bg-white/10 text-muted-foreground hover:text-white"
                               )}
                            >
                               {m.icon}
                               <span className="font-bold text-sm">{m.label}</span>
                            </button>
                         ))}
                      </div>

                       {/* Cash Calculator (Only for Cash) */}
                       <AnimatePresence>
                          {method === 0 && (
                             <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 pt-4 border-t border-white/5 space-y-4 overflow-hidden"
                             >
                                <div className="space-y-2">
                                   <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tiền khách đưa (VNĐ)</label>
                                   <input 
                                      type="number"
                                      value={amountReceived}
                                      onChange={(e) => setAmountReceived(e.target.value)}
                                      placeholder="0"
                                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-primary outline-none focus:border-primary/50 transition-all"
                                   />
                                </div>
                                {Number(amountReceived) > 0 && (
                                   <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                      <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Tiền thối lại</div>
                                      <div className="text-xl font-black text-emerald-400 font-mono italic">{changeDue.toLocaleString()} đ</div>
                                   </div>
                                )}
                             </motion.div>
                          )}
                       </AnimatePresence>
                    </div>

                   {/* Actions */}
                   <div className="pt-2">
                     <button
                        onClick={handlePay}
                        disabled={checkoutMutation.isPending}
                        className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-[1px]"
                     >
                        <div className="bg-background/20 backdrop-blur-sm group-hover:bg-transparent transition-all px-6 py-4 rounded-[15px] flex items-center justify-center gap-2">
                           {checkoutMutation.isPending ? (
                              <Loader2 className="animate-spin text-white" size={20} />
                           ) : (
                              <><Receipt size={20} className="text-white" /><span className="font-bold text-white text-base">XÁC NHẬN THANH TOÁN</span></>
                           )}
                        </div>
                     </button>
                   </div>
                </>
             ) : (
                <div className="text-center text-red-400 text-sm py-4">Failed to load invoice preview.</div>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
