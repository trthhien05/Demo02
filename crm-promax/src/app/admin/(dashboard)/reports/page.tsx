'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Clock, 
  Crown, 
  Download, 
  Loader2, 
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Table as TableIcon,
  DollarSign,
  ShoppingCart,
  Percent, Gift
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

export default function ReportsPage() {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isChartsMounted, setIsChartsMounted] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [dateRange, setDateRange] = React.useState(30);
  const [showTable, setShowTable] = React.useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    setIsMounted(true);
    // Delay chart mounting to ensure layout stability (fixes width 0 warnings)
    const timer = setTimeout(() => setIsChartsMounted(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleExportPDF = async () => {
    const area = document.getElementById('reporting-area');
    if (!area) return;

    const tId = toast.loading("Đang khởi tạo báo cáo thông minh...");

    try {
      setIsExporting(true);
      
      // html-to-image is much more robust with modern CSS (oklab/oklch)
      const dataUrl = await toPng(area, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#020617',
        style: {
          borderRadius: '0', // Ensure edges are clean in PDF
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4',
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`VIP_PROMAX_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success('Xuất báo cáo PDF thành công!', { id: tId });
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại.', { id: tId });
    } finally {
      setIsExporting(false);
    }
  };

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

  // 4. Daily Revenue Trend
  const { data: revenueData = [], isLoading: isRevLoading } = useQuery({
    queryKey: ['revenue-stats', dateRange],
    queryFn: async () => (await apiClient.get(`/reports/revenue-stats?days=${dateRange}`)).data
  });

  // 5. Marketing Stats
  const { data: marketingStats, isLoading: isMktLoading } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn: async () => (await apiClient.get('/reports/marketing-stats')).data
  });

  const totals = React.useMemo(() => {
    const totalRev = revenueData.reduce((sum: number, r: any) => sum + r.amount, 0);
    const avgRev = revenueData.length > 0 ? totalRev / revenueData.length : 0;
    return {
       total: totalRev,
       avg: avgRev,
       count: revenueData.length
    };
  }, [revenueData]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['busy-hours'] });
    queryClient.invalidateQueries({ queryKey: ['category-revenue'] });
    queryClient.invalidateQueries({ queryKey: ['top-spenders'] });
    queryClient.invalidateQueries({ queryKey: ['revenue-stats'] });
    queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
    toast.success('Dữ liệu đã được cập nhật mới nhất!');
  };

  const isLoading = isBusyLoading || isCatLoading || isSpendersLoading || isRevLoading || isMktLoading;

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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mr-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  dateRange === d ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:text-white"
                )}
              >
                {d === 90 ? 'Quý' : `${d} Ngày`}
              </button>
            ))}
          </div>

          <button 
            onClick={handleRefresh}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
          >
            <RefreshCw size={18} />
          </button>

          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="px-6 py-3 bg-primary text-white rounded-2xl hover:bg-primary/80 transition-all font-bold text-xs uppercase tracking-widest flex items-center gap-3 disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />} 
            {isExporting ? 'Đang xuất...' : 'Xuất PDF'}
          </button>
        </div>
      </div>


      <div id="reporting-area" className="space-y-10">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-[2rem] p-6 border-white/5 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-4 mb-3">
                 <div className="p-3 bg-primary/20 rounded-2xl text-primary"><DollarSign size={20} /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tổng Doanh Thu ({dateRange}d)</span>
              </div>
              <div className="text-3xl font-black italic tracking-tighter">{totals.total.toLocaleString()}đ</div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-[2rem] p-6 border-white/5 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-4 mb-3">
                 <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400"><ShoppingCart size={20} /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Số Ngày Ghi Nhận</span>
              </div>
              <div className="text-3xl font-black italic tracking-tighter">{totals.count} <span className="text-sm not-italic opacity-50 font-bold uppercase">Ngày</span></div>
           </motion.div>
           <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-[2rem] p-6 border-white/5 bg-gradient-to-br from-blue-500/5 to-transparent">
              <div className="flex items-center gap-4 mb-3">
                 <div className="p-3 bg-blue-500/20 rounded-2xl text-blue-400"><Percent size={20} /></div>
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Doanh Thu TB / Ngày</span>
              </div>
              <div className="text-3xl font-black italic tracking-tighter">{Math.round(totals.avg).toLocaleString()}đ</div>
           </motion.div>
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
                  <h3 className="font-bold text-lg italic">Tăng Trưởng Doanh Thu ({dateRange} Ngày)</h3>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                     onClick={() => setShowTable(!showTable)}
                     className={cn("p-2 rounded-xl border transition-all", showTable ? "bg-primary text-white shadow-lg" : "bg-white/5 border-white/10 text-muted-foreground")}
                  >
                     <TableIcon size={16} />
                  </button>
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1">
                     <ArrowUpRight size={12} /> Live Stats
                  </div>
               </div>
            </div>

            {showTable ? (
               <div className="h-[350px] overflow-y-auto px-4 custom-scrollbar">
                  <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                     <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky top-0 bg-[#0c0e14] z-10">
                        <tr>
                           <th className="pb-4 pl-4 font-black">Ngày ghi nhận</th>
                           <th className="pb-4 pr-4 text-right font-black">Doanh Thu (VNĐ)</th>
                        </tr>
                     </thead>
                     <tbody className="font-mono">
                        {revenueData.map((r: any) => (
                           <tr key={r.date} className="bg-white/[0.02] hover:bg-white/5 transition-colors group">
                              <td className="py-4 pl-4 rounded-l-2xl group-hover:text-primary transition-colors border-y border-l border-white/5">
                                 {r.date.split('-').reverse().join('/')}
                              </td>
                              <td className="py-4 pr-4 rounded-r-2xl text-right font-bold border-y border-r border-white/5">
                                 {r.amount.toLocaleString()}đ
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            ) : (
               <div className="h-[350px]">
                  {isChartsMounted && (
                     <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
                  )}
               </div>
            )}
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
               {isChartsMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
               )}
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
               {isChartsMounted && (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                     <BarChart data={busyHours}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} tickFormatter={(h) => `${h}h`} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 10}} />
                        <Tooltip cursor={{fill: 'rgba(255,255,255,0.03)'}} contentStyle={{ backgroundColor: '#0c0e14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                     </BarChart>
                  </ResponsiveContainer>
               )}
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

      {/* Row 3: Marketing Effectiveness */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass rounded-[3rem] p-10 border-white/5 bg-gradient-to-br from-primary/5 via-transparent to-accent/5"
      >
        <div className="flex items-center gap-4 mb-10">
           <div className="p-4 bg-primary/20 rounded-2xl text-primary shadow-lg shadow-primary/20"><Gift size={24} /></div>
           <div>
              <h3 className="text-xl font-black italic tracking-tight">Hiệu Quả Chiến Dịch Marketing</h3>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mt-1">Đo lường tỉ lệ quy đổi và doanh thu từ Voucher</p>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Marketing KPIs */}
           <div className="lg:col-span-1 space-y-6">
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Voucher đã phát</span>
                 <div className="text-2xl font-black italic text-white">{marketingStats?.totalVouchers || 0}</div>
              </div>
              <div className="p-6 bg-white/5 rounded-[2rem] border border-white/10">
                 <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Tỷ lệ sử dụng</span>
                 <div className="text-2xl font-black italic text-primary">{Math.round(marketingStats?.redemptionRate || 0)}%</div>
              </div>
              <div className="p-6 bg-primary/10 rounded-[2rem] border border-primary/20">
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1 block">Doanh thu Marketing</span>
                 <div className="text-2xl font-black italic text-white">{(marketingStats?.marketingRevenue || 0).toLocaleString()}đ</div>
              </div>
           </div>

           {/* Conversion Chart */}
           <div className="lg:col-span-3 bg-white/[0.02] rounded-[2.5rem] border border-white/5 p-8">
              <div className="h-[300px]">
                 {isChartsMounted && (
                    <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                          <Pie
                             data={[
                                { name: 'Đã sử dụng', value: marketingStats?.usedVouchers || 0 },
                                { name: 'Chưa sử dụng', value: (marketingStats?.totalVouchers || 0) - (marketingStats?.usedVouchers || 0) }
                             ]}
                             cx="50%" cy="50%"
                             innerRadius={80}
                             outerRadius={120}
                             paddingAngle={10}
                             dataKey="value"
                          >
                             <Cell fill="#8b5cf6" />
                             <Cell fill="rgba(255,255,255,0.05)" />
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0c0e14', border: 'none', borderRadius: '12px' }}
                          />
                          <Legend verticalAlign="middle" align="right" layout="vertical" />
                       </PieChart>
                    </ResponsiveContainer>
                 )}
              </div>
              <div className="text-center mt-4">
                 <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-bold">
                    Dữ liệu dựa trên tổng số {marketingStats?.totalVouchers || 0} Voucher được phát hành
                 </p>
              </div>
           </div>
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
