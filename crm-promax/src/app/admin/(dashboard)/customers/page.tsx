'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Download, Search, Loader2, Crown,
  X, Gift, TrendingUp, ShoppingBag, Calendar,
  Phone, Mail, Star, Minus, ChevronRight, Edit2, Trash2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Pagination from '@/components/common/Pagination';

// ── Helpers ────────────────────────────────────────────────────────────────────
function exportCustomersCSV(customers: any[]) {
  if (customers.length === 0) {
    toast.error("Không có khách hàng nào để xuất!");
    return;
  }

  const tId = toast.loading("Đang nạp dữ liệu khách hàng...");
  
  try {
    const header = 'ID,Họ Tên,Số Điện Thoại,Email,Hạng,Điểm,Ngày Tham Gia,Lần Ghé Cuối,Phân Khúc';
    const rows = customers.map(c =>
      [
        c.id,
        `"${c.fullName || ''}"`,
        c.phoneNumber,
        c.email || '',
        ['Member', 'Silver', 'Gold', 'Diamond'][c.tier] || 'Member',
        c.points,
        new Date(c.createdAt).toLocaleDateString('vi-VN'),
        c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('vi-VN') : '',
        `"${c.segment || ''}"`
      ].join(',')
    );
    const bom = '\uFEFF';
    const csv = bom + [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất danh sách khách hàng!', { id: tId });
  } catch (err) {
    toast.error("Lỗi khi xuất dữ liệu khách hàng", { id: tId });
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface Customer {
  id: number;
  fullName: string | null;
  phoneNumber: string;
  email: string | null;
  points: number;
  tier: number;           // 0=Member 1=Silver 2=Gold 3=Diamond
  createdAt: string;
  lastVisit: string | null;
  gender: string | null;
  segment: string | null;
}

interface CustomerStats {
  totalSpent: number;
  visitCount: number;
  recentInvoices: { id: number; finalAmount: number; issuedAt: string; paymentMethod: number }[];
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TIER_MAP: Record<number, { label: string; color: string; iconColor: string; ring: string; bg: string }> = {
  3: { label: 'Diamond VIP', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', iconColor: 'text-purple-400', ring: 'ring-purple-500/30', bg: 'from-purple-500/10 to-violet-500/5' },
  2: { label: 'Gold', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', iconColor: 'text-yellow-400', ring: 'ring-yellow-500/30', bg: 'from-yellow-500/10 to-amber-500/5' },
  1: { label: 'Silver', color: 'bg-slate-300/10 text-slate-300 border-slate-300/20', iconColor: 'text-slate-300', ring: 'ring-slate-400/30', bg: 'from-slate-400/10 to-slate-500/5' },
  0: { label: 'Member', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', iconColor: 'text-blue-400', ring: 'ring-blue-400/20', bg: 'from-blue-500/5 to-indigo-500/5' },
};

const PAYMENT_LABELS: Record<number, string> = { 0: 'Tiền mặt', 1: 'Thẻ', 2: 'Chuyển khoản', 3: 'Ví điện tử' };

// ── Customer Form Modal (Add/Edit) ──────────────────────────────────────────────
function CustomerFormModal({ onClose, editCustomer }: { onClose: () => void, editCustomer?: Customer | null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ 
    fullName: editCustomer?.fullName || '', 
    phoneNumber: editCustomer?.phoneNumber || '', 
    email: editCustomer?.email || '', 
    gender: editCustomer?.gender || '',
    segment: editCustomer?.segment || '' 
  });
  const [saving, setSaving] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => editCustomer 
      ? apiClient.put(`/customer/${editCustomer.id}`, { ...data, id: editCustomer.id })
      : apiClient.post('/customer', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(editCustomer ? 'Đã cập nhật thông tin khách hàng!' : 'Đã thêm khách hàng mới!');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data || 'Có lỗi xảy ra. Vui lòng kiểm tra lại.')
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phoneNumber.trim()) { toast.error('Số điện thoại là bắt buộc'); return; }
    setSaving(true);
    try { await mutation.mutateAsync(form); }
    finally { setSaving(false); }
  };

  const segments = ['Mới', 'Trung thành', 'VVIP', 'Khách đoàn', 'Dễ mất', 'Sự kiện'];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0c0e14] border border-white/10 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-xl font-bold">{editCustomer ? 'Chỉnh sửa Thông tin' : 'Thêm Khách Hàng Mới'}</h2>
            <p className="text-xs text-muted-foreground mt-1">{editCustomer ? `ID: #${editCustomer.id}` : 'Đăng ký vào hệ thống CRM'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="col-span-2">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Số Điện Thoại <span className="text-red-400">*</span></label>
               <input
                 type="tel" value={form.phoneNumber}
                 disabled={!!editCustomer}
                 onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-colors disabled:opacity-50"
                 placeholder="VD: 0901234567"
               />
             </div>
             <div>
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Họ và Tên</label>
               <input
                 value={form.fullName}
                 onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-colors"
                 placeholder="Tên khách"
               />
             </div>
             <div>
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Giới Tính</label>
               <select
                 value={form.gender}
                 onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-colors appearance-none"
               >
                 <option value="" className="bg-[#0c0e14]">Chưa xác định</option>
                 <option value="Nam" className="bg-[#0c0e14]">Nam</option>
                 <option value="Nữ" className="bg-[#0c0e14]">Nữ</option>
               </select>
             </div>
             <div className="col-span-2">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Email</label>
               <input
                 type="email" value={form.email}
                 onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                 className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500/50 outline-none transition-colors"
                 placeholder="email@example.com"
               />
             </div>
             <div className="col-span-2">
               <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Phân Khúc Khách Hàng</label>
               <div className="flex flex-wrap gap-2 pt-1">
                 {segments.map(s => (
                    <button
                       key={s} type="button"
                       onClick={() => setForm(f => ({ ...f, segment: f.segment === s ? '' : s }))}
                       className={cn(
                          "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border",
                          form.segment === s ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-white/5 text-muted-foreground border-white/10"
                       )}
                    >
                       {s}
                    </button>
                 ))}
               </div>
             </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-white/5">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors text-muted-foreground">Hủy</button>
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white flex items-center gap-2 min-w-[140px] justify-center"
            >
              {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <>{editCustomer ? 'Cập Nhật' : 'Đăng Ký Khách'}</>}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Customer Profile Modal ─────────────────────────────────────────────────────
function CustomerProfileModal({ customer, onClose, onEdit }: { customer: Customer; onClose: () => void; onEdit: () => void }) {
  const queryClient = useQueryClient();
  const [pointsDelta, setPointsDelta] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  const tier = TIER_MAP[customer.tier] || TIER_MAP[0];

  const { data: stats, isLoading: statsLoading } = useQuery<CustomerStats>({
    queryKey: ['customer-stats', customer.id],
    queryFn: async () => (await apiClient.get(`/customer/${customer.id}/stats`)).data,
  });

  const adjustMutation = useMutation({
    mutationFn: (delta: number) => apiClient.post(`/customer/${customer.id}/adjust-points`, delta),
    onSuccess: (_, delta) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`${delta > 0 ? 'Cộng' : 'Trừ'} ${Math.abs(delta)} điểm thành công!`);
      setAdjusting(false);
      setPointsDelta(0);
    },
    onError: () => toast.error('Không thể điều chỉnh điểm.')
  });

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0c0e14] border border-white/10 shadow-2xl rounded-3xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Hero Header */}
        <div className={cn("relative p-8 bg-gradient-to-br border-b border-white/5", tier.bg)}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
            <X size={18} />
          </button>

          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className={cn("w-20 h-20 rounded-2xl ring-2 flex items-center justify-center text-3xl font-black bg-white/5", tier.ring)}>
              {customer.fullName?.[0]?.toUpperCase() || '?'}
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 mb-1">
                   <h2 className="text-2xl font-black">{customer.fullName || 'Ẩn danh'}</h2>
                   <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest", tier.color)}>
                     <Crown size={12} className={tier.iconColor} /> {tier.label}
                   </div>
                </div>
                <button 
                  onClick={onEdit}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 text-muted-foreground hover:text-white transition-all"
                >
                   <Edit2 size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Phone size={13} /> {customer.phoneNumber}</span>
                {customer.email && <span className="flex items-center gap-1.5"><Mail size={13} /> {customer.email}</span>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="font-black text-xl text-yellow-400">{customer.points.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">điểm tích lũy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Stats */}
          {statsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary w-6 h-6" /></div>
          ) : stats && (
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Tổng Chi Tiêu', value: `${stats.totalSpent.toLocaleString()}đ`, icon: <TrendingUp size={16} />, color: 'text-emerald-400' },
                { label: 'Số Lần Đến', value: stats.visitCount, icon: <Calendar size={16} />, color: 'text-blue-400' },
                { label: 'Hóa Đơn Gần Đây', value: stats.recentInvoices.length, icon: <ShoppingBag size={16} />, color: 'text-violet-400' },
              ].map(s => (
                <div key={s.label} className="glass rounded-2xl p-4 border-white/5 text-center">
                  <div className={cn("flex justify-center mb-2", s.color)}>{s.icon}</div>
                  <div className={cn("text-2xl font-black", s.color)}>{s.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Adjust Points */}
          <div className="glass rounded-2xl p-5 border-white/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Gift size={16} className="text-yellow-400" />
                <h3 className="font-bold text-sm">Điều Chỉnh Điểm Thưởng</h3>
              </div>
              <button
                onClick={() => setAdjusting(v => !v)}
                className="text-xs text-primary hover:underline font-medium"
              >
                {adjusting ? 'Đóng' : 'Mở chỉnh sửa'}
              </button>
            </div>

            <AnimatePresence>
              {adjusting && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 pt-2">
                    <button onClick={() => setPointsDelta(d => d - 100)} className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors font-bold"><Minus size={16} /></button>
                    <div className="flex-1 text-center">
                      <div className={cn("text-3xl font-black", pointsDelta >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {pointsDelta >= 0 ? '+' : ''}{pointsDelta}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">điểm thay đổi</div>
                    </div>
                    <button onClick={() => setPointsDelta(d => d + 100)} className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors font-bold"><Plus size={16} /></button>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {[-500, -100, +100, +500].map(v => (
                      <button key={v} onClick={() => setPointsDelta(d => d + v)}
                        className={cn("flex-1 py-2 rounded-xl text-xs font-bold transition-colors border",
                          v > 0 ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400' : 'border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400'
                        )}>
                        {v > 0 ? '+' : ''}{v}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => pointsDelta !== 0 && adjustMutation.mutate(pointsDelta)}
                    disabled={pointsDelta === 0 || adjustMutation.isPending}
                    className="w-full mt-3 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {adjustMutation.isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <Gift size={16} />}
                    Xác Nhận Điều Chỉnh
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent Invoices */}
          {stats && stats.recentInvoices.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <ShoppingBag size={14} className="text-muted-foreground" /> Lịch Sử Giao Dịch Gần Đây
              </h3>
              <div className="space-y-2">
                {stats.recentInvoices.map((inv, i) => (
                  <div key={inv.id} className="flex items-center justify-between glass rounded-xl px-4 py-3 border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {i + 1}
                      </div>
                      <div>
                        <div className="text-xs font-mono text-muted-foreground">INV-{inv.id.toString().padStart(5, '0')}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(inv.issuedAt).toLocaleDateString('vi-VN')} · {PAYMENT_LABELS[inv.paymentMethod]}
                        </div>
                      </div>
                    </div>
                    <div className="font-black text-emerald-400 font-mono">{inv.finalAmount.toLocaleString()}đ</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profile Info */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Giới tính', value: customer.gender || '—' },
              { label: 'Phân khúc', value: customer.segment || '—' },
              { label: 'Ngày tham gia', value: new Date(customer.createdAt).toLocaleDateString('vi-VN') },
              { label: 'Lần ghé thăm cuối', value: customer.lastVisit ? new Date(customer.lastVisit).toLocaleDateString('vi-VN') : '—' },
            ].map(f => (
              <div key={f.label} className="glass rounded-xl p-3 border-white/5">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{f.label}</div>
                <div className="font-bold">{f.value}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;
  const queryClient = useQueryClient();

  const { data: pagedResult, isLoading } = useQuery<{
    items: Customer[];
    totalCount: number;
    totalPages: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ['customers', page, tierFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());
      if (tierFilter !== null) params.append('tier', tierFilter.toString());
      if (search.trim()) params.append('search', search.trim());
      
      const res = await apiClient.get(`/customer?${params.toString()}`);
      return res.data;
    },
  });

  const customers: Customer[] = pagedResult?.items || [];
  const totalPages = pagedResult?.totalPages || 0;
  const totalItems = pagedResult?.totalCount || 0;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/customer/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success("Đã xóa khách hàng thành công");
    },
    onError: (err: any) => {
      const msg = err.response?.data || "Không thể xóa khách hàng này (có thể do lỗi dữ liệu hoặc lịch sử giao dịch)";
      toast.error(msg);
    }
  });

  const handleDelete = (id: number, name: string) => {
    toast(`Xác nhận xóa khách hàng ${name}?`, {
      action: {
        label: "Xác nhận",
        onClick: () => deleteMutation.mutate(id)
      }
    });
  };

  const tierCounts = useMemo(() => ({
    3: customers.filter(c => c.tier === 3).length,
    2: customers.filter(c => c.tier === 2).length,
    1: customers.filter(c => c.tier === 1).length,
    0: customers.filter(c => c.tier === 0).length,
  }), [customers]);

  // Server-side filtering now
  const displayed = customers;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em]">CRM Module</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Customer <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Directory</span></h1>
        </motion.div>
        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text" placeholder="Tìm tên, SĐT, email..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 transition-colors focus:bg-white/10 w-[250px]"
            />
          </div>
          <button
            onClick={() => exportCustomersCSV(displayed)}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
            <Download size={16} /> Xuất Danh Sách
          </button>
          <motion.button
            onClick={() => { setEditingCustomer(null); setIsFormModalOpen(true); }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500"
          >
            <div className="bg-background/90 rounded-[15px] px-5 py-3 flex items-center gap-2.5">
              <Plus size={16} className="text-blue-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">Thêm Khách Hàng</span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Tier filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTierFilter(null)}
          className={cn("px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border",
            tierFilter === null ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-white/5 text-muted-foreground border-white/5 hover:text-white hover:bg-white/10'
          )}
        >
          Tất cả <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-white/10">{customers.length}</span>
        </button>
        {([3, 2, 1, 0] as const).map(tier => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={cn("px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border flex items-center gap-2",
              tierFilter === tier ? TIER_MAP[tier].color : 'bg-white/5 text-muted-foreground border-white/5 hover:text-white hover:bg-white/10'
            )}
          >
            <Crown size={13} className={tierFilter === tier ? TIER_MAP[tier].iconColor : ''} />
            {TIER_MAP[tier].label}
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/10">{tierCounts[tier]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass rounded-[2rem] p-8 min-h-[400px] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 w-10 h-10 mb-4" />
          <p className="text-muted-foreground animate-pulse">Đang nạp cơ sở dữ liệu khách VIP...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="glass rounded-[2rem] overflow-hidden border-white/5"
        >
          {displayed.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Users size={60} className="text-white/10 mb-4" />
              <h3 className="text-xl font-bold mb-2">Không tìm thấy khách hàng</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.03]">
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase">Khách Hàng</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase">Liên Hệ</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase">Hạng VIP</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase text-right">Điểm</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase text-right">Hồ Sơ</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {displayed.map((c, idx) => {
                      const tier = TIER_MAP[c.tier] || TIER_MAP[0];
                      return (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-10 h-10 rounded-xl ring-1 flex items-center justify-center font-black text-sm bg-gradient-to-br", tier.bg, tier.ring)}>
                                {c.fullName?.[0]?.toUpperCase() || '?'}
                              </div>
                              <div>
                                <div className="font-bold">{c.fullName || 'Ẩn danh'}</div>
                                <div className="text-xs text-muted-foreground font-mono">#{c.id.toString().padStart(4, '0')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-medium">{c.phoneNumber}</div>
                            <div className="text-xs text-muted-foreground">{c.email || '—'}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase", tier.color)}>
                              <Crown size={12} className={tier.iconColor} /> {tier.label}
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-br from-yellow-400 to-amber-500">
                              {c.points.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground ml-1">pts</span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                                <button 
                                   onClick={(e) => { e.stopPropagation(); setEditingCustomer(c); setIsFormModalOpen(true); }}
                                   className="p-2 hover:bg-white/10 rounded-xl text-primary transition-colors"
                                >
                                   <Edit2 size={16} />
                                </button>
                                <button 
                                   onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.fullName || c.phoneNumber); }}
                                   className="p-2 hover:bg-red-500/10 rounded-xl text-red-400 transition-colors"
                                >
                                   <Trash2 size={16} />
                                </button>
                                <button className="flex items-center gap-1.5 text-xs text-muted-foreground font-bold hover:text-white transition-colors">
                                  <ChevronRight size={14} />
                                </button>
                            </div>
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
      )}

      <Pagination 
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalItems={totalItems}
        pageSize={pageSize}
      />

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <CustomerProfileModal 
             customer={selectedCustomer} 
             onClose={() => setSelectedCustomer(null)} 
             onEdit={() => {
                setEditingCustomer(selectedCustomer);
                setIsFormModalOpen(true);
             }}
          />
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isFormModalOpen && (
          <CustomerFormModal 
             editCustomer={editingCustomer} 
             onClose={() => {
                setIsFormModalOpen(false);
                setEditingCustomer(null);
             }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
