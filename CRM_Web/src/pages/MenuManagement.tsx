import React, { useEffect, useState } from 'react';
import { 
  UtensilsCrossed, 
  Plus, 
  Trash2, 
  Edit3, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  DollarSign,
  Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type MenuCategory, type MenuItem } from '../services/api';

const MenuManagement: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [activeTab, setActiveTab] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      const response = await api.get('/menu');
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa món lẻ này?")) return;
    try {
      await api.delete(`/menu/item/${id}`);
      fetchMenu();
    } catch (err: any) {
      alert(err.response?.data || "Lỗi khi xóa món ăn");
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const updatedItem = { ...item, isAvailable: !item.isAvailable };
      await api.put(`/menu/item/${item.id}`, updatedItem);
      fetchMenu();
    } catch (err) {
      alert("Lỗi khi cập nhật trạng thái món");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.price || !editingItem?.categoryId) return;

    try {
      if (editingItem.id) {
        await api.put(`/menu/item/${editingItem.id}`, editingItem);
      } else {
        await api.post('/menu/item', editingItem);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchMenu();
    } catch (err) {
      alert("Lỗi khi lưu thông tin món ăn");
    }
  };

  if (loading) return <div className="text-center py-20 opacity-50 font-bold uppercase tracking-widest text-xs">Đang tải cấu trúc thực đơn...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <UtensilsCrossed size={32} className="text-primary" />
            Quản trị Thực đơn
          </h1>
          <p className="text-muted-foreground mt-1">Sắp xếp món ăn, danh mục và cập nhật giá bán niêm yết.</p>
        </div>
        <button 
          onClick={() => {
            setEditingItem({ isAvailable: true, categoryId: categories[0]?.id });
            setIsModalOpen(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Món ăn mới
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
        <button 
          onClick={() => setActiveTab('all')}
          className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === 'all' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'glass hover:bg-white/5'}`}
        >
          Tất cả món
        </button>
        {categories.map(cat => (
          <button 
            key={cat.id}
            onClick={() => setActiveTab(cat.id)}
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === cat.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'glass hover:bg-white/5'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {categories
          .filter(cat => activeTab === 'all' ? true : cat.id === activeTab)
          .flatMap(cat => cat.menuItems.map(item => (
            <motion.div 
               layout
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               key={`${cat.id}-${item.id}`} 
               className="glass group hover:border-primary/30 transition-all overflow-hidden flex flex-col pt-4"
            >
               <div className="px-6 flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                     <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors overflow-hidden">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> : <ImageIcon size={20} />}
                     </div>
                     <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingItem(item);
                            setIsModalOpen(true);
                          }}
                          className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                     </div>
                  </div>

                  <div>
                     <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{cat.name}</p>
                     <h3 className="font-bold text-lg leading-tight mt-1 truncate">{item.name}</h3>
                     <p className="text-xs text-muted-foreground line-clamp-2 mt-1 min-h-[32px]">{item.description || 'Chưa có mô tả món ăn cho nhân viên...'}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 pb-4">
                     <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Giá niêm yết</p>
                        <p className="text-lg font-black font-mono text-zinc-200">{item.price.toLocaleString()}đ</p>
                     </div>
                     <button 
                        onClick={() => handleToggleAvailability(item)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${item.isAvailable ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}
                     >
                        {item.isAvailable ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        {item.isAvailable ? 'Đang bán' : 'Hết hàng'}
                     </button>
                  </div>
               </div>
            </motion.div>
          )))}
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
               className="relative glass w-full max-w-xl overflow-hidden shadow-2xl"
             >
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      <UtensilsCrossed className="text-primary" />
                      {editingItem?.id ? 'Chỉnh sửa món ăn' : 'Thêm món ăn mới'}
                   </h3>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="col-span-2 space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Tag size={12} /> Tên món ăn
                         </label>
                         <input 
                           type="text" 
                           required
                           className="input-field w-full" 
                           placeholder="VD: Cơm Chiên Dương Châu" 
                           value={editingItem?.name || ''}
                           onChange={(e) => setEditingItem(prev => ({...prev!, name: e.target.value}))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <DollarSign size={12} /> Giá bán (VNĐ)
                         </label>
                         <input 
                           type="number" 
                           required
                           className="input-field w-full font-mono" 
                           placeholder="0" 
                           value={editingItem?.price || ''}
                           onChange={(e) => setEditingItem(prev => ({...prev!, price: Number(e.target.value)}))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Danh mục</label>
                         <select 
                           required
                           className="input-field w-full appearance-none" 
                           value={editingItem?.categoryId || ''}
                           onChange={(e) => setEditingItem(prev => ({...prev!, categoryId: Number(e.target.value)}))}
                         >
                            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                         </select>
                      </div>
                      <div className="col-span-2 space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Mô tả chi tiết</label>
                         <textarea 
                           className="input-field w-full min-h-[100px]" 
                           placeholder="Thông tin về thành phần, hương vị..." 
                           value={editingItem?.description || ''}
                           onChange={(e) => setEditingItem(prev => ({...prev!, description: e.target.value}))}
                         />
                      </div>
                      <div className="col-span-2 space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">URL Hình ảnh</label>
                         <input 
                           type="text" 
                           className="input-field w-full" 
                           placeholder="https://..." 
                           value={editingItem?.imageUrl || ''}
                           onChange={(e) => setEditingItem(prev => ({...prev!, imageUrl: e.target.value}))}
                         />
                      </div>
                   </div>
                   <div className="pt-4 flex gap-4">
                      <button type="submit" className="flex-1 btn-primary py-4 shadow-xl shadow-primary/20">LƯU THAY ĐỔI</button>
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

export default MenuManagement;
