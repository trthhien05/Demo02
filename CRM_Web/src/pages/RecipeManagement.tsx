import React, { useEffect, useState } from 'react';
import { 
  FlaskConical, 
  Plus, 
  Trash2, 
  Save, 
  Utensils, 
  ArrowRight,
  Database,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type MenuItem, type InventoryItem, type Recipe } from '../services/api';

const RecipeManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [currentRecipes, setCurrentRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/menu'), api.get('/inventory')])
      .then(([menuRes, invRes]) => {
        // Flat list of all menu items from all categories
        const allItems: MenuItem[] = menuRes.data.flatMap((c: any) => c.menuItems);
        setMenuItems(allItems);
        setInventoryItems(invRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedMenuItem) {
      fetchRecipe(selectedMenuItem.id);
    }
  }, [selectedMenuItem]);

  const fetchRecipe = async (id: number) => {
    try {
      const response = await api.get(`/inventory/recipe/${id}`);
      setCurrentRecipes(response.data);
    } catch (err) {
      console.error('Error fetching recipe:', err);
    }
  };

  const addIngredientToRecipe = async (invItemId: number) => {
    if (!selectedMenuItem) return;
    const invItem = inventoryItems.find(i => i.id === invItemId);
    if (!invItem) return;

    const newRecipe: Recipe = {
      id: 0,
      menuItemId: selectedMenuItem.id,
      inventoryItemId: invItemId,
      inventoryItem: invItem,
      quantity: 1
    };

    try {
       const response = await api.post('/inventory/recipe', newRecipe);
       setCurrentRecipes(prev => [...prev, response.data]);
    } catch (err) {
       console.error('Error adding recipe item:', err);
    }
  };

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải thiết lập định lượng...</div>;

  return (
    <div className="flex gap-8 h-[calc(100vh-160px)] animate-in fade-in duration-500">
      {/* Left Column: Menu Items */}
      <div className="w-1/3 flex flex-col gap-6 overflow-hidden">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FlaskConical size={32} className="text-primary" />
          Thiết lập định lượng
        </h1>
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
           {menuItems.map(item => (
             <motion.div 
               whileHover={{ x: 5 }}
               onClick={() => setSelectedMenuItem(item)}
               key={item.id} 
               className={`glass p-4 cursor-pointer flex justify-between items-center transition-all ${selectedMenuItem?.id === item.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-white/5 opacity-80 hover:opacity-100'}`}
             >
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Utensils size={18} className="text-muted-foreground" />
                   </div>
                   <span className="text-sm font-bold">{item.name}</span>
                </div>
                {selectedMenuItem?.id === item.id ? <ArrowRight className="text-primary" size={16} /> : <div className="text-[10px] text-muted-foreground uppercase font-bold">CHỌN</div>}
             </motion.div>
           ))}
        </div>
      </div>

      {/* Right Column: Recipe Editor */}
      <div className="flex-1 glass flex flex-col overflow-hidden relative">
        {selectedMenuItem ? (
          <div className="flex flex-col h-full">
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                      <FlaskConical size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-bold">CÔNG THỨC: {selectedMenuItem.name}</h2>
                      <p className="text-xs text-muted-foreground">Tự động trừ kho khi món ăn này được phục vụ.</p>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button className="btn-secondary" onClick={() => setSelectedMenuItem(null)}>Hủy</button>
                   <button className="btn-primary"><Save size={18} /> Lưu công thức</button>
                </div>
             </div>

             <div className="flex-1 p-8 overflow-y-auto no-scrollbar space-y-8">
                {/* Current Ingredients */}
                <section className="space-y-4">
                   <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><Scale size={16} /> THIẾT LẬP ĐỊNH LƯỢNG (CHO 1 MÓN)</h3>
                   <div className="grid gap-3">
                      <AnimatePresence>
                        {currentRecipes.map((recipe, idx) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            key={idx} 
                            className="glass p-5 flex items-center gap-6 group hover:border-primary/30 transition-all"
                          >
                             <div className="bg-white/5 p-3 rounded-xl text-muted-foreground">
                                <Database size={20} />
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-bold mb-1">{recipe.inventoryItem?.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">SKU: {recipe.inventoryItem?.id}</p>
                             </div>
                             <div className="flex items-center gap-3">
                                <input 
                                  type="number" 
                                  defaultValue={recipe.quantity} 
                                  className="w-24 bg-white/5 border border-white/10 rounded-lg p-2 text-center text-primary font-mono font-bold focus:border-primary outline-none"
                                />
                                <span className="text-xs font-bold text-muted-foreground lowercase w-10">{recipe.inventoryItem?.unit}</span>
                             </div>
                             <button className="p-2 text-red-400 opacity-20 group-hover:opacity-100 hover:bg-red-500/10 rounded-lg transition-all">
                                <Trash2 size={18} />
                             </button>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {currentRecipes.length === 0 && (
                        <div className="py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                           <FlaskConical size={32} className="opacity-10" />
                           Món ăn này chưa được thiết lập định lượng.
                        </div>
                      )}
                   </div>
                </section>

                {/* Add New Ingredient */}
                <section className="space-y-4">
                   <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><Plus size={16} /> THÊM NGUYÊN LIỆU MỚI</h3>
                   <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {inventoryItems.filter(inv => !currentRecipes.some(r => r.inventoryItemId === inv.id)).map(inv => (
                        <button 
                          key={inv.id}
                          onClick={() => addIngredientToRecipe(inv.id)}
                          className="glass p-3 hover:bg-white/5 text-left flex items-center justify-between group transition-all"
                        >
                           <div className="flex-1 overflow-hidden">
                              <p className="text-xs font-bold truncate">{inv.name}</p>
                              <p className="text-[10px] text-muted-foreground lowercase">{inv.unit}</p>
                           </div>
                           <Plus size={14} className="text-primary opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                      ))}
                   </div>
                </section>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/20 gap-4">
             <FlaskConical size={80} />
             <p className="text-sm font-medium">Chọn một món ăn bên trái để thiết lập định lượng</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeManagement;
