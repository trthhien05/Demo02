import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  MoreHorizontal,
  Mail,
  Phone,
  Trophy,
  History,
  Merge
} from 'lucide-react';
import { motion } from 'framer-motion';
import api, { type Customer } from '../services/api';

const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await api.get('/customer');
        setCustomers(response.data);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const getTierBadge = (tier: number) => {
    const tiers = [
      { label: 'Member', color: 'bg-zinc-500/20 text-zinc-400' },
      { label: 'Silver', color: 'bg-slate-300/20 text-slate-300' },
      { label: 'Gold', color: 'bg-amber-400/20 text-amber-500' },
      { label: 'Diamond', color: 'bg-blue-400/20 text-blue-400' },
    ];
    const t = tiers[tier] || tiers[0];
    return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${t.color}`}>{t.label}</span>;
  };

  const getSegmentBadge = (segment: string) => {
    let color = 'bg-zinc-500/20 text-zinc-400';
    if (segment === 'Active') color = 'bg-emerald-500/20 text-emerald-400';
    if (segment === 'AtRisk') color = 'bg-red-500/20 text-red-400';
    if (segment === 'VIP_Active') color = 'bg-violet-500/20 text-violet-400';
    return <span className={`px-2 py-0.5 rounded-lg text-xs border border-white/5 ${color}`}>{segment || 'N/A'}</span>;
  };

  const filteredCustomers = customers.filter(c => 
    c.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phoneNumber.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users size={32} className="text-primary" />
            Hồ sơ khách hàng
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý và tra cứu thông tin khách hàng 360 độ từ hệ thống CRM.</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Tìm tên, số điện thoại..." 
              className="input-field pl-10 w-64 bg-white/5"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Filter size={18} />
            Lọc
          </button>
          <button className="btn-primary">
            + Thêm khách mới
          </button>
        </div>
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Khách hàng</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Thông tin liên lạc</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Phân hạng</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Điểm tích lũy</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Phân đoạn</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
               <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Đang tải dữ liệu...</td></tr>
            ) : filteredCustomers.length === 0 ? (
               <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-sm">Không tìm thấy khách hàng nào.</td></tr>
            ) : (
              filteredCustomers.map((customer, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={customer.id} 
                  className="group hover:bg-white/5 transition-colors border-b border-white/5"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {customer.fullName?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="font-bold">{customer.fullName || 'Chưa đặt tên'}</div>
                        <div className="text-xs text-muted-foreground">ID: #{customer.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Phone size={14} className="text-zinc-500" />
                        {customer.phoneNumber}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Mail size={14} />
                        {customer.email || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTierBadge(customer.tier)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-mono text-primary font-bold">
                      <Trophy size={16} />
                      {customer.points.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getSegmentBadge(customer.segment)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                       <button className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors" title="Lịch sử giao dịch">
                         <History size={18} />
                       </button>
                       <button className="p-2 hover:bg-blue-400/20 rounded-lg text-muted-foreground hover:text-blue-400 transition-colors" title="Gộp khách hàng">
                         <Merge size={18} />
                       </button>
                       <button className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white transition-colors">
                         <MoreHorizontal size={18} />
                       </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .tracking-wider { letter-spacing: 0.05em; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
        .bg-zinc-500\\/20 { background-color: rgba(113, 113, 122, 0.2); }
        .text-zinc-400 { color: #a1a1aa; }
        .text-zinc-300 { color: #d4d4d8; }
        .text-zinc-500 { color: #71717a; }
        .bg-slate-300\\/20 { background-color: rgba(203, 213, 225, 0.2); }
        .text-slate-300 { color: #cbd5e1; }
        .bg-amber-400\\/20 { background-color: rgba(251, 191, 36, 0.2); }
        .text-amber-500 { color: #f59e0b; }
        .bg-blue-400\\/20 { background-color: rgba(96, 165, 250, 0.2); }
        .text-blue-400 { color: #60a5fa; }
        .bg-emerald-500\\/20 { background-color: rgba(16, 185, 129, 0.2); }
        .text-emerald-400 { color: #34d399; }
        .bg-red-500\\/20 { background-color: rgba(239, 68, 68, 0.2); }
        .text-red-400 { color: #f87171; }
        .bg-violet-500\\/20 { background-color: rgba(139, 92, 246, 0.2); }
        .text-violet-400 { color: #a78bfa; }
      `}} />
    </div>
  );
};

export default Customers;
