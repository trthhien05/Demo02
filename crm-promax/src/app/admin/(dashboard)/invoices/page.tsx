'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Receipt, Search, Filter, Loader2, Printer, 
  RotateCcw, DollarSign, CreditCard, CheckCircle2, 
  Wallet, AlertTriangle, X 
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Pagination from '@/components/common/Pagination';
import InvoiceReprintModal from '@/components/admin/orders/InvoiceReprintModal';

// Based on Enums
type PaymentMethod = 0 | 1 | 2 | 3;
type InvoiceStatus = 0 | 1 | 2; // Unpaid, Paid, Voided

const PAYMENT_METHODS = {
  0: { label: 'Tiền mặt', icon: <DollarSign size={14} />, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  1: { label: 'Thẻ tín dụng', icon: <CreditCard size={14} />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  2: { label: 'Chuyển khoản', icon: <Wallet size={14} />, color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  3: { label: 'Ví điện tử', icon: <Wallet size={14} />, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
};

const INVOICE_STATUS = {
  0: { label: 'Chưa thanh toán', color: 'text-gray-400 bg-gray-400/10' },
  1: { label: 'Thành công', color: 'text-emerald-400 bg-emerald-400/10' },
  2: { label: 'Đã hoàn tiền', color: 'text-red-400 bg-red-400/10' },
};

interface Invoice {
  id: number;
  orderId: number;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  finalAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  paymentMethod: PaymentMethod;
  order?: {
    diningTable?: { tableNumber: string }
  };
  customer?: {
    fullName: string;
    phoneNumber: string;
  };
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [methodFilter, setMethodFilter] = useState<'all' | string>('all');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const [reprintOrderId, setReprintOrderId] = useState<number | null>(null);

  const { data: pagedResult, isLoading } = useQuery({
    queryKey: ['invoices', page, methodFilter, search, selectedDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (search.trim()) params.append('search', search.trim());
      if (selectedDate) params.append('date', selectedDate);
      if (methodFilter !== 'all') params.append('method', methodFilter);
      
      const res = await apiClient.get(`/billing/invoices?${params.toString()}`);
      return res.data;
    }
  });

  const refundMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/billing/invoice/${id}/refund`),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'Đã hoàn tiền thành công!');
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (err: any) => {
      toast.error('Lỗi hoàn tiền', { description: err.response?.data || 'Không thể thao tác hóa đơn này.' });
    }
  });

  const handleRefund = (id: number) => {
    if (confirm("CẢNH BÁO: Bạn có chắc chắn muốn hủy hóa đơn này? Doanh thu của hóa đơn sẽ bị gạch bỏ và trạng thái chuyển sang Đã hoàn tiền.")) {
       refundMutation.mutate(id);
    }
  };

  const invoices: Invoice[] = pagedResult?.items || [];
  const totalPages = pagedResult?.totalPages || 0;
  const totalItems = pagedResult?.totalCount || 0;
  const backendStats = pagedResult?.stats;

  // Tính thống kê từ Backend (để chính xác trên toàn bộ tập dữ liệu, không chỉ trang hiện tại)
  const stats = {
     totalCount: totalItems,
     totalRevenue: backendStats?.totalRevenue || 0,
     cash: backendStats?.cash || 0,
     card: backendStats?.card || 0,
     transfer: backendStats?.transfer || 0,
     refunded: backendStats?.refunded || 0
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-purple-400 font-bold text-xs uppercase tracking-[0.2em]">Financial Ledger</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Sổ Quỹ <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-500">Giao Dịch</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tìm #HD, tên khách..." 
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-purple-500/50 transition-colors focus:bg-white/10 w-[220px]"
            />
          </div>
          
          <div className="relative z-20">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 border rounded-2xl transition-all font-bold text-sm",
                isFilterOpen || methodFilter !== 'all' ? "bg-purple-500 text-white border-purple-500" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              <Filter size={18} />
              {methodFilter === 'all' ? 'Tất cả PTThanh toán' : PAYMENT_METHODS[methodFilter as unknown as keyof typeof PAYMENT_METHODS]?.label}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-64 bg-[#0c0e12]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-3 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="space-y-1">
                    <button
                      onClick={() => { setMethodFilter('all'); setIsFilterOpen(false); setPage(1); }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold",
                        methodFilter === 'all' ? "bg-purple-500 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                      )}
                    >
                      Tất cả
                    </button>
                    {Object.entries(PAYMENT_METHODS).map(([key, config]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setMethodFilter(key);
                          setIsFilterOpen(false);
                          setPage(1);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold",
                          methodFilter === key ? "bg-purple-500 text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {config.icon}
                          {config.label}
                        </div>
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
            onChange={(e) => { setSelectedDate(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-purple-500/50 transition-colors focus:bg-white/10 text-xs font-bold"
          />
        </div>
      </div>

      {/* Top Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
      >
        <div className="glass rounded-2xl p-5 border bg-white/5 border-white/5">
            <div className="mb-3 text-muted-foreground"><Receipt size={20} /></div>
            <div className="text-2xl font-black">{totalItems}</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Hóa Đơn</div>
        </div>
        <div className="glass rounded-2xl p-5 border bg-emerald-500/10 border-emerald-500/20">
            <div className="mb-3 text-emerald-400"><DollarSign size={20} /></div>
            <div className="text-2xl font-black">{stats.totalRevenue.toLocaleString()} đ</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Doanh Thu</div>
        </div>
        <div className="glass rounded-2xl p-5 border bg-yellow-500/10 border-yellow-500/20">
            <div className="mb-3 text-yellow-400"><DollarSign size={20} /></div>
            <div className="text-2xl font-black">{stats.cash.toLocaleString()} đ</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Tiền Mặt</div>
        </div>
        <div className="glass rounded-2xl p-5 border bg-blue-500/10 border-blue-500/20">
            <div className="mb-3 text-blue-400"><CreditCard size={20} /></div>
            <div className="text-2xl font-black">{stats.card.toLocaleString()} đ</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Thẻ TD</div>
        </div>
        <div className="glass rounded-2xl p-5 border bg-purple-500/10 border-purple-500/20">
            <div className="mb-3 text-purple-400"><Wallet size={20} /></div>
            <div className="text-2xl font-black">{stats.transfer.toLocaleString()} đ</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">CK & Ví ĐT</div>
        </div>
        <div className="glass rounded-2xl p-5 border bg-red-500/10 border-red-500/20">
            <div className="mb-3 text-red-400"><RotateCcw size={20} /></div>
            <div className="text-2xl font-black">{stats.refunded.toLocaleString()} đ</div>
            <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-widest">Đã Hoàn Trả</div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="glass rounded-[2rem] overflow-hidden border-white/5 relative z-10"
      >
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-purple-500 w-10 h-10 mb-4" />
            <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">Đang trích xuất sổ phụ...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-20 flex flex-col items-center justify-center text-center">
            <Receipt size={60} className="text-white/10 mb-4" />
            <h3 className="text-xl font-bold mb-2">Chưa có giao dịch nào</h3>
            <p className="text-muted-foreground text-sm">Không tìm thấy hóa đơn phù hợp với bộ lọc hiện tại.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.03]">
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Mã Hóa Đơn</th>
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Thời gian</th>
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Khách / Bàn</th>
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Hình thức</th>
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Tổng tiền</th>
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase text-right">Trạng thái</th>
                  <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {invoices.map((inv, idx) => {
                    const payMethodConfig = PAYMENT_METHODS[inv.paymentMethod as keyof typeof PAYMENT_METHODS] || PAYMENT_METHODS[0];
                    const statusConfig = INVOICE_STATUS[inv.status] || INVOICE_STATUS[0];
                    const isVoided = inv.status === 2;

                    return (
                      <motion.tr 
                        key={inv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        className={cn("border-b border-white/5 hover:bg-white/5 transition-colors group", isVoided && "opacity-60 bg-red-500/5")}
                      >
                        <td className="py-4 px-6">
                            <div className="font-mono font-bold text-white">#HD-{inv.id.toString().padStart(5, '0')}</div>
                            <div className="text-[10px] text-muted-foreground mt-0.5">Order #{inv.orderId}</div>
                        </td>
                        <td className="py-4 px-6 text-xs text-muted-foreground font-medium">
                          {new Date(inv.issuedAt).toLocaleTimeString()} <br/>
                          {new Date(inv.issuedAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                           {/* Dùng any để linh hoạt với LedgerEntry từ Backend */}
                           <div className="text-sm font-bold text-white">{(inv as any).customerName || inv.customer?.fullName || 'Khách vãng lai'}</div>
                           <div className="text-xs text-muted-foreground">
                              {(inv as any).tableName ? 
                                 ((inv as any).tableName === 'Mang về' ? 'Mang về' : `Bàn ${(inv as any).tableName}`) : 
                                 (inv.order?.diningTable ? `Bàn ${inv.order.diningTable.tableNumber}` : 'Mang về')
                              }
                           </div>
                        </td>
                        <td className="py-4 px-6">
                            <div className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5", payMethodConfig.color)}>
                                {payMethodConfig.icon}
                                {payMethodConfig.label}
                            </div>
                        </td>
                        <td className="py-4 px-6">
                            <div className="font-bold text-emerald-400">{inv.finalAmount.toLocaleString()} đ</div>
                            {inv.vatAmount > 0 && <div className="text-[10px] text-muted-foreground">VAT: {inv.vatAmount.toLocaleString()}đ</div>}
                        </td>
                        <td className="py-4 px-6 text-right">
                             <div className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full inline-block", statusConfig.color)}>
                                {statusConfig.label}
                             </div>
                        </td>
                        <td className="py-4 px-6 flex items-center justify-end gap-2">
                           {!isVoided && (
                               <button 
                                 onClick={() => handleRefund(inv.id)}
                                 className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all"
                                 title="Hoàn tiền / Hủy bỏ"
                               >
                                 <RotateCcw size={14} />
                               </button>
                           )}
                           <button 
                             onClick={() => setReprintOrderId(inv.orderId)}
                             className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-all"
                             title="Tải File báo cáo PDF"
                           >
                             <Printer size={14} />
                           </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      <Pagination 
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />

      <InvoiceReprintModal 
        isOpen={!!reprintOrderId}
        onClose={() => setReprintOrderId(null)}
        orderId={reprintOrderId}
      />
    </div>
  );
}
