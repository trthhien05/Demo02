'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, Calendar, Users, Clock, CheckCircle2,
  Loader2, RefreshCw, Utensils, Sparkles, BrushIcon
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// ── Types ──────────────────────────────────────────────────────────────────────
type TableStatus = 0 | 1 | 2 | 3; // Available | Reserved | Occupied | Cleaning

interface DiningTable {
  id: number;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
  zone: string | null;
}

interface Reservation {
  id: number;
  customerId: number;
  reservationTime: string;
  paxCount: number;
  status: number; // 0=Pending 1=Confirmed 2=Seated 3=Completed 4=Cancelled 5=NoShow
  specialRequests: string | null;
  customer: { fullName: string; phoneNumber: string };
}

// ── Constants ──────────────────────────────────────────────────────────────────
const TABLE_STATUS = {
  0: { label: 'Trống', color: 'from-emerald-500/20 to-teal-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400', text: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' },
  1: { label: 'Đã Đặt', color: 'from-blue-500/20 to-indigo-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400', text: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.2)]' },
  2: { label: 'Có Khách', color: 'from-orange-500/20 to-red-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', text: 'text-orange-400', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]' },
  3: { label: 'Dọn Dẹp', color: 'from-purple-500/20 to-pink-500/10', border: 'border-purple-500/30', dot: 'bg-purple-400', text: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.2)]' },
};

const RESERVATION_STATUS_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Chờ XN', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  1: { label: 'Đã XN', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { label: 'Đã Ngồi', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  3: { label: 'Hoàn Tất', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  4: { label: 'Đã Hủy', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  5: { label: 'No-Show', color: 'bg-red-900/20 text-red-300 border-red-700/30' },
};

