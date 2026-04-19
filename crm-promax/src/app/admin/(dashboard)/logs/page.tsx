'use client';

import React, { useState, useEffect } from 'react';
import { History, Search, Filter, Loader2, User, Clock, Monitor, ShieldAlert, FileText, Download, X, Info, Globe } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  action: string;
  module: string;
  description: string;
  createdAt: string;
  ipAddress: string | null;
  userFullName: string;
  username: string;
}

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error("Không có nhật ký để xuất!");
      return;
    }
    
    const tId = toast.loading("Đang nạp nhật ký an ninh...");

    try {
      const headers = ["ID", "Time", "User", "Action", "Module", "Description", "IP"];
      const csvContent = [
        headers.join(","),
        ...logs.map(l => [
          l.id,
          new Date(l.createdAt).toLocaleString(),
          l.userFullName,
          l.action,
          l.module,
          `"${l.description.replace(/"/g, '""')}"`,
          l.ipAddress || "N/A"
        ].join(","))
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `AUDIT_LOGS_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Đã xuất nhật ký ra file CSV!", { id: tId });
    } catch (error) {
       console.error("Export Error:", error);
       toast.error("Lỗi khi xuất nhật ký", { id: tId });
    }
  };

  const { data: logs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['audit-logs'],
    queryFn: async () => (await apiClient.get('/audit')).data,
    refetchInterval: 30000 // Auto refresh every 30s
  });

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userFullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = moduleFilter === 'all' || log.module === moduleFilter;
    
    return matchesSearch && matchesModule;
  });

  const modules = Array.from(new Set(logs.map(l => l.module)));

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Security Auditing</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Nhật Ký <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Hoạt Động</span></h1>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
             <button 
                onClick={() => setModuleFilter('all')}
                className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", 
                   moduleFilter === 'all' ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
             >
                Tất cả
             </button>
             {modules.map(mod => (
                <button 
                   key={mod}
                   onClick={() => setModuleFilter(mod)}
                   className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", 
                      moduleFilter === mod ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                >
                   {mod}
                </button>
             ))}
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" placeholder="Tìm người dùng, hành động..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-colors focus:bg-white/10 w-[240px] text-sm"
            />
          </div>

          <button 
             onClick={handleExportCSV}
             className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
          >
             <Download size={18} />
          </button>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <History className="text-primary" size={20} />
               <h3 className="font-bold uppercase tracking-widest text-sm">Activity Stream</h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 px-3 py-1 rounded-full">
               Live Updates Active
            </span>
        </div>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
            <p className="text-muted-foreground font-bold tracking-widest uppercase text-[10px]">Đang tải dữ liệu lịch sử...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Thời Gian</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Người Thực Hiện</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Hành Động</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Module</th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Chi Tiết</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr 
                     key={log.id} 
                     onClick={() => setSelectedLog(log)}
                     className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <td className="px-8 py-4 relative">
                       {/* Severity Stripe */}
                       <div className={cn(
                          "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 rounded-full opacity-50",
                          log.action === 'Delete' ? 'bg-red-500' : 
                          log.action === 'Login' ? 'bg-emerald-500' : 
                          'bg-blue-500'
                       )} />
                       
                       <div className="flex flex-col">
                          <span className="text-sm font-bold text-white/90">{new Date(log.createdAt).toLocaleTimeString()}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                             <User size={14} />
                          </div>
                          <div className="flex flex-col">
                             <span className="text-xs font-bold">{log.userFullName}</span>
                             <span className="text-[10px] text-muted-foreground lowercase group-hover:text-primary transition-colors">@{log.username}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                          log.action === 'Login' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                          log.action === 'Delete' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                       )}>
                          {log.action}
                       </span>
                    </td>
                    <td className="px-8 py-4">
                       <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                          <FileText size={14} className="text-primary" /> {log.module}
                       </div>
                    </td>
                    <td className="px-8 py-4">
                       <p className="text-xs text-muted-foreground line-clamp-1 group-hover:line-clamp-none transition-all max-w-[400px]">
                          {log.description}
                       </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Stats Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass rounded-[2rem] p-6 border-white/5 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
               <ShieldAlert size={28} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Admin Actions</p>
               <h4 className="text-2xl font-black">Secure</h4>
            </div>
         </div>
         <div className="glass rounded-[2rem] p-6 border-white/5 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
               <Monitor size={28} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Terminal Sources</p>
               <h4 className="text-2xl font-black">Trusted IPs</h4>
            </div>
         </div>
         <div className="glass rounded-[2rem] p-6 border-white/5 flex items-center gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
               <Clock size={28} />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Retention Policy</p>
               <h4 className="text-2xl font-black">30 Days</h4>
            </div>
         </div>
      </div>
      {/* Log Detail Modal */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/80 backdrop-blur-md"
               onClick={() => setSelectedLog(null)}
            />
            <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="relative w-full max-w-lg bg-[#0c0e12] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
               <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Info size={24} /></div>
                     <div>
                        <h3 className="text-lg font-black italic uppercase tracking-tight">Chi Tiết Nhật Ký</h3>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mã định danh: #{selectedLog.id}</p>
                     </div>
                  </div>
                  <button onClick={() => setSelectedLog(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2"><User size={10}/> Người thực hiện</p>
                        <p className="font-bold">{selectedLog.userFullName}</p>
                     </div>
                     <div className="p-4 bg-white/5 rounded-2xl space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Globe size={10}/> Địa chỉ IP</p>
                        <p className="font-bold font-mono">{selectedLog.ipAddress || 'Internal'}</p>
                     </div>
                  </div>
                  
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                     <p className="text-[10px] uppercase tracking-widest text-primary font-black">Mô tả hành động</p>
                     <p className="text-sm leading-relaxed text-white/90 italic">"{selectedLog.description}"</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2">
                     <div className="flex items-center gap-2"><Clock size={12}/> {new Date(selectedLog.createdAt).toLocaleString()}</div>
                     <div className="flex items-center gap-2"><Monitor size={12}/> Web Terminal</div>
                  </div>
               </div>

               <div className="p-8 pt-0">
                  <button 
                     onClick={() => setSelectedLog(null)}
                     className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
                  >
                     Đóng cửa sổ
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
