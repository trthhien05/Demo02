'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Tag, Plus, MessageSquareShare, Search, Loader2, 
  Gift, Users, TrendingUp, Calendar, Send, Sparkles,
  Ticket, CheckCircle2, Clock, MapPin, X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import VoucherModal from '@/components/admin/promotions/VoucherModal';

interface Voucher {
  id: number;
  code: string;
  description: string | null;
  discountType: number; // 0: Percentage, 1: Fixed
  value: number;
  expiryDate: string;
  isUsed: boolean;
  createdAt: string;
  customer?: { fullName: string; phoneNumber: string };
}

// ── SMS Modal ──────────────────────────────────────────────────────────────────
function SMSCampaignModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [target, setTarget] = useState({ tier: '', segment: '' });
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/marketing/bulk-campaign', data),
    onSuccess: (res: any) => {
      toast.success(res.data.message || 'Campaign queued!');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data || 'Failed to send campaign.')
  });

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) { toast.error('Message content is required'); return; }
    setSending(true);
    try {
      await mutation.mutateAsync({
        messageContent: content,
        targetTier: target.tier === '' ? null : parseInt(target.tier),
        targetSegment: target.segment === '' ? null : target.segment
      });
    } finally { setSending(false); }
  };

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
        className="bg-[#0c0e14] border border-white/10 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3 font-bold">
            <MessageSquareShare size={20} className="text-primary" />
            Chiến Dịch SMS Hàng Loạt
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Nhóm Khách Mục Tiêu</label>
            <select 
              value={target.tier} 
              onChange={e => setTarget(t => ({ ...t, tier: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
            >
              <option value="" className="bg-[#0c0e14]">Tất cả khách hàng đang hoạt động</option>
              <option value="0" className="bg-[#0c0e14]">Chỉ hạng Thành viên (Member)</option>
              <option value="1" className="bg-[#0c0e14]">Chỉ hạng Bạc (Silver)</option>
              <option value="2" className="bg-[#0c0e14]">Chỉ hạng Vàng (Gold)</option>
              <option value="3" className="bg-[#0c0e14]">Chỉ hạng VIP Kim Cương (Diamond)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Nội Dung Tin Nhắn</label>
            <textarea 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Chào {{name}}! Chúng tôi có một món quà đặc biệt dành cho bạn hôm nay..."
              className="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none resize-none"
            />
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
              <span>Số ký tự: {content.length}</span>
              <span>1 Đoạn tin nhắn</span>
            </div>
          </div>

          <button 
            type="submit" disabled={sending}
            className="w-full py-4 rounded-xl bg-primary hover:bg-primary/80 text-primary-foreground font-black text-sm flex items-center justify-center gap-2 group transition-all"
          >
            {sending ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                BẮT ĐẦU CHIẾN DỊCH
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [search, setSearch] = useState('');
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isSMSModalOpen, setIsSMSModalOpen] = useState(false);

  const { data: vouchers = [], isLoading } = useQuery<Voucher[]>({
    queryKey: ['vouchers'],
    queryFn: async () => (await apiClient.get('/voucher')).data,
    refetchInterval: 60000
  });

  const stats = useMemo(() => ({
    total: vouchers.length,
    active: vouchers.filter(v => !v.isUsed && new Date(v.expiryDate) > new Date()).length,
    used: vouchers.filter(v => v.isUsed).length,
    expired: vouchers.filter(v => !v.isUsed && new Date(v.expiryDate) <= new Date()).length,
  }), [vouchers]);

  const displayedVouchers = useMemo(() => {
    if (!search.trim()) return vouchers;
    return vouchers.filter(v => 
      v.code.toLowerCase().includes(search.toLowerCase()) || 
      v.description?.toLowerCase().includes(search.toLowerCase()) ||
      v.customer?.fullName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [vouchers, search]);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-yellow-400 font-bold text-xs uppercase tracking-[0.2em]">Marketing Engine</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Chiến Dịch & <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">Khuyến Mãi</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" placeholder="Tìm mã, mô tả..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-yellow-500/50 transition-colors focus:bg-white/10 w-[220px]"
            />
          </div>
          <button 
            onClick={() => setIsSMSModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm"
          >
            <MessageSquareShare size={18} /> Gửi SMS Hàng Loạt
          </button>
          <motion.button 
            onClick={() => setIsVoucherModalOpen(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-400 to-amber-500 shadow-[0_10px_30px_rgba(234,179,8,0.2)]"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Plus size={18} className="text-yellow-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold text-yellow-400">Tạo Chiến Dịch</span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Tổng Voucher', value: stats.total, icon: <Ticket size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Đang Hoạt Động', value: stats.active, icon: <Clock size={20} />, color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
          { label: 'Đã Sử Dụng', value: stats.used, icon: <CheckCircle2 size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Tỉ Lệ Chuyển Đổi', value: stats.total > 0 ? `${((stats.used / stats.total) * 100).toFixed(1)}%` : '0%', icon: <TrendingUp size={20} />, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
        ].map((stat) => (
          <div key={stat.label} className={cn("glass rounded-2xl p-5 border", stat.bg)}>
            <div className={cn("mb-3", stat.color)}>{stat.icon}</div>
            <div className="text-3xl font-black">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-bold uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left: Vouchers Table */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="lg:w-2/3 glass rounded-[2rem] overflow-hidden border-white/5"
        >
          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-yellow-500 w-10 h-10 mb-4" />
              <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">Đang tải danh sách Voucher...</p>
            </div>
          ) : displayedVouchers.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center">
              <Tag size={60} className="text-white/10 mb-4" />
              <h3 className="text-xl font-bold mb-2">Chưa có chiến dịch nào</h3>
              <p className="text-muted-foreground text-sm">Hãy bắt đầu tạo chương trình khách hàng thân thiết đầu tiên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.03]">
                    <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Mã Voucher</th>
                    <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Mô tả</th>
                    <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Giá trị</th>
                    <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Người nhận</th>
                    <th className="py-4 px-6 text-[10px] font-black text-muted-foreground tracking-[0.2em] uppercase">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {displayedVouchers.map((v, idx) => {
                       const isExpired = new Date(v.expiryDate) < new Date() && !v.isUsed;
                       return (
                        <motion.tr 
                          key={v.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors group"
                        >
                          <td className="py-4 px-6">
                            <span className="font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-lg border border-yellow-400/20">{v.code}</span>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium">{v.description || 'Quà tặng chiến dịch'}</td>
                          <td className="py-4 px-6">
                            <span className="font-black text-emerald-400">
                                {v.discountType === 0 ? `${v.value}%` : `${v.value.toLocaleString()} VNĐ`}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                             <div className="text-xs font-bold">{v.customer?.fullName || 'Tặng Hàng Loạt'}</div>
                             <div className="text-[10px] text-muted-foreground">{v.customer?.phoneNumber || 'Nhiều khách hàng'}</div>
                          </td>
                          <td className="py-4 px-6">
                            {v.isUsed ? (
                              <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1 w-fit">
                                <CheckCircle2 size={10} /> Đã dùng
                              </span>
                            ) : isExpired ? (
                              <span className="text-[10px] font-black uppercase text-red-400 bg-red-400/10 px-2 py-1 rounded-full border border-red-400/30 w-fit">Hết hạn</span>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full border border-yellow-400/30 w-fit">Đang chạy</span>
                            )}
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

        {/* Right: Quick Tools */}
        <div className="lg:w-1/3 space-y-6">
           <motion.div 
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
             className="glass rounded-[2rem] p-6 border-white/5 bg-gradient-to-br from-yellow-400/[0.05] to-amber-500/[0.02]"
           >
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                 <Sparkles size={18} className="text-yellow-400" /> Bí Quyết Marketing
              </h3>
              <div className="space-y-4">
                 {[
                   { title: 'Thời điểm gửi tốt nhất', desc: 'Sáng Thứ 7 lúc 11:00 thường mang lại tỉ lệ mở cao hơn 25%.', icon: <Calendar size={16} /> },
                   { title: 'Cá nhân hóa nội dung', desc: 'Sử dụng tag {{name}} để tăng tỉ lệ dùng Voucher thêm 30%.', icon: <Gift size={16} /> },
                   { title: 'Tạo sự khan hiếm', desc: 'Voucher hết hạn trong < 3 ngày có tốc độ chuyển đổi nhanh nhất.', icon: <Clock size={16} /> },
                 ].map((t, i) => (
                   <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="p-2 h-fit rounded-xl bg-white/5 text-yellow-400">{t.icon}</div>
                      <div>
                         <div className="text-sm font-bold">{t.title}</div>
                         <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
             className="glass rounded-[2rem] p-6 border-white/5"
           >
              <h3 className="text-lg font-bold mb-4">Mẹo Cho Hệ Thống Loyalty</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 Phân khúc khách hàng là chìa khóa! Chỉ gửi Voucher **KIM CƯƠNG** cho những khách chi tiêu cao để giữ vững vị thế thương hiệu. Sử dụng công cụ **SMS Hàng Loạt** để thông báo cho họ một cách tinh tế.
              </p>
           </motion.div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
         {isVoucherModalOpen && <VoucherModal isOpen={isVoucherModalOpen} onClose={() => setIsVoucherModalOpen(false)} />}
         {isSMSModalOpen && <SMSCampaignModal isOpen={isSMSModalOpen} onClose={() => setIsSMSModalOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
