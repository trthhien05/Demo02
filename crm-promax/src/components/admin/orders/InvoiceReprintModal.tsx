'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   X, Receipt, Printer, Calendar, 
   User, CreditCard, Hash, Loader2,
   ShoppingBag, CheckCircle2
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InvoiceReprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: number | null;
}

export default function InvoiceReprintModal({ isOpen, onClose, orderId }: InvoiceReprintModalProps) {
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ['invoice', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await apiClient.get(`/billing/invoice/${orderId}`);
      return res.data;
    },
    enabled: !!orderId && isOpen
  });

  const handlePrint = async () => {
    if (!invoice?.id) return;
    try {
      const toastId = toast.loading('Đang khởi tạo tệp báo cáo PDF...');
      
      const response = await apiClient.get(`/billing/invoice/${invoice.id}/pdf`, {
        responseType: 'blob', // Expect binary data
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `PromaxRMS_Billing_${invoice.id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Đã tải xuống hóa đơn PDF thành công!', { id: toastId });
    } catch (error) {
       toast.error('Có lỗi xảy ra', { description: 'Không thể tải xuống tệp tin PDF lúc này. Vui lòng thử lại.' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-xl"
          onClick={onClose}
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className="relative w-full max-w-lg bg-[#0c0e12] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                   <Receipt size={24} />
                </div>
                <div>
                   <h2 className="text-xl font-black italic tracking-tight uppercase">Sao Kê Hóa Đơn</h2>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Lịch sử thanh toán</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-muted-foreground">
                <X size={24} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 space-y-8" id="printable-invoice">
             {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center">
                   <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
                   <p className="text-muted-foreground font-black uppercase text-[10px] tracking-widest">Đang truy xuất hóa đơn...</p>
                </div>
             ) : error ? (
                <div className="py-20 text-center space-y-4">
                    <X className="mx-auto text-red-500" size={48} />
                    <p className="text-muted-foreground font-bold italic text-sm">Không tìm thấy thông tin thanh toán cho đơn hàng này.</p>
                </div>
             ) : invoice && (
                <>
                   {/* Invoice Header */}
                   <div className="text-center space-y-2 pb-6 border-b border-white/5">
                      <h1 className="text-2xl font-black tracking-tighter">PROMAX <span className="text-primary">RMS</span></h1>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]">HÓA ĐƠN THANH TOÁN</p>
                      <div className="flex items-center justify-center gap-4 mt-6">
                         <div className="text-[10px] font-bold px-3 py-1 bg-white/5 rounded-full border border-white/10 uppercase tracking-widest">
                            No: #{invoice.id.toString().padStart(6, '0')}
                         </div>
                         <div className="text-[10px] font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/10 uppercase tracking-widest">
                            PAID
                         </div>
                      </div>
                   </div>

                   {/* Metadata */}
                   <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-3">
                         <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ngày phát hành</span>
                            <p className="font-bold">{new Date(invoice.issuedAt).toLocaleString('vi-VN')}</p>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Nhân viên</span>
                            <p className="font-bold">System Admin</p>
                         </div>
                      </div>
                      <div className="space-y-3 text-right">
                         <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Bàn phục vụ</span>
                            <p className="font-bold">Bàn {invoice.order?.diningTableId || 'N/A'}</p>
                         </div>
                         <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Phương thức</span>
                            <p className="font-bold">{['Tiền mặt', 'Thẻ', 'Chuyển khoản', 'Ví'][invoice.paymentMethod] || 'Khác'}</p>
                         </div>
                      </div>
                   </div>

                   {/* Customer Info (if VIP) */}
                   {invoice.customer && (
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <User className="text-primary" size={16} />
                            <div>
                               <p className="text-[10px] font-black text-primary uppercase tracking-widest">Thành viên VIP</p>
                               <p className="text-sm font-black">{invoice.customer.fullName}</p>
                            </div>
                         </div>
                         <div className="text-right">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Tích lũy</p>
                            <p className="text-xs font-black text-emerald-400">+{Math.floor(invoice.finalAmount / 1000)} pts</p>
                         </div>
                      </div>
                   )}

                   {/* Summaries */}
                   <div className="space-y-4 pt-6 border-t border-white/5">
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-muted-foreground font-bold">Số tiền gốc</span>
                         <span className="font-bold">{invoice.subtotal?.toLocaleString()}đ</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                         <span className="text-muted-foreground font-bold">Phụ phí (VAT 8%)</span>
                         <span className="font-bold">{invoice.vatAmount?.toLocaleString()}đ</span>
                      </div>
                      {invoice.discountAmount > 0 && (
                         <div className="flex justify-between items-center text-sm text-red-400">
                            <span className="font-bold">Khuyến mãi</span>
                            <span className="font-black">-{invoice.discountAmount.toLocaleString()}đ</span>
                         </div>
                      )}
                      
                      <div className="pt-4 border-t border-dashed border-white/20 flex justify-between items-center">
                         <span className="text-lg font-black italic tracking-tighter uppercase">Thực Thu</span>
                         <span className="text-3xl font-black text-emerald-400 tracking-tighter">{invoice.finalAmount?.toLocaleString()}đ</span>
                      </div>
                   </div>

                   <p className="text-center text-[10px] italic text-muted-foreground mt-8">
                      Cảm ơn Quý khách! Hẹn gặp lại.
                   </p>
                </>
             )}
          </div>

          {/* Footer Actions */}
          <div className="p-8 border-t border-white/5 bg-white/[0.02] grid grid-cols-2 gap-4">
             <button 
                onClick={onClose}
                className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
             >
                Đóng
             </button>
             <button 
                onClick={handlePrint}
                className="py-4 bg-primary hover:bg-primary-hover text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2"
             >
                <Printer size={16} /> IN LẠI (Print)
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
