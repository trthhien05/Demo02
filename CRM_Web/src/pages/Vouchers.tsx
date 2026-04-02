import React, { useEffect, useState } from 'react';
import { 
  TicketPercent, 
  Gift, 
  Clock, 
  User, 
  CheckCircle2, 
  X,
  CreditCard,
  Percent,
  Search,
  Copy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type Voucher, type Customer } from '../services/api';

const Vouchers: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVoucher, setNewVoucher] = useState({
    customerId: 0,
    description: 'Voucher tặng riêng',
    type: 0, // 0: Percentage, 1: Fixed
    value: 0,
    expiryDays: 30
  });

  useEffect(() => {
    fetchVouchers();
    fetchCustomers();
  }, []);

  const fetchVouchers = async () => {
    try {
      // Vì API hiện tại chỉ có Get cho từng customer, tôi sẽ giả định một endpoint Get All hoặc mock
      await api.get('/auth/users'); // Fake call to see if auth works
      // Mock data nếu không có endpoint Get All
      setVouchers([
        { id: 1, code: 'WELCOME10', description: 'Giảm 10% cho khách mới', discountType: 0, value: 10, expiryDate: '2026-12-31', isUsed: false, customerId: 1, customer: { fullName: 'Nguyễn Văn A' } as any },
        { id: 2, code: 'LOYALTY50', description: 'Tặng khách hàng thân thiết', discountType: 1, value: 50000, expiryDate: '2026-06-30', isUsed: true, customerId: 2, customer: { fullName: 'Trần Thị B' } as any },
      ]);
    } catch (err) {
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/customer');
      setCustomers(response.data);
      if (response.data.length > 0) {
        setNewVoucher(prev => ({...prev, customerId: response.data[0].id}));
      }
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  const handleManualGive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/voucher/manual-give', newVoucher);
      alert("Đã tặng Voucher thành công!");
      setIsModalOpen(false);
      fetchVouchers();
    } catch (err) {
      alert("Lỗi khi tặng Voucher");
    }
  };

  if (loading) return <div className="text-center py-20 opacity-50 font-bold uppercase tracking-widest text-xs">Đang truy xuất kho Voucher...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TicketPercent size={32} className="text-primary" />
            Vouchers & Khuyến mãi
          </h1>
          <p className="text-muted-foreground mt-1">Phát hành và quản lý mã giảm giá cho các chương trình Marketing.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <Gift size={18} /> Tặng Voucher mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vouchers.map((v, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={v.id} 
            className={`relative overflow-hidden glass p-6 group transition-all hover:scale-[1.02] ${v.isUsed ? 'opacity-50 grayscale' : 'hover:border-primary/40'}`}
          >
             {/* Ticket Notch Styling */}
             <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-zinc-950 border border-white/5" />
             <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-zinc-950 border border-white/5" />
             
             <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl ${v.isUsed ? 'bg-zinc-800' : 'bg-primary/10 text-primary'}`}>
                   {v.discountType === 0 ? <Percent size={24} /> : <CreditCard size={24} />}
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Hết hạn</p>
                   <p className="text-xs font-mono font-bold text-zinc-300 flex items-center gap-1 justify-end">
                      <Clock size={12} /> {new Date(v.expiryDate).toLocaleDateString()}
                   </p>
                </div>
             </div>

             <div className="space-y-4">
                <div>
                   <h3 className="font-black text-2xl tracking-tighter text-white font-mono">{v.code}</h3>
                   <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-dashed border-white/10">
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
                         <User size={12} className="text-muted-foreground" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{v.customer?.fullName || 'Khách hàng'}</span>
                   </div>
                   <div className="text-xl font-black text-primary">
                      {v.discountType === 0 ? `-${v.value}%` : `-${v.value.toLocaleString()}đ`}
                   </div>
                </div>

                <div className="pt-2">
                   <button 
                     className={`w-full py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${v.isUsed ? 'bg-white/5 text-zinc-500 cursor-not-allowed' : 'bg-primary/20 text-primary hover:bg-primary hover:text-white'}`}
                     onClick={() => !v.isUsed && navigator.clipboard.writeText(v.code)}
                   >
                      {v.isUsed ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {v.isUsed ? 'ĐÃ SỬ DỤNG' : 'SAO CHÉP MÃ'}
                   </button>
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
               className="relative glass w-full max-w-lg overflow-hidden shadow-2xl"
             >
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-primary/5">
                   <h3 className="text-xl font-bold flex items-center gap-2">
                      <Gift className="text-primary" />
                      Tặng Voucher khích lệ
                   </h3>
                   <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
                </div>
                <form onSubmit={handleManualGive} className="p-8 space-y-6">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                         <User size={12} /> Chọn Khách hàng
                      </label>
                      <div className="relative">
                         <Search className="absolute left-3 top-3 text-muted-foreground" size={16} />
                         <select 
                           className="input-field w-full pl-10 appearance-none cursor-pointer" 
                           value={newVoucher.customerId}
                           onChange={(e) => setNewVoucher(prev => ({...prev, customerId: Number(e.target.value)}))}
                         >
                            {customers.map(c => <option key={c.id} value={c.id}>{c.fullName} - {c.phoneNumber}</option>)}
                         </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Loại giảm giá</label>
                         <select 
                           className="input-field w-full appearance-none cursor-pointer" 
                           value={newVoucher.type}
                           onChange={(e) => setNewVoucher(prev => ({...prev, type: Number(e.target.value)}))}
                         >
                            <option value={0}>Phần trăm (%)</option>
                            <option value={1}>Tiền mặt (VNĐ)</option>
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Giá trị giảm</label>
                         <input 
                           type="number" 
                           required
                           className="input-field w-full font-mono" 
                           placeholder="0" 
                           value={newVoucher.value}
                           onChange={(e) => setNewVoucher(prev => ({...prev, value: Number(e.target.value)}))}
                         />
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-bold text-muted-foreground uppercase">Hạn dùng (Ngày)</label>
                         <input 
                           type="number" 
                           required
                           className="input-field w-full" 
                           value={newVoucher.expiryDays}
                           onChange={(e) => setNewVoucher(prev => ({...prev, expiryDays: Number(e.target.value)}))}
                         />
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase">Lời nhắn / Mô tả</label>
                      <input 
                        type="text" 
                        className="input-field w-full" 
                        value={newVoucher.description}
                        onChange={(e) => setNewVoucher(prev => ({...prev, description: e.target.value}))}
                      />
                   </div>

                   <div className="pt-4">
                      <button type="submit" className="w-full btn-primary py-4 shadow-xl shadow-primary/20 flex justify-center gap-2">
                         <Gift size={20} /> XÁC NHẬN TẶNG VOUCHER
                      </button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Vouchers;
