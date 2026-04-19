'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Plus, Layers, Search, Loader2, Image as ImageIcon, Edit2, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import MenuFormModal from '@/components/admin/menu/MenuFormModal';
import CategoryManagementModal from '@/components/admin/menu/CategoryManagementModal';
import { toast } from 'sonner';

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  categoryId: number;
}

interface MenuCategory {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
  menuItems: MenuItem[];
}

export default function MenuPage() {
  const queryClient = useQueryClient();
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Fetch Menu
  const { data: categories = [], isLoading } = useQuery<MenuCategory[]>({
    queryKey: ['menu'],
    queryFn: async () => {
      const res = await apiClient.get('/menu');
      return res.data;
    }
  });

  // Set default active category
  React.useEffect(() => {
    if (categories.length > 0 && activeCategoryId === null) {
      setActiveCategoryId(categories[0].id);
    }
  }, [categories, activeCategoryId]);

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (newItem: any) => apiClient.post('/menu/item', newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Đã thêm món ăn mới thành công!');
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { id: number, item: any }) => apiClient.put(`/menu/item/${data.id}`, data.item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Cập nhật thành công!');
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/menu/item/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Đã xóa món ăn thành công.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data || "Không thể xóa món ăn này.");
    }
  });

  // Toggle Availability Mutation
  const toggleMutation = useMutation({
    mutationFn: (data: { id: number, isAvailable: boolean }) => 
      apiClient.put(`/menu/item/${data.id}`, { ...data, isAvailable: !data.isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Đã cập nhật trạng thái món ăn');
    }
  });

  const handleSubmitItem = async (data: any) => {
    if (data.id) {
      await updateMutation.mutateAsync({ id: data.id, item: data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa món này? Hành động này không thể hoàn tác nếu món chưa từng được bán.")) {
      deleteMutation.mutate(id);
    }
  };

  const openNewModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  // Filter items based on active tab and search
  const displayedItems = useMemo(() => {
    let items: MenuItem[] = [];
    if (activeCategoryId) {
      const cat = categories.find(c => c.id === activeCategoryId);
      if (cat?.menuItems) items = cat.menuItems;
    } else {
      // All items if no category selected
      categories.forEach(c => { if (c.menuItems) items.push(...c.menuItems) });
    }

    if (searchQuery.trim()) {
      items = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return items;
  }, [categories, activeCategoryId, searchQuery]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-emerald-400 font-bold text-xs uppercase tracking-[0.2em]">Product Catalog</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Menu <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500">Engineering</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Tìm món ăn..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 transition-colors focus:bg-white/10 w-[220px]"
            />
          </div>
          <button 
             onClick={() => setIsCategoryModalOpen(true)}
             className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm"
          >
            <Layers size={18} /> Quản lý Danh Mục
          </button>
          <motion.button 
            onClick={openNewModal}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-emerald-400 to-teal-500"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Plus size={18} className="text-emerald-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">Thêm Món Mới</span>
            </div>
          </motion.button>
        </div>
      </div>

      {isLoading ? (
        <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-emerald-500 w-10 h-10 mb-4" />
          <p className="text-muted-foreground animate-pulse">Đang nạp dữ liệu thực đơn...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px] flex flex-col items-center justify-center text-center">
           <UtensilsCrossed size={64} className="text-white/10 mb-6" />
           <h3 className="text-xl font-bold mb-2">Chưa có Thực đơn</h3>
           <p className="text-muted-foreground mb-6">Xin vui lòng sử dụng API/Backend để seeding danh mục trước.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
             <button 
               onClick={() => setActiveCategoryId(null)}
               className={cn("px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border", 
                  activeCategoryId === null ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:text-white")}
             >
                Tất cả
             </button>
             {categories.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => setActiveCategoryId(c.id)}
                  className={cn("px-6 py-3 rounded-2xl font-bold text-sm whitespace-nowrap transition-all border", 
                     activeCategoryId === c.id ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-muted-foreground border-white/5 hover:bg-white/10 hover:text-white")}
                >
                   {c.name}
                   <span className={cn("ml-2 px-2 py-0.5 rounded-full text-[10px]", activeCategoryId === c.id ? "bg-emerald-500/20" : "bg-white/10")}>
                      {c.menuItems?.length || 0}
                   </span>
                </button>
             ))}
          </div>

          {/* Items Grid */}
          {displayedItems.length === 0 ? (
             <div className="glass rounded-[2rem] p-8 min-h-[300px] flex flex-col items-center justify-center text-center border-dashed border-2 border-white/10">
               <p className="text-muted-foreground">Không tìm thấy món ăn nào trong mục này.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              <AnimatePresence mode="popLayout">
                {displayedItems.map((item, idx) => (
                  <motion.div
                    layout
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "glass rounded-[1.5rem] p-4 border-white/5 transition-all shadow-xl group relative overflow-hidden flex flex-col",
                      !item.isAvailable && "opacity-60 grayscale hover:grayscale-0"
                    )}
                  >
                    {/* Hành động sửa/xoá */}
                    <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                       <button onClick={() => handleEdit(item)} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-emerald-400 transition-colors">
                         <Edit2 size={14} />
                       </button>
                       <button onClick={() => handleDelete(item.id)} className="p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:text-red-400 transition-colors">
                         <Trash2 size={14} />
                       </button>
                    </div>

                    <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 mb-4 relative">
                       {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                       ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20">
                             <ImageIcon size={40} />
                          </div>
                       )}
                       {!item.isAvailable && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px]">
                             <span className="bg-red-500 text-white font-bold text-[10px] px-3 py-1 rounded-full uppercase tracking-widest border border-red-400">Hết hàng</span>
                          </div>
                       )}
                    </div>
                    
                    <div className="flex-1 flex flex-col justify-between">
                       <div>
                          <h3 className="font-bold text-lg leading-tight mb-1 truncate" title={item.name}>{item.name}</h3>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description || 'Không có mô tả'}</p>
                       </div>
                       <div className="mt-4 flex items-center justify-between">
                          <div className="flex flex-col">
                             <span className="font-mono font-black text-emerald-400 text-xl leading-none">
                                {item.price.toLocaleString()}
                                <span className="text-[10px] ml-1 opacity-60">VNĐ</span>
                             </span>
                          </div>
                          
                          {/* Quick Toggle */}
                          <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                toggleMutation.mutate({ id: item.id, isAvailable: item.isAvailable });
                             }}
                             className={cn(
                                "w-10 h-5 rounded-full transition-all relative overflow-hidden",
                                item.isAvailable ? "bg-emerald-500 shadow-lg shadow-emerald-500/20" : "bg-white/10"
                             )}
                          >
                             <motion.div 
                                animate={{ x: item.isAvailable ? 20 : 4 }}
                                className="absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm" 
                             />
                          </button>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Form Modal */}
      <MenuFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        editItem={editingItem}
        onSubmitItem={handleSubmitItem}
      />

      <CategoryManagementModal 
         isOpen={isCategoryModalOpen}
         onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
}
