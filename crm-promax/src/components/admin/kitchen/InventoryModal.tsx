'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   X, Search, Package, Check, 
   XCircle, Loader2, AlertTriangle, 
   RefreshCw, Filter
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  isAvailable: boolean;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
  menuItems: MenuItem[];
}

export default function InventoryModal({ isOpen, onClose }: InventoryModalProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | 'all'>('all');

  const { data: menu = [], isLoading } = useQuery<Category[]>({
    queryKey: ['menu-categories'],
    queryFn: async () => (await apiClient.get('/menu')).data,
    enabled: isOpen
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: ({ id, item }: { id: number, item: MenuItem }) => 
       apiClient.put(`/menu/item/${id}`, { ...item, isAvailable: !item.isAvailable }),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
       queryClient.invalidateQueries({ queryKey: ['menu-items'] });
       toast.success("Đã cập nhật trạng thái món ăn!");
    },
    onError: () => toast.error("Lỗi khi cập nhật trạng thái")
  });

  const filteredMenu = menu.map(cat => ({
    ...cat,
    menuItems: (cat.menuItems || []).filter(item => 
       item.name.toLowerCase().includes(search.toLowerCase()) &&
       (activeCategory === 'all' || cat.id === activeCategory)
    )
  })).filter(cat => cat.menuItems.length > 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl h-[80vh] bg-[#0c0e12] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/20">
                   <Package size={24} />
                </div>
                <div>
                   <h2 className="text-2xl font-black italic tracking-tight uppercase">QUẢN LÝ TỒN KHO</h2>
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bật/Tắt trạng thái phục vụ của món ăn</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-muted-foreground">
                <X size={24} />
             </button>
          </div>

          <div className="p-6 border-b border-white/5 flex flex-wrap gap-4 items-center">
             <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <input 
                   type="text"
                   placeholder="Tìm món cần báo hết..."
                   value={search}
                   onChange={e => setSearch(e.target.value)}
                   className="w-full bg-black/40 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none focus:border-red-500/50 transition-all text-sm"
                />
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                   onClick={() => setActiveCategory('all')}
                   className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap", 
                      activeCategory === 'all' ? "bg-red-500 text-white" : "bg-white/5 text-muted-foreground hover:text-white")}
                >
                   Tất cả
                </button>
                {menu.map(cat => (
                   <button 
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn("px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap", 
                         activeCategory === cat.id ? "bg-red-500 text-white" : "bg-white/5 text-muted-foreground hover:text-white")}
                   >
                      {cat.name}
                   </button>
                ))}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-8 custom-scrollbar">
             {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30">
                   <Loader2 className="animate-spin mb-4" size={40} />
                   <span className="text-sm font-bold uppercase tracking-widest">Đang tải Menu...</span>
                </div>
             ) : filteredMenu.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                   <Package size={60} className="mb-4" />
                   <p className="font-bold uppercase tracking-widest">Không có kết quả</p>
                </div>
             ) : (
                filteredMenu.map(cat => (
                   <div key={cat.id} className="space-y-4">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground border-l-2 border-red-500 pl-3">{cat.name}</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {cat.menuItems.map(item => (
                            <button
                               key={item.id}
                               disabled={toggleAvailabilityMutation.isPending}
                               onClick={() => toggleAvailabilityMutation.mutate({ id: item.id, item })}
                               className={cn(
                                  "flex items-center justify-between p-4 rounded-2xl border transition-all text-left group",
                                  item.isAvailable 
                                     ? "bg-white/5 border-white/5 hover:border-emerald-500/30" 
                                     : "bg-red-500/5 border-red-500/20 grayscale"
                               )}
                            >
                               <div className="flex items-center gap-3">
                                  <div className={cn("w-2 h-2 rounded-full", item.isAvailable ? "bg-emerald-500" : "bg-red-500")} />
                                  <div className="font-bold text-sm tracking-tight">{item.name}</div>
                               </div>
                               <div className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                                  item.isAvailable ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-500"
                               )}>
                                  {item.isAvailable ? 'Sẵn sàng' : 'Hết hàng'}
                               </div>
                            </button>
                         ))}
                      </div>
                   </div>
                ))
             )}
          </div>

          <div className="p-8 border-t border-white/5 bg-white/[0.02]">
             <button 
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
             >
                Hoàn tất
             </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
