'use client';

import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Filter,
  Download,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '@/lib/utils';
import TopSellingItems from '@/components/admin/dashboard/TopSellingItems';
import RecentOrdersTable from '@/components/admin/dashboard/RecentOrdersTable';
import TableStatusOverview from '@/components/admin/dashboard/TableStatusOverview';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isChartsMounted, setIsChartsMounted] = React.useState(false);
  const [daysFilter, setDaysFilter] = React.useState(7);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
    // Delay chart mounting to ensure layout stability (fixes width 0 warnings)
    const timer = setTimeout(() => setIsChartsMounted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Consolidated Dashboard Data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ['dashboard-stats', daysFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/dashboard?days=${daysFilter}`);
      return res.data;
    }
  });

  const { data: revenueStats = [], isLoading: isRevenueLoading } = useQuery({
    queryKey: ['revenue-stats', daysFilter],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/revenue-stats?days=${daysFilter}`);
      return res.data;
    }
  });

  const isGlobalLoading = isDashboardLoading || isRevenueLoading;

  const handleExportRevenue = async () => {
    try {
      setIsExporting(true);
      const res = await apiClient.get(`/reports/export-revenue?days=${daysFilter}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `RevenueReport_${daysFilter}Days.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      console.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  // Format Recharts data
  const chartData = revenueStats.map((item: any) => ({
    name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: item.amount,
  }));

  const stats = [
    { 
      label: 'Doanh Thu Hôm Nay', 
      value: `$${(dashboardData?.todayRevenue || 0).toLocaleString()}`, 
      trend: `${dashboardData?.revenueGrowth > 0 ? '+' : ''}${dashboardData?.revenueGrowth || 0}%`, 
      icon: DollarSign, 
      color: 'text-emerald-400', 
      bg: 'bg-emerald-400/10' 
    },
    { 
      label: 'Bàn Hoạt Động', 
      value: `${dashboardData?.activeTables || 0}/${dashboardData?.totalTables || 1}`, 
      trend: `${Math.round(((dashboardData?.activeTables || 0)/(dashboardData?.totalTables || 1))*100)}%`, 
      icon: ShoppingCart, 
      color: 'text-primary', 
      bg: 'bg-primary/10' 
    },
    { 
      label: 'Khách VIP', 
      value: dashboardData?.totalCustomers?.toLocaleString() || '0', 
      trend: 'CRM', 
      icon: Users, 
      color: 'text-blue-400', 
      bg: 'bg-blue-400/10' 
    },
    { 
      label: 'Hóa Đơn TB', 
      value: `$${(dashboardData?.averageCheck || 0).toFixed(2)}`, 
      trend: 'Order', 
      icon: TrendingUp, 
      color: 'text-orange-400', 
      bg: 'bg-orange-400/10' 
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* Top Section: Welcome & Actions */}
      <div className="flex items-end justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Tổng Quan Quản Lý</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Trung Tâm <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Hiệu Suất</span></h1>
        </motion.div>

        <div className="flex gap-4 relative">
          <div className="relative">
            <button 
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 border rounded-2xl transition-all font-bold text-sm",
                isFilterOpen ? "bg-primary text-white border-primary" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              <Filter size={18} />
              {daysFilter === 1 ? 'Hôm Nay' : `${daysFilter} Ngày`}
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 bg-[#0c0e12]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-3 shadow-2xl z-50 overflow-hidden"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground p-3">Thời gian báo cáo</div>
                  <div className="space-y-1">
                    {[1, 7, 14, 30].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          setDaysFilter(days);
                          setIsFilterOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold",
                          daysFilter === days ? "bg-primary text-white" : "text-muted-foreground hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {days === 1 ? 'Hôm Nay' : `${days} Ngày Qua`}
                        {daysFilter === days && <TrendingUp size={14} />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* VIP Export Button Area */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glow-border group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent"
          >
            <button 
              onClick={handleExportRevenue}
              disabled={isExporting}
              className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3 w-full h-full disabled:opacity-50"
            >
              {isExporting ? <Loader2 size={18} className="animate-spin text-primary" /> : <Download size={18} className="text-primary group-hover:-translate-y-1 transition-transform" />}
              <span className="text-sm font-bold">{isExporting ? 'Đang Xuất...' : 'Xuất Báo Cáo'}</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="stat-card relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl transition-all hover:scale-[1.02] hover:shadow-primary/20 group cursor-default"
          >
            {isGlobalLoading ? (
              <div className="animate-pulse flex flex-col h-full gap-4">
                 <div className="w-12 h-12 bg-white/10 rounded-2xl" />
                 <div className="w-24 h-4 bg-white/5 rounded-full mt-auto" />
                 <div className="w-32 h-8 bg-white/10 rounded-lg" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                    <stat.icon size={24} />
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold py-1 px-2 rounded-full border border-white/10 text-muted-foreground bg-white/5">
                    <TrendingUp size={12} className={stat.trend === 'Live' ? 'text-emerald-400' : 'text-primary'} />
                    {stat.trend}
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-3xl font-black mt-1 tracking-tighter">{stat.value}</h3>
                </div>
                {/* Hover Decor */}
                <div className="absolute -bottom-4 -right-4 p-2 opacity-5 scale-150 rotate-12 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <stat.icon size={100} />
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Grid Layout Row 1: Charts & Table Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 glass bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold">Phân Tích Doanh Thu</h3>
              <p className="text-xs text-muted-foreground mt-1">Theo dõi thu nhập hàng ngày so với tuần trước</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1">
                 {[7, 14, 30].map(days => (
                   <button 
                     key={days}
                     onClick={() => setDaysFilter(days)}
                     className={cn(
                       "px-4 py-1.5 text-xs font-bold rounded-lg transition-all",
                       daysFilter === days ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-white hover:bg-white/5"
                     )}
                   >
                     {days} Ngày
                   </button>
                 ))}
               </div>
               <div className="hidden sm:flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-primary" />
                 <span className="text-xs font-bold">Tổng Doanh Thu</span>
               </div>
            </div>
          </div>

          <div className="h-[320px] w-full" style={{ minHeight: '320px', minWidth: '0' }}>
            {isGlobalLoading ? (
               <div className="w-full h-full bg-white/5 animate-pulse rounded-2xl flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-48 h-4 bg-white/10 rounded-full mb-4" />
                  <div className="w-32 h-4 bg-white/5 rounded-full" />
               </div>
            ) : isChartsMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                    width={50}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(2, 6, 23, 0.9)', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}
                    itemStyle={{ color: '#8b5cf6', fontWeight: 'bold' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                    activeDot={{ r: 6, strokeWidth: 0, fill: '#8b5cf6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
               <div className="w-full h-full flex flex-col items-center justify-center opacity-50">
                  <span className="text-sm">Chưa đủ dữ liệu để vẽ biểu đồ</span>
               </div>
            )}
          </div>
        </motion.div>

        {/* Table Status Overview */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-1 h-full"
        >
          <TableStatusOverview />
        </motion.div>
      </div>

      {/* Grid Layout Row 2: Live Kitchen Feed & Top Sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.5 }}
           className="lg:col-span-2 h-full"
         >
            <RecentOrdersTable />
         </motion.div>

         <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.6 }}
           className="lg:col-span-1 h-full"
         >
            <TopSellingItems />
         </motion.div>
      </div>
    </div>
  );
}
