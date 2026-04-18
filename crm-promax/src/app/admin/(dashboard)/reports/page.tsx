'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Clock, 
  Crown, 
  Download, 
  Loader2, 
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ReportsPage() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Busy Hours
  const { data: busyHours = [], isLoading: isBusyLoading } = useQuery({
    queryKey: ['busy-hours'],
    queryFn: async () => (await apiClient.get('/reports/busy-hours')).data
  });

  // 2. Category Revenue
  const { data: categoryRevenue = [], isLoading: isCatLoading } = useQuery({
    queryKey: ['category-revenue'],
    queryFn: async () => (await apiClient.get('/reports/category-revenue')).data
  });

  // 3. Top Spenders
  const { data: topSpenders = [], isLoading: isSpendersLoading } = useQuery({
    queryKey: ['top-spenders'],
    queryFn: async () => (await apiClient.get('/reports/top-spenders')).data
  });

  // 4. Daily Revenue (Last 30 days)
  const { data: revenueData = [], isLoading: isRevLoading } = useQuery({
    queryKey: ['revenue-stats-30'],
    queryFn: async () => (await apiClient.get('/reports/revenue-stats?days=30')).data
  });

  const isLoading = isBusyLoading || isCatLoading || isSpendersLoading || isRevLoading;

  if (isLoading || !isMounted) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-muted-foreground font-black uppercase tracking-[0.3em] text-[10px]">Đang tổng hợp dữ liệu thông minh...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-primary font-bold text-[10px] uppercase tracking-[0.3em] mb-2 block italic">Enterprise Intelligence</span>
          <h1 className="text-4xl font-black italic tracking-tighter">Báo Cáo <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Thông Minh</span></h1>
        </motion.div>

        <button className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-3">
          <Download size={16} /> Xuất PDF Chuyên Nghiệp
        </button>
      </div>

      {/* Row 1: Revenue & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Line Chart: Revenue Trend */}
         <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 glass rounded-[2.5rem] p-8 border-white/5"
         >
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-2xl text-primary"><TrendingUp size={20} /></div>
                  <h3 className="font-bold text-lg italic">Tăng Trưởng Doanh Thu (30 Ngày)</h3>
               </div>
               <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1">
                  <ArrowUpRight size={12} /> Live Stats
               </div>
            </div>
            <div className="h-[350px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                     <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                           <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                           <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                     </defs>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                     <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0c0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                     />
                     <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </motion.div>

         {/* Pie Chart: Category Distribution */}
         <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-[2.5rem] p-8 border-white/5"
         >
            <div className="flex items-center gap-3 mb-8">
               <div className="p-3 bg-accent/10 rounded-2xl text-accent"><PieChartIcon size={20} /></div>
               <h3 className="font-bold text-lg italic">Cơ Cấu Doanh Mục</h3>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                     <Pie
                        data={categoryRevenue}
                        cx="50%" cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={8}
                        dataKey="revenue"
                        nameKey="category"
                     >
                        {categoryRevenue.map((entry: any, index: number) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                     </Pie>
                     <Tooltip 
                        contentStyle={{ backgroundColor: '#0c0e14', border: 'none', borderRadius: '12px' }}
                     />
                     <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
               </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-4 uppercase tracking-[0.2em]">Based on total lifetime sales</p>
         </motion.div>
      </div>

      {/* Row 2: Busy Hours & Top Spenders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Bar Chart: Busy Hours */}
         <motion.div 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="glass rounded-[2.5rem] p-8 border-white/5"
         >
            <div className="flex items-center gap-3 mb-8">
               <div className="p-3 bg-orange-500/10 rounded-2xl text-orange-400"><Clock size={20} /></div>
               <h3 className="font-bold text-lg italic">Khung Giờ Cao Điểm</h3>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={busyHours}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                     <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} tickFormatter={(h) => `${h}h`} />
                     <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                     <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ backgroundColor: '#0c0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                     <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </motion.div>

         {/* List: Top Spenders */}
         <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="glass rounded-[2.5rem] p-8 border-white/5 overflow-hidden"
         >
            <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-3">
                  <div className="p-3 bg-yellow-500/10 rounded-2xl text-yellow-500"><Crown size={20} /></div>
                  <h3 className="font-bold text-lg italic">Top 10 Khách Hàng Thân Thiết</h3>
               </div>
               <Sparkles className="text-yellow-500 animate-pulse" size={18} />
            </div>

            <div className="space-y-4">
               {topSpenders.map((customer: any, idx: number) => (
                  <div key={customer.customerId} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors group">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center font-black text-sm text-primary border border-white/10">
                           {idx + 1}
                        </div>
                        <div>
                           <h4 className="font-bold text-sm tracking-tight">{customer.name}</h4>
                           <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{customer.orderCount} Đơn hàng</p>
                        </div>
                     </div>
                     <div className="text-right">
                        <span className="text-sm font-black text-emerald-400">{customer.totalSpent.toLocaleString()} {revenueData[0]?.currency || 'VNĐ'}</span>
                        <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                           <motion.div 
                              initial={{ width: 0 }} animate={{ width: `${(customer.totalSpent / topSpenders[0].totalSpent) * 100}%` }}
                              className="h-full bg-emerald-400" 
                           />
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </motion.div>
      </div>

      <div className="glass rounded-[2.5rem] p-10 border-white/5 bg-gradient-to-br from-primary/5 to-transparent text-center">
         <h2 className="text-2xl font-black italic mb-4">Mở Khóa Tiềm Năng Tăng Trưởng</h2>
         <p className="text-muted-foreground text-sm max-w-2xl mx-auto leading-relaxed">
            Dữ liệu của bạn cho thấy khung giờ **18h - 20h** mang lại lượng khách cao nhất. Hãy cân nhắc tung ra các **Chương trình khuyến mãi giờ thấp điểm** để tối ưu hóa công suất nhà hàng vào buổi sáng.
         </p>
      </div>
    </div>
  );
}
