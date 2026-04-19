'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Edit2, Trash2, Loader2, Save, Layers } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Category {
  id: number;
  name: string;
  description: string;
  displayOrder: number;
}

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryManagementModal({ isOpen, onClose }: CategoryManagementModalProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // Fetch Categories
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['menu-categories'],
    queryFn: async () => (await apiClient.get('/menu')).data.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        displayOrder: c.displayOrder
    }))
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (cat: any) => apiClient.post('/menu/category', cat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast.success('Đã thêm danh mục mới');
      setIsAdding(false);
      setNewName('');
      setNewDesc('');
    }
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (cat: any) => apiClient.put(`/menu/category/${cat.id}`, cat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast.success('Đã cập nhật danh mục');
      setEditingId(null);
    }
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/menu/category/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
      toast.success('Đã xóa danh mục');
    },
    onError: (err: any) => {
      toast.error(err.response?.data || "Không thể xóa danh mục này.");
    }
  });

  const handleSave = (id: number) => {
    updateMutation.mutate({ id, name: newName, description: newDesc });
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setNewName(cat.name);
    setNewDesc(cat.description);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
           initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
           className="absolute inset-0 bg-black/80 backdrop-blur-md"
           onClick={onClose}
        />
        <motion.div 
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="relative w-full max-w-2xl bg-[#0c0e12] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
           <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400"><Layers size={24} /></div>
                 <div>
                    <h3 className="text-lg font-black italic uppercase tracking-tight">Quản Lý Danh Mục</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tùy chỉnh phân loại thực đơn</p>
                 </div>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
           </div>

           <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar space-y-4">
              {/* Add New Category */}
              {isAdding ? (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
                    <input 
                       autoFocus
                       placeholder="Tên danh mục mới (VD: Món Mùa Hè)" 
                       value={newName} onChange={e => setNewName(e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none"
                    />
                    <input 
                       placeholder="Mô tả ngắn..." 
                       value={newDesc} onChange={e => setNewDesc(e.target.value)}
                       className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none"
                    />
                    <div className="flex justify-end gap-3">
                       <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-white transition-colors">Hủy</button>
                       <button 
                          onClick={() => createMutation.mutate({ name: newName, description: newDesc })}
                          disabled={!newName || createMutation.isPending}
                          className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-widest disabled:opacity-50"
                       >
                          {createMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : 'Tạo Ngay'}
                       </button>
                    </div>
                 </motion.div>
              ) : (
                 <button 
                    onClick={() => { setIsAdding(true); setNewName(''); setNewDesc(''); }}
                    className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center gap-3 text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition-all text-xs font-black uppercase tracking-widest"
                 >
                    <Plus size={18} /> Thêm Danh Mục Mới
                 </button>
              )}

              {/* Category List */}
              <div className="space-y-3">
                 {categories.map(cat => (
                    <div key={cat.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-all group">
                       {editingId === cat.id ? (
                          <div className="space-y-3">
                             <input 
                                value={newName} onChange={e => setNewName(e.target.value)}
                                className="w-full bg-black/40 border border-white/20 rounded-xl px-4 py-2 text-sm focus:border-emerald-500/50 outline-none"
                             />
                             <div className="flex justify-end gap-2">
                                <button onClick={() => setEditingId(null)} className="p-2 text-muted-foreground hover:text-white"><X size={16} /></button>
                                <button onClick={() => handleSave(cat.id)} className="p-2 text-emerald-400 hover:scale-110 transition-all"><Save size={16} /></button>
                             </div>
                          </div>
                       ) : (
                          <div className="flex items-center justify-between">
                             <div>
                                <h4 className="font-bold text-sm">{cat.name}</h4>
                                <p className="text-[10px] text-muted-foreground italic">{cat.description || 'Không có mô tả'}</p>
                             </div>
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEdit(cat)} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-emerald-400 transition-colors">
                                   <Edit2 size={14} />
                                </button>
                                <button onClick={() => { if(confirm('Xóa danh mục này?')) deleteMutation.mutate(cat.id) }} className="p-2 hover:bg-white/10 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                                   <Trash2 size={14} />
                                </button>
                             </div>
                          </div>
                       )}
                    </div>
                 ))}
                 {isLoading && <Loader2 className="animate-spin text-emerald-500 mx-auto mt-4" />}
              </div>
           </div>

           <div className="p-8 pt-0 mt-4">
              <button 
                 onClick={onClose}
                 className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs transition-all"
              >
                 Đóng cửa sổ
              </button>
           </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
