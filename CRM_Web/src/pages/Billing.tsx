import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Banknote, 
  QrCode, 
  UserPlus, 
  Search,
  Receipt,
  Printer,
  Clock,
  User,
  Ticket
} from 'lucide-react';
import { motion } from 'framer-motion';
import api, { type Order, type Customer, type Invoice } from '../services/api';

const Billing: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/order');
      // Lấy các order chưa thanh toán (Pending = 0, Preparing = 1, Served = 2)
      setOrders(response.data.filter((o: Order) => o.status !== 3 && o.status !== 4));
    } catch (err) {
      console.error('Error fetching billing orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerSearch = async () => {
    if (!customerSearch) return;
    try {
      const response = await api.get(`/customer`);
      const customer = response.data.find((c: Customer) => c.phoneNumber === customerSearch);
      if (customer) {
        setFoundCustomer(customer);
      } else {
        alert("Không tìm thấy khách hàng!");
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  };

  const handlePayment = async () => {
    if (!selectedOrder) return;
    
    const vat = selectedOrder.totalAmount * 0.08;
    const serviceCharge = selectedOrder.totalAmount * 0.05;
    
    const invoice: Invoice = {
      orderId: selectedOrder.id,
      customerId: foundCustomer?.id,
      subtotal: selectedOrder.totalAmount,
      discountAmount: 0, // Hiện tại chưa trừ voucher
      vatAmount: vat,
      serviceChargeAmount: serviceCharge,
      finalAmount: selectedOrder.totalAmount + vat + serviceCharge,
      paymentMethod: paymentMethod,
      status: 1 // Paid
    };

    try {
      await api.post('/billing/pay', invoice);
      alert("Thanh toán thành công! Bàn đã được giải phóng.");
      setSelectedOrder(null);
      setFoundCustomer(null);
      setCartEmpty();
      fetchOrders();
    } catch (err) {
      console.error('Payment error:', err);
    }
  };

  const setCartEmpty = () => {
    setCustomerSearch('');
    setPaymentMethod(0);
  };

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải danh sách thanh toán...</div>;

  return (
    <div className="flex gap-8 h-[calc(100vh-160px)] animate-in fade-in duration-500">
      {/* Left Column: List of Pending Orders */}
      <div className="w-1/3 flex flex-col gap-6 overflow-hidden">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Receipt size={32} className="text-primary" />
          Thu ngân & Thanh toán
        </h1>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-2 space-y-4">
           {orders.map(order => (
             <motion.div 
               layoutId={`order-${order.id}`}
               onClick={() => setSelectedOrder(order)}
               key={order.id} 
               className={`glass p-4 cursor-pointer hover:border-primary/50 transition-all ${selectedOrder?.id === order.id ? 'border-primary ring-1 ring-primary/20 bg-primary/5' : 'border-white/5'}`}
             >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center font-black text-primary">
                         {order.diningTable?.tableNumber}
                      </div>
                      <div>
                         <p className="text-sm font-bold">Bàn {order.diningTable?.tableNumber}</p>
                         <p className="text-[10px] text-muted-foreground uppercase font-medium">#{order.id} • {new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                   </div>
                   <span className="font-mono font-bold text-primary">{order.totalAmount.toLocaleString()}đ</span>
                </div>
                <div className="flex gap-2">
                   {order.status === 2 && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold uppercase">Đã bàn giao</span>}
                   {order.status === 1 && <span className="text-[9px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold uppercase">Đang nấu</span>}
                   <span className="text-[9px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full font-bold uppercase">{order.orderItems.length} món</span>
                </div>
             </motion.div>
           ))}

           {orders.length === 0 && (
             <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm glass">
                <Clock className="mb-2 opacity-20" size={32} />
                Hiện không có đơn hàng chờ thanh toán.
             </div>
           )}
        </div>
      </div>

      {/* Right Column: Bill Preview & Processing */}
      <div className="flex-1 glass flex flex-col overflow-hidden border-white/10 relative">
        {selectedOrder ? (
          <div className="flex h-full">
             {/* Billing Details */}
             <div className="flex-1 p-8 flex flex-col gap-8 overflow-y-auto no-scrollbar">
                <section className="space-y-4">
                   <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><User size={14} /> Khách hàng thân thiết</h3>
                   <div className="flex gap-3">
                      <div className="relative flex-1">
                         <Search className="absolute left-3 top-3 text-muted-foreground" size={18} />
                         <input 
                           type="text" 
                           placeholder="Nhập SĐT khách hàng..." 
                           className="input-field pl-10 w-full" 
                           value={customerSearch}
                           onChange={(e) => setCustomerSearch(e.target.value)}
                         />
                      </div>
                      <button onClick={handleCustomerSearch} className="btn-primary" style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>Tìm</button>
                      <button className="p-3 glass rounded-xl text-primary hover:bg-primary/20"><UserPlus size={20} /></button>
                   </div>
                   {foundCustomer && (
                     <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-400">
                           {foundCustomer.fullName.charAt(0)}
                        </div>
                        <div>
                           <p className="font-bold text-emerald-400">{foundCustomer.fullName}</p>
                           <p className="text-xs text-emerald-500/70">Xếp hạng: {foundCustomer.tier === 3 ? 'Diamond' : foundCustomer.tier === 2 ? 'Gold' : 'Member'} • Điểm: {foundCustomer.points}</p>
                        </div>
                     </motion.div>
                   )}
                </section>

                <section className="space-y-4">
                   <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2 uppercase tracking-widest"><CreditCard size={14} /> Phương thức thanh toán</h3>
                   <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 0, name: 'Tiền mặt', icon: <Banknote size={24} /> },
                        { id: 1, name: 'Thẻ / Banking', icon: <CreditCard size={24} /> },
                        { id: 2, name: 'Chuyển khoản QR', icon: <QrCode size={24} /> },
                        { id: 3, name: 'Ví điện tử', icon: <Ticket size={24} /> },
                      ].map(m => (
                        <button 
                          key={m.id}
                          onClick={() => setPaymentMethod(m.id)}
                          className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${paymentMethod === m.id ? 'border-primary bg-primary/10 text-primary' : 'border-white/5 hover:bg-white/5 text-muted-foreground'}`}
                        >
                           {m.icon}
                           <span className="text-xs font-bold uppercase">{m.name}</span>
                        </button>
                      ))}
                   </div>
                </section>
             </div>

             {/* Bill Preview (Receipt Style) */}
             <div className="w-96 bg-zinc-950/50 border-l border-white/5 flex flex-col p-8 gap-6">
                <div className="text-center space-y-2 pb-6 border-b border-white/5 border-dashed">
                   <h2 className="text-xl font-black italic tracking-tighter">ANTIGRAVITY <span className="text-primary italic">RESTAURANT</span></h2>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold">123 Street Code, Sector 7, Cyberspace</p>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-4">
                   <div className="flex justify-between text-xs font-bold mb-4 uppercase">
                      <span>Món ăn</span>
                      <span>Thành tiền</span>
                   </div>
                   {selectedOrder.orderItems.map((item, idx) => (
                     <div key={idx} className="flex justify-between items-start text-xs text-zinc-300">
                        <span className="flex-1 pr-4">{item.quantity}x {item.menuItem?.name}</span>
                        <span className="font-mono">{(item.unitPrice * item.quantity).toLocaleString()}</span>
                     </div>
                   ))}

                   <div className="pt-6 border-t border-white/5 border-dashed space-y-2 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                         <span>Tạm tính (Subtotal)</span>
                         <span>{selectedOrder.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                         <span>VAT (8%)</span>
                         <span>{(selectedOrder.totalAmount * 0.08).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                         <span>Phí phục vụ (5%)</span>
                         <span>{(selectedOrder.totalAmount * 0.05).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-white font-black text-lg pt-4">
                         <span>TỔNG CỘNG</span>
                         <span className="text-primary">{(selectedOrder.totalAmount * 1.13).toLocaleString()}đ</span>
                      </div>
                   </div>
                </div>

                <div className="space-y-3">
                   <button onClick={handlePayment} className="btn-primary w-full justify-center py-4 bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 text-sm">
                      HOÀN TẤT THANH TOÁN
                   </button>
                   <button className="w-full flex items-center justify-center gap-2 text-[10px] uppercase font-bold text-muted-foreground hover:text-white transition-all py-2">
                      <Printer size={14} /> In hóa đơn tạm tính
                   </button>
                </div>
             </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/20 gap-4">
             <Receipt size={80} />
             <p className="text-sm font-medium">Chọn một đơn hàng bên trái để tiến hành thanh toán</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Billing;
