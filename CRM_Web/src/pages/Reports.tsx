import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  FileSpreadsheet, 
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Calendar,
  Filter,
  ArrowUpRight
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import api from '../services/api';

const Reports: React.FC = () => {
  const [revenueData, setRevenueData] = useState([]);
  const [topItems, setTopItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [revRes, topRes] = await Promise.all([
        api.get('/reports/revenue-stats'),
        api.get('/reports/top-selling')
      ]);
      setRevenueData(revRes.data);
      setTopItems(topRes.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/reports/export-shifts', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'BaoCaoNhanSu.csv');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert("Lỗi khi xuất dữ liệu");
    }
  };

  if (loading) return <div className="text-center py-20 opacity-50 font-medium">Đang phân tích dữ liệu...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 size={32} className="text-primary" />
            Báo cáo & Phân tích
          </h1>
          <p className="text-muted-foreground mt-1">Theo dõi hiệu suất kinh doanh và tối ưu hóa vận hành nhà hàng.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Calendar size={18} />
            7 Ngày qua
          </button>
          <button onClick={handleExport} className="btn-primary">
            <Download size={18} />
            Xuất Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <div className="glass p-8 space-y-6">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="font-bold text-lg mb-1">Xu hướng doanh thu</h3>
                 <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                    <TrendingUp size={14} /> +12.5% so với tuần trước
                 </div>
              </div>
              <div className="p-20 bg-primary/10 rounded-lg text-primary">
                 <LineChartIcon size={20} />
              </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
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
                  <Line 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#0ea5e9" 
                    strokeWidth={3} 
                    dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Top Selling Chart */}
        <div className="glass p-8 space-y-6">
           <div className="flex items-center justify-between">
              <div>
                 <h3 className="font-bold text-lg mb-1">Top món ăn bán chạy nhất</h3>
                 <p className="text-xs text-muted-foreground">Xếp hạng theo số lượng đã bán</p>
              </div>
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                 <PieChartIcon size={20} />
              </div>
           </div>

           <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="itemName" 
                    type="category" 
                    stroke="#71717a" 
                    fontSize={10} 
                    width={100}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="quantity" radius={[0, 4, 4, 0]}>
                    {topItems.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#0ea5e9' : `rgba(14, 165, 233, ${0.8 - index * 0.15})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      {/* Detail Table */}
      <div className="glass overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2"><FileSpreadsheet size={18} className="text-primary" /> Chi tiết biến động doanh số</h3>
            <div className="flex gap-2">
               <div className="relative">
                  <Filter className="absolute left-3 top-2 text-muted-foreground" size={14} />
                  <select className="bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-1.5 text-xs outline-none focus:border-primary">
                     <option>Tất cả danh mục</option>
                  </select>
               </div>
            </div>
        </div>
        <table className="w-full text-left">
           <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <tr>
                 <th className="px-8 py-4">Ngày giao dịch</th>
                 <th className="px-8 py-4">Số lượng đơn</th>
                 <th className="px-8 py-4">Tổng doanh thu</th>
                 <th className="px-8 py-4">Trung bình/Đơn</th>
                 <th className="px-8 py-4 text-right">Trạng thái</th>
              </tr>
           </thead>
           <tbody>
              {revenueData.slice().reverse().map((data: any, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                   <td className="px-8 py-4 text-sm font-medium">{data.date}</td>
                   <td className="px-8 py-4 text-sm">12 đơn hàng</td>
                   <td className="px-8 py-4 font-mono text-sm font-bold text-primary">
                      {data.amount?.toLocaleString()} VNĐ
                   </td>
                   <td className="px-8 py-4 text-xs text-muted-foreground">
                      {(data.amount / 12).toLocaleString()} VNĐ
                   </td>
                   <td className="px-8 py-4">
                      <div className="flex justify-end items-center gap-1 text-[10px] font-bold text-emerald-400">
                         <ArrowUpRight size={12} /> TĂNG TRƯỞNG
                      </div>
                   </td>
                </tr>
              ))}
           </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;
