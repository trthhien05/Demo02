import React, { useEffect, useState } from 'react';
import { 
  Users, 
  DollarSign, 
  Calendar, 
  Utensils, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingCart,
  TrendingUp,
  Package,
  MapPin
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalCustomers: 0,
    todayRevenue: 0,
    totalOrders: 0,
    availableTables: 0,
    lowStockCount: 0
  });
  const [revenueHistory, setRevenueHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [custRes, revRes, invRes, tableRes] = await Promise.all([
        api.get('/reports/customer-summary'),
        api.get('/reports/revenue-stats'),
        api.get('/inventory/low-stock'),
        api.get('/table')
      ]);

      const today = new Date().toISOString().split('T')[0];
      const todayRev = revRes.data.find((r: any) => r.date === today)?.amount || 0;

      setStats({
        totalCustomers: custRes.data.totalCustomers,
        todayRevenue: todayRev,
        totalOrders: 42, // Mock if no endpoint
        availableTables: tableRes.data.filter((t: any) => t.status === 0).length,
        lowStockCount: invRes.data.length
      });
      setRevenueHistory(revRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Doanh thu hôm nay', value: `${stats.todayRevenue.toLocaleString()}đ`, icon: <DollarSign size={24} />, trend: '+12%', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { title: 'Tổng khách hàng', value: stats.totalCustomers, icon: <Users size={24} />, trend: '+5%', color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Đơn hàng mới', value: stats.totalOrders, icon: <ShoppingCart size={24} />, trend: '+18%', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    { title: 'Bàn sẵn sàng', value: stats.availableTables, icon: <MapPin size={24} />, trend: 'Phòng trà', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  if (loading) return <div className="text-center py-20 opacity-50">Đang khởi tạo Dashboard...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp size={32} className="text-primary" />
            Tổng quan RMS
          </h1>
          <p className="text-muted-foreground mt-1">Chào mừng quay trở lại. Dưới đây là tình hình hoạt động hiện tại của nhà hàng.</p>
        </div>
        <div className="flex gap-2">
           <button className="btn-primary" onClick={fetchDashboardData} title="Làm mới dữ liệu">
              <Calendar size={18} />
              Hôm nay
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="glass p-6 group hover:border-primary/30 transition-all border-l-4 border-l-transparent hover:border-l-primary"
          >
            <div className="flex justify-between items-start">
              <div className={`p-3 rounded-2xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                {card.icon}
              </div>
              <div className={`flex items-center gap-1 text-[10px] font-bold ${card.color.includes('emerald') ? 'text-emerald-400' : 'text-primary'}`}>
                 {card.trend.includes('+') ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                 {card.trend}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{card.title}</p>
              <h3 className="text-2xl font-black mt-1 font-mono tracking-tighter">{card.value}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glass p-8 space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2 underline underline-offset-8 decoration-primary/30">
                 Biểu đồ doanh thu tuần
              </h3>
              <div className="flex gap-4 text-[10px] font-bold uppercase text-muted-foreground">
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> Doanh thu</div>
                 <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-white/10"></div> Mục tiêu</div>
              </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueHistory}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#71717a" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis 
                    stroke="#71717a" 
                    fontSize={10} 
                    tickLine={false} 
                    axisLine={false}
                    tickFormatter={(val) => `${val/1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#0ea5e9' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#0ea5e9" 
                    fillOpacity={1} 
                    fill="url(#colorAmount)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Side Widget: System Health */}
        <div className="lg:col-span-1 space-y-6">
           <div className="glass p-8 space-y-6">
              <h3 className="font-bold text-lg">Cảnh báo hệ thống</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-red-500/30 transition-all">
                    <div className="flex items-center gap-3">
                       <Package size={20} className="text-red-400" />
                       <div>
                          <p className="text-sm font-bold">Nguyên liệu sắp hết</p>
                          <p className="text-[10px] text-muted-foreground">{stats.lowStockCount} mặt hàng cần nhập gấp</p>
                       </div>
                    </div>
                    <ArrowUpRight size={16} className="text-red-400" />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3">
                       <Utensils size={20} className="text-primary" />
                       <div>
                          <p className="text-sm font-bold">Đơn hàng tồn đọng</p>
                          <p className="text-[10px] text-muted-foreground">0 đơn hàng quá hạn 15p</p>
                       </div>
                    </div>
                    <ArrowUpRight size={16} className="text-primary" />
                 </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5">
                 <p className="text-xs font-bold text-muted-foreground uppercase mb-4">Trạng thái Bàn ăn</p>
                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '65%' }}></div>
                 </div>
                 <div className="flex justify-between text-[10px] font-bold mt-2 text-muted-foreground">
                    <span>ĐANG PHỤC VỤ: 14</span>
                    <span>TỔNG: 20</span>
                 </div>
              </div>
           </div>

           <div className="bg-primary/20 p-8 rounded-[2rem] border border-primary/20 relative overflow-hidden group cursor-pointer">
              <div className="relative z-10">
                 <h3 className="font-black text-2xl text-white">PRO MODE</h3>
                 <p className="text-xs text-primary font-bold">Mở khóa tính năng Tự động hóa kho</p>
              </div>
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                 <ShoppingCart size={80} />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
