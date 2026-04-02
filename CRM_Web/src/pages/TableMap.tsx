import React, { useEffect, useState } from 'react';
import { 
  Monitor, 
  Plus, 
  Users, 
  MapPin, 
  Trash2, 
  Edit3, 
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type DiningTable } from '../services/api';

const TableMap: React.FC = () => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Partial<DiningTable> | null>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await api.get('/table');
      setTables(response.data);
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bàn này?")) return;
    try {
      await api.delete(`/table/${id}`);
      fetchTables();
    } catch (err: any) {
      alert(err.response?.data || "Lỗi khi xóa bàn");
    }
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTable?.id) {
        await api.put(`/table/${editingTable.id}`, editingTable);
      } else {
        await api.post('/table', editingTable);
      }
      setIsModalOpen(false);
      fetchTables();
    } catch (err) {
      alert("Lỗi khi lưu thông tin bàn");
    }
  };

  const getStatusColor = (status: number) => {
    switch (status) {
      case 0: return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400';
      case 1: return 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400';
      case 2: return 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400';
      default: return 'from-zinc-500/20 to-zinc-500/5 border-zinc-500/20 text-zinc-400';
    }
  };

  const getStatusLabel = (status: number) => {
    switch (status) {
      case 0: return 'Còn trống';
      case 1: return 'Đang phục vụ';
      case 2: return 'Đã đặt chỗ';
      default: return 'Bảo trì';
    }
  };

  if (loading) return <div className="text-center py-20 opacity-50 font-bold uppercase tracking-widest text-xs">Đang tải sơ đồ bàn...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Monitor size={32} className="text-primary" />
            Sơ đồ Bàn ăn
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý vị trí bàn và điều phối khách hàng thời gian thực.</p>
        </div>
        <button 
          onClick={() => {
            setEditingTable({ status: 0, zone: 'Khu A', capacity: 4 });
            setIsModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Thêm bàn mới
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table, idx) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            key={table.id}
            className={`glass relative group overflow-hidden border-2 bg-gradient-to-br transition-all cursor-pointer hover:border-primary/50 translate-z-0 ${getStatusColor(table.status)}`}
          >
            <div className="p-4 space-y-3">
               <div className="flex justify-between items-start">
                  <span className="text-2xl font-black font-mono">#{table.tableNumber}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         setEditingTable(table);
                         setIsModalOpen(true);
                       }}
                       className="p-1 hover:bg-white/10 rounded"
                     >
                        <Edit3 size={12} />
                     </button>
                     <button 
                       onClick={(e) => {
                         e.stopPropagation();
                         handleDeleteTable(table.id);
                       }}
                       className="p-1 hover:bg-red-500/10 text-red-400 rounded"
                     >
                        <Trash2 size={12} />
                     </button>
                  </div>
               </div>

               <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
                     <Users size={12} /> {table.capacity} chỗ
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase">
                     <MapPin size={12} /> {table.zone || 'Khu chung'}
                  </div>
               </div>

               <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest">{getStatusLabel(table.status)}</span>
                  <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-all translate-x-1" />
               </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
               onClick={() => setIsModalOpen(false)}
             />
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.95, opacity: 0, y: 20 }}
               className="relative glass w-full max-w-md overflow-hidden shadow-2xl"
             >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-primary/5">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      <Monitor className="text-primary" />
                      {editingTable?.id ? 'Chỉnh sửa bàn ăn' : 'Thêm bàn ăn mới'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSaveTable} className="p-8 space-y-5">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Số bàn / Tên bàn</label>
                      <input 
                        type="text" 
                        required
                        className="input-field w-full font-mono text-lg" 
                        placeholder="VD: 01, VIP-01..." 
                        value={editingTable?.tableNumber || ''}
                        onChange={(e) => setEditingTable(prev => ({...prev!, tableNumber: e.target.value}))}
                      />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Sức chứa (Khách)</label>
                         <input 
                           type="number" 
                           required
                           className="input-field w-full" 
                           value={editingTable?.capacity || 4}
                           onChange={(e) => setEditingTable(prev => ({...prev!, capacity: Number(e.target.value)}))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Khu vực</label>
                         <input 
                           type="text" 
                           required
                           className="input-field w-full" 
                           placeholder="VD: Tầng 1, Sân vườn..." 
                           value={editingTable?.zone || ''}
                           onChange={(e) => setEditingTable(prev => ({...prev!, zone: e.target.value}))}
                         />
                      </div>
                   </div>
                   <div className="pt-6 border-t border-white/5 flex gap-3">
                      <button type="submit" className="flex-1 btn-primary py-3">LƯU THÔNG TIN</button>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 glass">HỦY</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TableMap;
