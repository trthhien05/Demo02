import React, { useEffect, useState } from 'react';
import { 
  Package, 
  Search, 
  AlertTriangle, 
  Plus, 
  Clock, 
  Edit3,
  Trash2,
  X,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type InventoryItem } from '../services/api';

const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<InventoryItem> | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nguyên liệu này?")) return;
    try {
      await api.delete(`/inventory/${id}`);
      fetchInventory();
    } catch (err: any) {
      alert(err.response?.data || "Lỗi khi xóa nguyên liệu");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem?.id) {
        await api.put(`/inventory/${editingItem.id}`, editingItem);
      } else {
        await api.post('/inventory', editingItem);
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (err) {
      alert("Lỗi khi lưu thông tin nguyên liệu");
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockCount = inventory.filter(item => item.stockQuantity <= item.minStockLevel).length;

  if (loading) return <div className="text-center py-20 opacity-50 font-bold uppercase tracking-widest text-xs">Đang kiểm kê kho bãi...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package size={32} className="text-primary" />
            Quản lý Kho nguyên liệu
          </h1>
          <p className="text-muted-foreground mt-1">Theo dõi xuất - nhập - tồn và định mức dự phòng tối thiểu.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem({ stockQuantity: 0, minStockLevel: 5, unit: 'Kg' });
            setIsModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Thêm nguyên liệu mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass p-6 border-l-4 border-l-blue-500">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold text-muted-foreground uppercase">Tổng mặt hàng</p>
                 <h2 className="text-3xl font-black mt-1">{inventory.length}</h2>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                 <Package size={24} />
              </div>
           </div>
        </div>
        <div className={`glass p-6 border-l-4 transition-all ${lowStockCount > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold text-muted-foreground uppercase">Cảnh báo tồn thấp</p>
                 <h2 className={`text-3xl font-black mt-1 ${lowStockCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {lowStockCount}
                 </h2>
              </div>
              <div className={`p-3 rounded-2xl ${lowStockCount > 0 ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-emerald-500/10 text-emerald-400'}`}>
                 <AlertTriangle size={24} />
              </div>
           </div>
        </div>
        <div className="glass p-6 border-l-4 border-l-primary">
           <div className="flex justify-between items-start">
              <div>
                 <p className="text-xs font-bold text-muted-foreground uppercase">Ngày kiểm gần nhất</p>
                 <h2 className="text-xl font-bold mt-2">Hôm nay, 16:04</h2>
              </div>
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                 <Clock size={24} />
              </div>
           </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
        <input 
          type="text" 
          placeholder="Tìm tên nguyên liệu (thịt, cá, gia vị...)" 
          className="input-field pl-10 w-full bg-white/5" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <th className="px-6 py-4">Tên nguyên liệu</th>
              <th className="px-6 py-4">Đơn vị</th>
              <th className="px-6 py-4">Tồn thực tế</th>
              <th className="px-6 py-4">Định mức tối thiểu</th>
              <th className="px-6 py-4">Cập nhật cuối</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredInventory.map((item, idx) => (
              <motion.tr 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.02 }}
                key={item.id} 
                className="group hover:bg-white/5 transition-colors"
                style={{ background: item.stockQuantity <= item.minStockLevel ? 'rgba(239, 68, 68, 0.05)' : '' }}
              >
                <td className="px-6 py-4">
                  <div className="font-bold flex items-center gap-2">
                     {item.name}
                     {item.stockQuantity <= item.minStockLevel && <AlertTriangle size={14} className="text-red-400" />}
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-bold text-muted-foreground">{item.unit}</span>
                </td>
                <td className="px-6 py-4">
                  <span className={`font-mono font-bold text-lg ${item.stockQuantity <= item.minStockLevel ? 'text-red-400' : 'text-zinc-200'}`}>
                    {item.stockQuantity.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 font-mono text-xs opacity-60">
                  {item.minStockLevel.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-[10px] text-muted-foreground uppercase">
                   {new Date(item.lastUpdated).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setIsModalOpen(true);
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-white"
                      >
                         <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredInventory.length === 0 && (
          <div className="py-20 text-center opacity-30 italic">Không có nguyên liệu nào trùng khớp.</div>
        )}
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
               className="relative glass w-full max-w-lg overflow-hidden shadow-2xl"
             >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-500/5">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      <Layers className="text-blue-400" />
                      {editingItem?.id ? 'Chỉnh sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSave} className="p-8 space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Tên nguyên liệu</label>
                      <input 
                        type="text" 
                        required
                        className="input-field w-full" 
                        placeholder="VD: Thịt gà, Đường cát, Nước mắm..." 
                        value={editingItem?.name || ''}
                        onChange={(e) => setEditingItem(prev => ({...prev!, name: e.target.value}))}
                      />
                   </div>
                   <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Đơn vị</label>
                         <input 
                           type="text" 
                           required
                           className="input-field w-full" 
                           placeholder="Kg, L..." 
                           value={editingItem?.unit || ''}
                           onChange={(e) => setEditingItem(prev => ({...prev!, unit: e.target.value}))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Tồn kho</label>
                         <input 
                           type="number" 
                           required
                           className="input-field w-full" 
                           value={editingItem?.stockQuantity || 0}
                           onChange={(e) => setEditingItem(prev => ({...prev!, stockQuantity: Number(e.target.value)}))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Định mức</label>
                         <input 
                           type="number" 
                           required
                           className="input-field w-full" 
                           value={editingItem?.minStockLevel || 0}
                           onChange={(e) => setEditingItem(prev => ({...prev!, minStockLevel: Number(e.target.value)}))}
                         />
                      </div>
                   </div>
                   <div className="pt-4 flex gap-4">
                      <button type="submit" className="flex-1 btn-primary py-4">XÁC NHẬN LƯU</button>
                      <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 glass py-4">HỦY BỎ</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