// ── Table Card ─────────────────────────────────────────────────────────────────
function TableCard({ table, onChangeStatus }: { table: DiningTable; onChangeStatus: (id: number, s: TableStatus) => void }) {
  const [showMenu, setShowMenu] = useState(false);
  const st = TABLE_STATUS[table.status];

  const nextActions: { label: string; icon: React.ReactNode; status: TableStatus }[] = [
    { label: 'Đánh dấu Trống', icon: <CheckCircle2 size={14} />, status: 0 as TableStatus },
    { label: 'Đánh dấu Đặt Trước', icon: <Calendar size={14} />, status: 1 as TableStatus },
    { label: 'Đánh dấu Có Khách', icon: <Utensils size={14} />, status: 2 as TableStatus },
    { label: 'Đánh dấu Dọn Dẹp', icon: <BrushIcon size={14} />, status: 3 as TableStatus },
  ].filter(a => a.status !== table.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative rounded-2xl border bg-gradient-to-br p-5 cursor-pointer group transition-all hover:-translate-y-1",
        st.color, st.border, table.status === 2 ? st.glow : ''
      )}
      onClick={() => setShowMenu(v => !v)}
    >
      {/* Pulse dot */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        <span className={cn("w-2 h-2 rounded-full", st.dot, table.status === 2 ? 'animate-pulse' : '')} />
        <span className={cn("text-[10px] font-bold uppercase tracking-wider", st.text)}>{st.label}</span>
      </div>

      {/* Zone badge */}
      {table.zone && (
        <div className="absolute top-4 left-4 text-[9px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-muted-foreground font-medium uppercase tracking-widest">
          {table.zone}
        </div>
      )}

      <div className="mt-6 mb-3">
        <div className="text-4xl font-black tracking-tight">{table.tableNumber}</div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
          <Users size={11} />
          <span>{table.capacity} chỗ ngồi</span>
        </div>
      </div>

      {/* Quick-action dropdown */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            className="absolute left-0 right-0 bottom-full mb-2 z-30 bg-[#0f1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {nextActions.map(a => (
              <button
                key={a.status}
                onClick={() => { onChangeStatus(table.id, a.status); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-white/5 text-left font-medium transition-colors"
              >
                <span className="text-muted-foreground">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const queryClient = useQueryClient();
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');

  // Fetch tables
  const { data: tables = [], isLoading: tablesLoading } = useQuery<DiningTable[]>({
    queryKey: ['tables'],
    queryFn: async () => (await apiClient.get('/table')).data,
    refetchInterval: 20000
  });

  // Fetch reservations (today)
  const { data: reservations = [], isLoading: reservLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: async () => (await apiClient.get('/reservation')).data,
    refetchInterval: 30000
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: TableStatus }) =>
      apiClient.post(`/table/${id}/status`, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Cập nhật trạng thái bàn!');
    },
    onError: () => toast.error('Không thể cập nhật trạng thái.')
  });

  const checkInMutation = useMutation({
    mutationFn: (id: number) => apiClient.post(`/reservation/${id}/check-in`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast.success('Check-in thành công!');
    }
  });

  // Zones
  const zones = useMemo(() => {
    const z = [...new Set(tables.map(t => t.zone || 'Chung'))];
    return z;
  }, [tables]);

  const filteredTables = useMemo(() => {
    if (!activeZone) return tables;
    return tables.filter(t => (t.zone || 'Chung') === activeZone);
  }, [tables, activeZone]);

  // Stats
  const stats = useMemo(() => ({
    available: tables.filter(t => t.status === 0).length,
    reserved: tables.filter(t => t.status === 1).length,
    occupied: tables.filter(t => t.status === 2).length,
    cleaning: tables.filter(t => t.status === 3).length,
  }), [tables]);

  const todayReservations = useMemo(() => {
    const today = new Date().toDateString();
    return reservations
      .filter(r => new Date(r.reservationTime).toDateString() === today && r.status < 3)
      .sort((a, b) => new Date(a.reservationTime).getTime() - new Date(b.reservationTime).getTime());
  }, [reservations]);

  const isLoading = tablesLoading || reservLoading;

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-violet-400 font-bold text-xs uppercase tracking-[0.2em]">Floor Management</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Sơ Đồ <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-purple-500">Nhà Hàng</span></h1>
        </motion.div>

        <div className="flex gap-3">
          <button
            onClick={() => { queryClient.invalidateQueries({ queryKey: ['tables'] }); queryClient.invalidateQueries({ queryKey: ['reservations'] }); }}
            className="flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-sm font-bold"
          >
            <RefreshCw size={16} /> Làm Mới
          </button>
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1">
            <button onClick={() => setView('map')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", view === 'map' ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground hover:text-white')}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('list')} className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", view === 'list' ? 'bg-violet-500/20 text-violet-400' : 'text-muted-foreground hover:text-white')}>
              <Calendar size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-4 gap-4">
        {[
          { label: 'Bàn Trống', value: stats.available, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Đã Đặt Trước', value: stats.reserved, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
          { label: 'Đang Dùng Bữa', value: stats.occupied, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
          { label: 'Đang Dọn', value: stats.cleaning, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
        ].map(s => (
          <div key={s.label} className={cn("glass rounded-2xl p-5 border", s.bg)}>
            <div className={cn("text-3xl font-black", s.color)}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="glass rounded-[2rem] p-8 min-h-[400px] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-violet-500 w-10 h-10 mb-4" />
          <p className="text-muted-foreground animate-pulse">Đang tải sơ đồ nhà hàng...</p>
        </div>
      ) : view === 'map' ? (
        /* ─── MAP VIEW ─── */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
          {/* Zone filter tabs */}
          {zones.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveZone(null)}
                className={cn("px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border",
                  !activeZone ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-white/5 text-muted-foreground border-white/5 hover:text-white hover:bg-white/10'
                )}
              >
                Tất cả khu vực
              </button>
              {zones.map(z => (
                <button
                  key={z}
                  onClick={() => setActiveZone(z)}
                  className={cn("px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all border",
                    activeZone === z ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-white/5 text-muted-foreground border-white/5 hover:text-white hover:bg-white/10'
                  )}
                >
                  {z}
                </button>
              ))}
            </div>
          )}

          {filteredTables.length === 0 ? (
            <div className="glass rounded-[2rem] p-16 flex flex-col items-center justify-center text-center">
              <LayoutGrid size={60} className="text-white/10 mb-4" />
              <h3 className="text-xl font-bold mb-2">Chưa có bàn nào</h3>
              <p className="text-muted-foreground text-sm">Dữ liệu bàn sẽ được tải từ Backend.</p>
            </div>
          ) : (
            <div className="glass rounded-[2rem] p-6 border-white/5">
              {/* Legend */}
              <div className="flex flex-wrap gap-4 mb-6 pb-6 border-b border-white/5">
                {Object.entries(TABLE_STATUS).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className={cn("w-2.5 h-2.5 rounded-full", v.dot)} />
                    {v.label}
                  </div>
                ))}
                <div className="ml-auto text-xs text-muted-foreground italic flex items-center gap-1">
                  <Sparkles size={11} /> Click vào bàn để đổi trạng thái
                </div>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                <AnimatePresence>
                  {filteredTables.map(table => (
                    <TableCard key={table.id} table={table} onChangeStatus={(id, s) => updateStatusMutation.mutate({ id, status: s })} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        /* ─── LIST / RESERVATION VIEW ─── */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={18} className="text-violet-400" />
            <h2 className="font-bold text-lg">Lịch Đặt Bàn Hôm Nay</h2>
            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded-full text-xs font-bold">{todayReservations.length}</span>
          </div>

          {todayReservations.length === 0 ? (
            <div className="glass rounded-[2rem] p-16 flex flex-col items-center justify-center text-center border-white/5">
              <Calendar size={60} className="text-white/10 mb-4" />
              <h3 className="text-xl font-bold mb-2">Không có lịch đặt bàn hôm nay</h3>
              <p className="text-muted-foreground text-sm">Các đặt chỗ mới sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayReservations.map((r, idx) => {
                const resStatus = RESERVATION_STATUS_LABELS[r.status] || RESERVATION_STATUS_LABELS[0];
                const resTime = new Date(r.reservationTime);
                const canCheckIn = r.status === 0 || r.status === 1;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass rounded-2xl p-5 border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex flex-col items-center justify-center text-violet-400">
                        <Clock size={14} className="mb-0.5" />
                        <div className="text-xs font-black leading-tight">{resTime.getHours().toString().padStart(2, '0')}:{resTime.getMinutes().toString().padStart(2, '0')}</div>
                      </div>
                      <div>
                        <div className="font-bold text-lg">{r.customer?.fullName || 'Ẩn danh'}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Users size={11} /> {r.paxCount} người</span>
                          <span>{r.customer?.phoneNumber}</span>
                        </div>
                        {r.specialRequests && (
                          <div className="text-xs text-orange-400 mt-1 italic">"{r.specialRequests}"</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("px-3 py-1.5 rounded-full border text-xs font-bold uppercase", resStatus.color)}>
                        {resStatus.label}
                      </span>
                      {canCheckIn && (
                        <button
                          onClick={() => checkInMutation.mutate(r.id)}
                          disabled={checkInMutation.isPending}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2"
                        >
                          {checkInMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                          Check-in
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
