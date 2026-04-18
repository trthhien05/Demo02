'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   X, Search, Plus, Minus, Trash2, ShoppingCart, 
   Users, MapPin, Loader2, CheckCircle2, Utensils, 
   ChevronRight, MessageSquare, Calculator
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  categoryId: number;
}

interface DiningTable {
  id: number;
  tableNumber: string;
  status: number; // 0: Available, 1: Occupied, 2: Reserved
}

interface CartItem extends MenuItem {
  quantity: number;
  note: string;
}

export default function OrderModal({ isOpen, onClose }: OrderModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'type' | 'items'>('type');
  const [orderType, setOrderType] = useState<'eat-in' | 'take-away'>('eat-in');
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');

  // Fetch Data
  const { data: menu = [] } = useQuery<MenuItem[]>({
    queryKey: ['menu-items'],
    queryFn: async () => {
       const res = await apiClient.get('/menu');
       // Flatten items from categories
       const allItems: MenuItem[] = [];
       res.data.forEach((cat: any) => {
          if (cat.menuItems) allItems.push(...cat.menuItems);
       });
       return allItems;
    },
    enabled: isOpen
  });

  const { data: tables = [] } = useQuery<DiningTable[]>({
    queryKey: ['diningTables'],
    queryFn: async () => (await apiClient.get('/table')).data,
    enabled: isOpen
  });

  const createOrderMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/order', payload),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['orders'] });
       queryClient.invalidateQueries({ queryKey: ['diningTables'] });
       toast.success("Tạo đơn hàng thành công!", {
          description: orderType === 'eat-in' ? "Đã gán bàn và gửi xuống bếp." : "Đơn hàng mang về đã được ghi nhận."
       });
       handleClose();
    },
    onError: (err: any) => {
       toast.error("Lỗi khi tạo đơn hàng", {
          description: err.response?.data || "Vui lòng kiểm tra lại kết nối."
       });
    }
  });

  // Derived State
  const filteredMenu = useMemo(() => {
    return menu.filter(item => 
       item.isAvailable && 
       item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [menu, searchQuery]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Handlers
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
       const existing = prev.find(i => i.id === item.id);
       if (existing) {
          return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
       }
       return [...prev, { ...item, quantity: 1, note: '' }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
       if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
       }
       return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleClose = () => {
    setStep('type');
    setCart([]);
    setSelectedTableId(null);
    setSearchQuery('');
    setSpecialNotes('');
    onClose();
  };

  const handleSubmit = () => {
    if (cart.length === 0) {
       toast.error("Vui lòng chọn ít nhất một món ăn.");
       return;
    }
    if (orderType === 'eat-in' && !selectedTableId) {
       toast.error("Vui lòng chọn bàn cho khách.");
       return;
    }

    const payload = {
       diningTableId: orderType === 'eat-in' ? selectedTableId : null,
       specialNotes: specialNotes,
       orderItems: cart.map(item => ({
          menuItemId: item.id,
          quantity: item.quantity,
          note: item.note
       }))
    };

    createOrderMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={handleClose}
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-[90vw] h-[85vh] bg-[#0c0e12] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary border border-primary/20">
                   <Utensils size={24} />
                </div>
                <div>
                   <h2 className="text-2xl font-black italic tracking-tight">TẠO ĐƠN HÀNG <span className="text-primary tracking-widest uppercase text-xs block not-italic font-bold">Hybrid POS System</span></h2>
                </div>
             </div>
             
             <div className="flex items-center gap-4">
                <div className="flex bg-black/40 p-1 rounded-2xl border border-white/5">
                   <button 
                      onClick={() => setOrderType('eat-in')}
                      className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", 
                         orderType === 'eat-in' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-white")}
                   >
                      Ăn Tại Chỗ
                   </button>
                   <button 
                      onClick={() => { setOrderType('take-away'); setSelectedTableId(null); }}
                      className={cn("px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all", 
                         orderType === 'take-away' ? "bg-emerald-500 text-white shadow-lg" : "text-muted-foreground hover:text-white")}
                   >
                      Mang Về
                   </button>
                </div>
                <button onClick={handleClose} className="p-3 hover:bg-white/10 rounded-full transition-colors text-muted-foreground hover:text-white">
                   <X size={24} />
                </button>
             </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* Left: Menu Browser */}
             <div className="flex-1 flex flex-col border-r border-white/5 bg-white/[0.01]">
                <div className="p-6">
                   <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                      <input 
                         type="text"
                         placeholder="Tìm món ăn nhanh..."
                         value={searchQuery}
                         onChange={e => setSearchQuery(e.target.value)}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-primary/50 transition-all text-sm"
                      />
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 pt-0">
                   <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredMenu.map(item => (
                         <motion.button
                            key={item.id}
                            whileHover={{ scale: 1.02, y: -4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => addToCart(item)}
                            className="glass text-left p-3 rounded-2xl border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden"
                         >
                            <div className="aspect-square rounded-xl overflow-hidden bg-black/40 mb-3">
                               {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                               ) : (
                                  <div className="w-full h-full flex items-center justify-center opacity-20"><Utensils size={24} /></div>
                               )}
                            </div>
                            <h4 className="font-bold text-sm truncate">{item.name}</h4>
                            <p className="text-emerald-400 font-mono font-black text-xs mt-1">{item.price.toLocaleString()}đ</p>
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground p-1.5 rounded-lg">
                               <Plus size={14} />
                            </div>
                         </motion.button>
                      ))}
                   </div>
                </div>
             </div>

             {/* Right: Cart & Configuration */}
             <div className="w-[450px] flex flex-col bg-black/20">
                {/* Table Selection (if eat-in) */}
                {orderType === 'eat-in' && (
                   <div className="p-6 border-b border-white/5">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                         <MapPin size={12} className="text-primary" /> Chọn Bàn Phục Vụ
                      </h3>
                      <div className="grid grid-cols-4 gap-2">
                         {tables.map(table => {
                            const isAvailable = table.status === 0;
                            const isSelected = selectedTableId === table.id;
                            return (
                               <button
                                  key={table.id}
                                  disabled={!isAvailable && !isSelected}
                                  onClick={() => setSelectedTableId(table.id)}
                                  className={cn(
                                     "py-3 rounded-xl text-xs font-bold transition-all border",
                                     isSelected ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : 
                                     isAvailable ? "bg-white/5 border-white/5 hover:border-primary/50 text-white" : "opacity-20 bg-transparent border-dashed cursor-not-allowed"
                                  )}
                               >
                                  {table.tableNumber}
                               </button>
                            );
                         })}
                      </div>
                   </div>
                )}

                {/* Cart Items */}
                <div className="flex-1 flex flex-col overflow-hidden">
                   <div className="p-6 pb-2 flex items-center justify-between">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                         <ShoppingCart size={12} className="text-primary" /> Chi tiết đơn hàng
                      </h3>
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">{cart.length} món</span>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto px-6 py-2 space-y-3">
                      <AnimatePresence mode="popLayout">
                         {cart.map(item => (
                            <motion.div 
                               layout key={item.id}
                               initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                               className="p-3 rounded-2xl bg-white/5 border border-white/5 flex gap-3 group"
                            >
                               <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden flex-shrink-0">
                                  <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                               </div>
                               <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-1">
                                     <h5 className="text-sm font-bold truncate pr-2">{item.name}</h5>
                                     <button onClick={() => removeFromCart(item.id)} className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                        <Trash2 size={14} />
                                     </button>
                                  </div>
                                  <div className="flex items-center justify-between">
                                     <div className="flex items-center gap-2 bg-black/40 rounded-lg p-1 px-2 border border-white/5">
                                        <button onClick={() => updateQuantity(item.id, -1)} className="text-muted-foreground hover:text-white"><Minus size={12} /></button>
                                        <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item.id, 1)} className="text-muted-foreground hover:text-white"><Plus size={12} /></button>
                                     </div>
                                     <span className="font-mono font-bold text-xs">{(item.price * item.quantity).toLocaleString()}đ</span>
                                  </div>
                               </div>
                            </motion.div>
                         ))}
                      </AnimatePresence>
                      
                      {cart.length === 0 && (
                         <div className="h-full flex flex-col items-center justify-center opacity-20 p-10 text-center">
                            <ShoppingCart size={40} className="mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">Giỏ hàng trống</p>
                         </div>
                      )}
                   </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white/[0.02] border-t border-white/5 space-y-4">
                   <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 ml-1">
                          <MessageSquare size={12} /> Ghi chú đặc biệt
                       </label>
                       <textarea 
                          value={specialNotes} onChange={e => setSpecialNotes(e.target.value)}
                          placeholder="Ví dụ: Không hành, nhiều đá..."
                          className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-xs outline-none focus:border-primary/30 transition-all resize-none h-16"
                       />
                   </div>

                   <div className="flex items-center justify-between p-4 bg-primary/5 rounded-2xl border border-primary/20">
                      <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">TỔNG THANH TOÁN</div>
                         <div className="text-3xl font-black italic tracking-tighter text-primary">
                            {subtotal.toLocaleString()} <span className="text-xs not-italic lowercase opacity-50">đ</span>
                         </div>
                      </div>
                      <Calculator size={32} className="text-primary/20" />
                   </div>

                   <button
                      onClick={handleSubmit}
                      disabled={cart.length === 0 || createOrderMutation.isPending || (orderType === 'eat-in' && !selectedTableId)}
                      className="w-full py-5 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20 disabled:grayscale disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                      {createOrderMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : (
                         <>
                            XÁC NHẬN ORDER
                            <ChevronRight size={18} />
                         </>
                      )}
                   </button>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
