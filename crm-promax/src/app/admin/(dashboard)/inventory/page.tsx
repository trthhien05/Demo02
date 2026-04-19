'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, AlertTriangle, Search, Loader2,
  TrendingDown, TrendingUp, Edit2, Trash2, CheckCircle2,
  Download, Minus, Clock, RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  minStockLevel: number;
  lastUpdated: string;
}

type FilterMode = 'all' | 'low' | 'ok';

// ─── Restock / Add Modal ───────────────────────────────────────────────────────
function InventoryModal({
  isOpen, onClose, editItem, onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  editItem: InventoryItem | null;
  onSave: (data: Partial<InventoryItem> & { id?: number }) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: '', unit: 'Kg', stockQuantity: 0, minStockLevel: 0 });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setForm({
          name: editItem.name,
          unit: editItem.unit,
          stockQuantity: editItem.stockQuantity,
          minStockLevel: editItem.minStockLevel
        });
      } else {
        setForm({ name: '', unit: 'Kg', stockQuantity: 0, minStockLevel: 0 });
      }
    }
  }, [isOpen, editItem]);

  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Tên nguyên liệu không được trống"); return; }
    try {
      setSaving(true);
      await onSave(editItem ? { ...form, id: editItem.id } : form);
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data || err.message || "Lỗi lưu dữ liệu");
    } finally {
      setSaving(false);
    }
  };

  const UNITS = ['Kg', 'Gram', 'Liter', 'ml', 'Piece', 'Can', 'Box', 'Bottle'];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0f1115] border border-white/10 shadow-2xl rounded-3xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div>
            <h2 className="text-xl font-bold">{editItem ? 'Cập nhật Nguyên liệu' : 'Thêm Nguyên Liệu Mới'}</h2>
            <p className="text-xs text-muted-foreground mt-1">Đồng bộ kho hàng thời gian thực</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">✕</button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Tên Nguyên Liệu</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-colors"
              placeholder="VD: Bò Wagyu, Tôm Hùm..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Số lượng hiện tại</label>
              <input
                type="number" step="0.001"
                value={form.stockQuantity}
                onChange={e => setForm(f => ({ ...f, stockQuantity: parseFloat(e.target.value) || 0 }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-colors font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Đơn vị tính</label>
              <select
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-colors appearance-none"
              >
                {UNITS.map(u => <option key={u} value={u} className="bg-[#0f1115]">{u}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">
              Ngưỡng Cảnh Báo Hết Hàng
            </label>
            <input
              type="number" step="0.001"
              value={form.minStockLevel}
              onChange={e => setForm(f => ({ ...f, minStockLevel: parseFloat(e.target.value) || 0 }))}
              className="w-full bg-black/40 border border-orange-500/20 rounded-xl px-4 py-3 text-sm focus:border-orange-500/50 outline-none transition-colors font-mono"
              placeholder="VD: 2.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Khi tồn kho xuống dưới mức này sẽ hiện cảnh báo đỏ</p>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors">Hủy</button>
            <button
              type="submit" disabled={saving}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white flex items-center gap-2 min-w-[120px] justify-center"
            >
              {saving ? <Loader2 className="animate-spin w-4 h-4" /> : (editItem ? 'Cập Nhật' : 'Thêm Vào Kho')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await apiClient.get('/inventory');
      return res.data;
    },
    refetchInterval: 30000
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/inventory', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Đã thêm vào kho!'); }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiClient.put(`/inventory/${data.id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Cập nhật thành công!'); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/inventory/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Đã xóa khỏi kho.'); },
    onError: (err: any) => toast.error(err.response?.data || "Không thể xóa nguyên liệu này.")
  });

  // Quick Adjust Mutation
  const adjustMutation = useMutation({
    mutationFn: (data: { id: number, amount: number }) => 
      apiClient.post(`/inventory/adjust/${data.id}?amount=${data.amount}`),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    }
  });

  const handleExportCSV = () => {
    if (items.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }

    const tId = toast.loading("Đang nạp dữ liệu kho...");
    
    try {
      const headers = ["ID", "Tên nguyên liệu", "Tồn kho", "Đơn vị", "Định mức tối thiểu", "Cập nhật cuối"];
      const csvContent = [
        headers.join(","),
        ...items.map(i => [
          i.id,
          i.name,
          i.stockQuantity,
          i.unit,
          i.minStockLevel,
          new Date(i.lastUpdated).toLocaleString()
        ].join(","))
      ].join("\n");

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `TON_KHO_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Đã xuất báo cáo tồn kho!", { id: tId });
    } catch (error) {
       console.error("Export Error:", error);
       toast.error("Lỗi khi xuất dữ liệu kho", { id: tId });
    }
  };

  const handleSave = async (data: any) => {
    if (data.id) {
      await updateMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const openEdit = (item: InventoryItem) => { setEditingItem(item); setModalOpen(true); };
  const openNew = () => { setEditingItem(null); setModalOpen(true); };

  const lowCount = useMemo(() => items.filter(i => i.stockQuantity <= i.minStockLevel).length, [items]);
  const okCount = useMemo(() => items.filter(i => i.stockQuantity > i.minStockLevel).length, [items]);

  const displayed = useMemo(() => {
    let list = items;
    if (filter === 'low') list = list.filter(i => i.stockQuantity <= i.minStockLevel);
    if (filter === 'ok')  list = list.filter(i => i.stockQuantity > i.minStockLevel);
    if (search.trim()) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [items, filter, search]);

  const stockPercent = (item: InventoryItem) => {
    if (item.minStockLevel === 0) return 100;
    return Math.min(100, (item.stockQuantity / (item.minStockLevel * 3)) * 100);
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-orange-400 font-bold text-xs uppercase tracking-[0.2em]">Resource Center</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Stock & <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-500">Inventory</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text" placeholder="Tìm nguyên liệu..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-orange-500/50 transition-colors focus:bg-white/10 w-[220px]"
            />
          </div>
          <button 
             onClick={handleExportCSV}
             className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-muted-foreground hover:text-white"
          >
             <Download size={18} />
          </button>
          <motion.button
            onClick={openNew}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-orange-500 to-red-500"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Plus size={18} className="text-orange-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">Nhập Kho Mới</span>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Tổng Mặt Hàng', value: items.length, icon: <Package size={20} />, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', mode: 'all' as FilterMode },
          { label: 'Sắp Hết Hàng', value: lowCount, icon: <AlertTriangle size={20} />, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', mode: 'low' as FilterMode },
          { label: 'Đủ Hàng', value: okCount, icon: <CheckCircle2 size={20} />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', mode: 'ok' as FilterMode },
        ].map((stat) => (
          <button
            key={stat.mode}
            onClick={() => setFilter(stat.mode)}
            className={cn(
              "glass rounded-2xl p-5 border transition-all text-left hover:-translate-y-0.5",
              filter === stat.mode ? stat.bg : "border-white/5 hover:border-white/10"
            )}
          >
            <div className={cn("mb-3", stat.color)}>{stat.icon}</div>
            <div className="text-3xl font-black">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1 font-medium">{stat.label}</div>
          </button>
        ))}
      </motion.div>

      {/* Table */}
      {isLoading ? (
        <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[400px] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-orange-500 w-10 h-10 mb-4" />
          <p className="text-muted-foreground animate-pulse">Đồng bộ dữ liệu kho hàng...</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass rounded-[2rem] overflow-hidden border-white/5"
        >
          {displayed.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <Package size={60} className="text-white/10 mb-4" />
              <h3 className="text-xl font-bold mb-2">Kho trống</h3>
              <p className="text-muted-foreground text-sm">Chưa có nguyên liệu nào. Hãy bắt đầu nhập kho!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.03]">
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase">Nguyên Liệu</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase">Tồn Kho</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase hidden md:table-cell">Tiến độ kho</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase hidden lg:table-cell">Cập nhật lần cuối</th>
                    <th className="py-4 px-6 text-xs font-bold text-muted-foreground tracking-widest uppercase text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {displayed.map((item, idx) => {
                      const isLow = item.stockQuantity <= item.minStockLevel;
                      const pct = stockPercent(item);

                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: idx * 0.04 }}
                          className={cn(
                            "border-b border-white/5 transition-colors group relative",
                            isLow ? "hover:bg-red-500/5 bg-red-500/[0.02]" : "hover:bg-white/5"
                          )}
                        >
                          {/* Severity Indicator Line */}
                          {isLow && (
                             <div className={cn(
                                "absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/4 rounded-full",
                                item.stockQuantity === 0 ? "bg-red-600 animate-pulse shadow-lg shadow-red-500" : "bg-red-500"
                             )} />
                          )}
                          {/* Name */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {isLow && (
                                <span className="text-red-400 animate-pulse">
                                  <AlertTriangle size={16} />
                                </span>
                              )}
                              <div>
                                <div className="font-bold">{item.name}</div>
                                <div className="text-xs text-muted-foreground">Min: {item.minStockLevel} {item.unit}</div>
                              </div>
                            </div>
                          </td>

                          {/* Stock qty */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-4">
                               <div className="flex flex-col">
                                  <div className={cn("text-2xl font-black font-mono leading-none", isLow ? "text-red-400" : "text-emerald-400")}>
                                    {item.stockQuantity}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mt-1">{item.unit}</div>
                               </div>
                               
                               <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                     onClick={() => adjustMutation.mutate({ id: item.id, amount: -1 })}
                                     className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-colors"
                                  >
                                     <Minus size={14} />
                                  </button>
                                  <button 
                                     onClick={() => adjustMutation.mutate({ id: item.id, amount: 1 })}
                                     className="p-1 hover:bg-emerald-500/20 hover:text-emerald-400 rounded-lg transition-colors"
                                  >
                                     <Plus size={14} />
                                  </button>
                               </div>
                            </div>
                          </td>

                          {/* Progress bar */}
                          <td className="py-4 px-6 hidden md:table-cell">
                            <div className="w-40">
                              <div className="flex justify-between text-xs mb-2">
                                <span className={cn("font-bold", isLow ? "text-red-400" : "text-emerald-400")}>
                                  {isLow ? <TrendingDown size={12} className="inline mr-1" /> : <TrendingUp size={12} className="inline mr-1" />}
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: idx * 0.05 }}
                                  className={cn("h-full rounded-full", isLow ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-emerald-500 to-teal-400")}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Last Updated */}
                          <td className="py-4 px-6 hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">
                              {new Date(item.lastUpdated).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => openEdit(item)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 transition-colors"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Xóa "${item.name}" khỏi kho?`)) deleteMutation.mutate(item.id);
                                }}
                                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <InventoryModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            editItem={editingItem}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
