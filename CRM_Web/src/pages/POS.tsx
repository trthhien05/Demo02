import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Send,
  Coffee,
  LayoutGrid,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type MenuCategory, type MenuItem, type DiningTable, type OrderItem } from '../services/api';

const POS: React.FC = () => {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([api.get('/menu'), api.get('/table')])
      .then(([menuRes, tableRes]) => {
        setCategories(menuRes.data);
        setTables(tableRes.data.filter((t: DiningTable) => t.status === 0 || t.status === 1)); // Chỉ hiện bàn trống/đã đặt
        if (menuRes.data.length > 0) setActiveCategory(menuRes.data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.menuItemId === item.id);
      if (existing) {
        return prev.map(p => p.menuItemId === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { menuItemId: item.id, menuItem: item, quantity: 1, unitPrice: item.price, note: '' }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(p => 
      p.menuItemId === id ? { ...p, quantity: Math.max(1, p.quantity + delta) } : p
    ));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(p => p.menuItemId !== id));
  };

  const updateNote = (id: number, note: string) => {
    setCart(prev => prev.map(p => p.menuItemId === id ? { ...p, note } : p));
  };

  const submitOrder = async () => {
    if (!selectedTable) return alert("Vui lòng chọn bàn!");
    if (cart.length === 0) return alert("Giỏ hàng trống!");

    try {
      const order = {
        diningTableId: selectedTable.id,
        orderItems: cart.map(c => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
          note: c.note
        }))
      };
      await api.post('/order', order);
      alert("Tạo đơn hàng thành công! Đã gửi lệnh xuống bếp.");
      setCart([]);
      setSelectedTable(null);
    } catch (err) {
      console.error('Error submitting order:', err);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải dữ liệu POS...</div>;

  return (
    <div className="flex gap-6 h-[calc(100vh-160px)] animate-in fade-in duration-500">
      {/* Left Column: Menu */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ShoppingCart size={32} className="text-primary" />
              Điểm bán hàng (POS)
            </h1>
            <div className="relative">
               <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
               <input type="text" placeholder="Tìm món nhanh..." className="input-field pl-10 w-64 bg-white/5" />
            </div>
        </div>

        {/* Categories Bar */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'glass text-muted-foreground hover:text-white'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar pr-2">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
             {categories.find(c => c.id === activeCategory)?.menuItems.map(item => (
               <motion.div 
                 whileTap={{ scale: 0.95 }}
                 onClick={() => addToCart(item)}
                 key={item.id} 
                 className={`glass-card p-4 flex gap-4 cursor-pointer hover:border-primary/50 transition-colors ${!item.isAvailable ? 'opacity-50 pointer-events-none' : ''}`}
               >
                  <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? <img src={item.imageUrl} className="w-full h-full object-cover" /> : <Coffee size={24} className="text-muted-foreground/30" />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <p className="text-primary font-mono font-bold mt-1">{item.price.toLocaleString()}đ</p>
                  </div>
               </motion.div>
             ))}
          </div>
        </div>
      </div>

      {/* Right Column: Cart & Table Selection */}
      <div className="w-96 flex flex-col gap-6">
        {/* Table Selection */}
        <div className="glass p-5 space-y-4">
           <h3 className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
             <LayoutGrid size={16} /> CHỌN BÀN PHỤC VỤ
           </h3>
           <div className="grid grid-cols-4 gap-2">
              {tables.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setSelectedTable(t)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${selectedTable?.id === t.id ? 'bg-primary border-primary text-white' : 'border-white/5 hover:bg-white/5 text-muted-foreground'}`}
                >
                  {t.tableNumber}
                </button>
              ))}
           </div>
        </div>

        {/* Cart */}
        <div className="glass flex-1 flex flex-col overflow-hidden relative border-t-2 border-t-primary">
           <div className="p-4 border-b border-white/5 flex justify-between items-center bg-primary/5">
              <span className="font-bold text-sm">CHI TIẾT ĐƠN HÀNG {selectedTable && <span className="text-primary"> - BÀN {selectedTable.tableNumber}</span>}</span>
              <ShoppingCart size={18} className="text-primary" />
           </div>

           <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    key={item.menuItemId} 
                    className="space-y-2 border-b border-white/5 pb-3"
                  >
                    <div className="flex justify-between items-start">
                       <div className="flex-1">
                          <h4 className="text-sm font-bold">{item.menuItem?.name}</h4>
                          <input 
                            type="text" 
                            placeholder="Ghi chú (ít đá, không cay...)" 
                            className="bg-transparent text-[10px] text-muted-foreground border-none p-0 focus:ring-0 w-full"
                            value={item.note}
                            onChange={(e) => updateNote(item.menuItemId, e.target.value)}
                          />
                       </div>
                       <span className="text-xs font-mono font-bold text-primary ml-2">{(item.unitPrice * item.quantity).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.menuItemId, -1)} className="p-1.5 hover:bg-white/10 rounded-md"><Minus size={12} /></button>
                          <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.menuItemId, 1)} className="p-1.5 hover:bg-white/10 rounded-md"><Plus size={12} /></button>
                       </div>
                       <button onClick={() => removeFromCart(item.menuItemId)} className="text-red-400/50 hover:text-red-400 p-1.5"><Trash2 size={12} /></button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {cart.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 py-10">
                   <ShoppingCart size={48} className="mb-4" />
                   <p className="text-xs font-medium italic">Chưa có món nào được chọn</p>
                </div>
              )}
           </div>

           <div className="p-5 space-y-4 bg-background/50 border-t border-white/5">
              <div className="flex justify-between text-muted-foreground">
                 <span className="text-sm">Tổng tiền:</span>
                 <span className="text-lg font-bold text-white font-mono">{total.toLocaleString()}đ</span>
              </div>
              <button 
                onClick={submitOrder}
                className="btn-primary w-full justify-center py-3.5 shadow-xl shadow-primary/20"
              >
                <Send size={18} />
                XÁC NHẬN ORDER
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
