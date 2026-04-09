'use client';

import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingCart, 
  DollarSign, 
  FileDown, 
  ArrowUpRight,
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
  { label: 'Today Revenue', value: '$8,420', trend: '+12.5%', icon: DollarSign, color: 'text-emerald-400' },
  { label: 'Active Tables', value: '18/24', trend: 'Busy', icon: ShoppingCart, color: 'text-primary' },
  { label: 'Total Guests', value: '1,240', trend: '+5.2%', icon: Users, color: 'text-accent' },
  { label: 'Avg Check', value: '$68.5', trend: '+2.1%', icon: TrendingUp, color: 'text-orange-400' },
];

export default function AdminDashboard() {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-10">
      {/* Top Section: Welcome & Actions */}
      <div className="flex items-end justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Management Overview</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Performance <span className="title-gradient">Hub</span></h1>
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
            className="glow-border group"
          >
            <div className="glow-content !py-3 flex items-center gap-3">
              <Download size={18} className="text-primary group-hover:animate-bounce" />
              <span className="text-sm font-bold">Export to Excel</span>
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
            className="stat-card group"
          >
            <div className="flex items-start justify-between">
              <div className={cn("p-4 rounded-2xl bg-white/5 transition-transform group-hover:scale-110", stat.color)}>
                <stat.icon size={24} />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold py-1 px-2 rounded-full bg-emerald-500/10 text-emerald-400">
                <ArrowUpRight size={14} />
                {stat.trend}
              </div>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black mt-1 tracking-tighter">{stat.value}</h3>
            </div>
            {/* Hover Decor */}
            <div className="absolute bottom-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:opacity-10 transition-opacity">
               <stat.icon size={80} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 glass rounded-[2.5rem] p-10"
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold">Revenue Analytics</h3>
              <p className="text-xs text-muted-foreground mt-1">Daily income and expense tracking</p>
            </div>
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-primary" />
                 <span className="text-xs font-bold">Revenue</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-white/20" />
                 <span className="text-xs font-bold">Expenses</span>
               </div>
            </div>
          </div>

          <div className="h-[350px] w-full min-h-[350px] min-w-0 relative">
            {isMounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
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
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(2, 6, 23, 0.8)', 
                      borderRadius: '16px', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(10px)'
                    }}
                    itemStyle={{ color: '#8b5cf6' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#8b5cf6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    strokeDasharray="10 10"
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

        {/* Side Info / Quick Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1 space-y-6"
        >
           <div className="glass rounded-[2rem] p-8 space-y-6 border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold">System Health</h3>
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-4">
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">API Latency</p>
                    <div className="flex items-center justify-between mt-1">
                       <span className="text-xl font-black">24ms</span>
                       <TrendingUp size={16} className="text-emerald-400" />
                    </div>
                 </div>
                 <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Active Sessions</p>
                    <div className="flex items-center justify-between mt-1">
                       <span className="text-xl font-black">156</span>
                       <Users size={16} className="text-primary" />
                    </div>
                 </div>
              </div>
              <button className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[0.98] transition-all">
                 System Maintenance
              </button>
           </div>

           <div className="stat-card bg-accent/10 border-accent/20 h-48 flex flex-col justify-end group">
              <h4 className="text-2xl font-black text-white italic group-hover:not-italic transition-all">VIP MEMBERSHIP</h4>
              <p className="text-xs text-accent font-bold mt-1">Unlock AI-Driven forecasting</p>
              <div className="absolute top-4 right-4">
                 <FileDown className="text-accent/30" size={40} />
              </div>
           </div>
        </motion.div>
      </div>
    </div>
  );
}
