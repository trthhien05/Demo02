'use client';

import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  Filter,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
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

// Mẫu dữ liệu cho biểu đồ Doanh thu ProMax
const revenueData = [
  { name: 'Mon', revenue: 4500, expenses: 3200 },
  { name: 'Tue', revenue: 5200, expenses: 3400 },
  { name: 'Wed', revenue: 4800, expenses: 3100 },
  { name: 'Thu', revenue: 6100, expenses: 4000 },
  { name: 'Fri', revenue: 5900, expenses: 3800 },
  { name: 'Sat', revenue: 8200, expenses: 5000 },
  { name: 'Sun', revenue: 7500, expenses: 4800 },
];

const stats = [
  { label: 'Today Revenue', value: '$8,420', trend: '+12.5%', icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { label: 'Active Tables', value: '18/24', trend: '75%', icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
  { label: 'Total Guests', value: '1,240', trend: '+5.2%', icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { label: 'Avg Check', value: '$68.5', trend: '+2.1%', icon: TrendingUp, color: 'text-orange-400', bg: 'bg-orange-400/10' },
];

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-8 pb-10">
      {/* Top Section: Welcome & Actions */}
      <div className="flex items-end justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Management Overview</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Performance <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Hub</span></h1>
        </motion.div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
            <Filter size={18} />
            Filters
          </button>
          {/* VIP Export Button Area */}
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glow-border group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-primary to-accent"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Download size={18} className="text-primary group-hover:-translate-y-1 transition-transform" />
              <span className="text-sm font-bold">Export Report</span>
            </div>
          </motion.button>
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
            className="stat-card relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl p-6 rounded-3xl transition-all hover:scale-[1.02] hover:shadow-primary/20 group"
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-4 rounded-2xl transition-transform group-hover:scale-110", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold py-1 px-2 rounded-full border border-white/10 text-muted-foreground bg-white/5">
                <TrendingUp size={12} className={stat.trend.includes('-') ? 'text-red-400 rotate-180' : 'text-emerald-400'} />
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
              <h3 className="text-xl font-bold">Revenue Analytics</h3>
              <p className="text-xs text-muted-foreground mt-1">Daily income and expense tracking vs past week</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-primary" />
                 <span className="text-xs font-bold">Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-slate-500" />
                 <span className="text-xs font-bold">Expenses</span>
               </div>
            </div>
          </div>

          <div className="h-[300px] w-full min-h-[300px] min-w-0 relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={revenueData}>
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
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#64748b" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fill="transparent"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full bg-white/5 animate-pulse rounded-2xl flex items-center justify-center text-muted-foreground text-xs">
                Preparing Analytics...
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
