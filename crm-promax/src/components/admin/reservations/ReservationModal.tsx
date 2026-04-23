'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
   X, Search, Users, Clock, Calendar, 
   Loader2, CheckCircle2, MessageSquare, 
   Plus, UserPlus, Phone, User, LayoutGrid
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Customer {
  id: number;
  fullName: string;
  phoneNumber: string;
}

export default function ReservationModal({ isOpen, onClose }: ReservationModalProps) {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState<'customer' | 'details' | 'table'>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Reservation Details
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('19:00');
  const [paxCount, setPaxCount] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [source, setSource] = useState('Call');
  const [selectedTable, setSelectedTable] = useState<any | null>(null);

  // Fetch Customers
  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customer?pageSize=100'); // Get a larger list for search
      return res.data.items || [];
    },
    enabled: isOpen
  });

  // Fetch Tables for selection
  const { data: tables = [], isLoading: tablesLoading } = useQuery<any[]>({
    queryKey: ['tables'],
    queryFn: async () => (await apiClient.get('/table')).data,
    enabled: activeStep === 'table'
  });

  const createReservationMutation = useMutation({
    mutationFn: (payload: any) => apiClient.post('/reservation', payload),
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ['reservations'] });
       queryClient.invalidateQueries({ queryKey: ['tables'] });
       toast.success("Đặt bàn thành công!", {
          description: `Khách ${selectedCustomer?.fullName} đã được ghi nhận tại bàn ${selectedTable?.tableNumber}.`
       });
       handleClose();
    },
    onError: (err: any) => {
       const errorData = err.response?.data;
       let errorMessage = "Vui lòng kiểm tra lại thời gian (tối thiểu 30 phút trước giờ đến).";
       
       if (typeof errorData === 'string') {
         errorMessage = errorData;
       } else if (errorData && typeof errorData === 'object') {
         // Nếu là ProblemDetails của .NET, ưu tiên lấy title hoặc chi tiết lỗi
         errorMessage = errorData.title || errorData.message || "Dữ liệu gửi lên không đúng định dạng.";
       }

       toast.error("Lỗi khi đặt bàn", {
          description: errorMessage
       });
    }
  });

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers.slice(0, 10);
    return customers.filter(c => 
       c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
       c.phoneNumber.includes(searchQuery)
    ).slice(0, 10);
  }, [customers, searchQuery]);

  // Filter tables by capacity
  const availableTables = useMemo(() => {
    return tables.filter(t => t.capacity >= paxCount);
  }, [tables, paxCount]);

  const handleClose = () => {
    setActiveStep('customer');
    setSelectedCustomer(null);
    setSelectedTable(null);
    setSearchQuery('');
    setSpecialRequests('');
    setPaxCount(2);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedCustomer || !selectedTable) return;
    
    // Combine date and time (Local to UTC or just keep string format for backend)
    const reservationTime = `${date}T${time}:00`;

    const payload = {
       customerId: selectedCustomer.id,
       diningTableId: selectedTable.id,
       reservationTime: reservationTime,
       paxCount: paxCount,
       specialRequests: specialRequests,
       source: source,
       status: 0 // Pending
    };

    createReservationMutation.mutate(payload);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={handleClose}
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#0c0e12] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400 border border-violet-500/20">
                   <Calendar size={20} />
                </div>
                <h2 className="text-xl font-black italic">ĐẶT BÀN MỚI</h2>
             </div>
             <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-muted-foreground">
                <X size={20} />
             </button>
          </div>

          <div className="p-8">
             {activeStep === 'customer' ? (
                /* STEP 1: SELECT CUSTOMER */
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tìm khách hàng</label>
                      <div className="relative">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                         <input 
                            type="text"
                            placeholder="Tên hoặc số điện thoại..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 outline-none focus:border-violet-500/50 transition-all text-sm"
                         />
                      </div>
                   </div>

                   <div className="space-y-2 min-h-[200px] max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {customersLoading ? (
                         <div className="flex flex-col items-center justify-center py-10 opacity-30">
                            <Loader2 className="animate-spin mb-2" />
                            <span className="text-xs">Đang tải danh sách...</span>
                         </div>
                      ) : filteredCustomers.length > 0 ? (
                         filteredCustomers.map(customer => (
                            <button
                               key={customer.id}
                               onClick={() => setSelectedCustomer(customer)}
                               className={cn(
                                  "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                                  selectedCustomer?.id === customer.id 
                                     ? "bg-violet-500/20 border-violet-500/50 shadow-lg shadow-violet-500/10" 
                                     : "bg-white/5 border-white/5 hover:bg-white/10"
                               )}
                            >
                               <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
                                     <User size={18} />
                                  </div>
                                  <div className="text-left">
                                     <div className="font-bold text-sm">{customer.fullName}</div>
                                     <div className="text-xs text-muted-foreground">{customer.phoneNumber}</div>
                                  </div>
                               </div>
                               {selectedCustomer?.id === customer.id && <CheckCircle2 className="text-violet-400" size={18} />}
                            </button>
                         ))
                      ) : (
                         <div className="text-center py-10 opacity-30">
                            <UserPlus size={40} className="mx-auto mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest">Không tìm thấy khách hàng</p>
                            <p className="text-[10px] mt-1">Hãy tạo khách hàng mới tại mục Khách Hàng</p>
                         </div>
                      )}
                   </div>

                   <button
                      disabled={!selectedCustomer}
                      onClick={() => setActiveStep('details')}
                      className="w-full py-4 bg-violet-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-violet-400 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                   >
                      Tiếp tục <Plus size={16} />
                   </button>
                </div>
             ) : activeStep === 'details' ? (
                /* STEP 2: RESERVATION DETAILS */
                <div className="space-y-6">
                   <div className="p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400">
                         <User size={18} />
                      </div>
                      <div>
                         <div className="text-xs text-violet-400 font-bold uppercase tracking-wider">Khách hàng</div>
                         <div className="font-bold">{selectedCustomer?.fullName}</div>
                      </div>
                      <button onClick={() => setActiveStep('customer')} className="ml-auto text-[10px] font-black uppercase text-muted-foreground hover:text-white underline">Thay đổi</button>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Ngày đến</label>
                         <div className="relative">
                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input 
                               type="date"
                               value={date}
                               onChange={e => setDate(e.target.value)}
                               className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-violet-500/50 transition-all text-sm"
                            />
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Giờ đến</label>
                         <div className="relative">
                            <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                            <input 
                               type="time"
                               value={time}
                               onChange={e => setTime(e.target.value)}
                               className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 outline-none focus:border-violet-500/50 transition-all text-sm"
                            />
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Số khách (Pax)</label>
                         <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-2">
                            <button onClick={() => setPaxCount(Math.max(1, paxCount - 1))} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">−</button>
                            <div className="flex-1 text-center font-bold">{paxCount}</div>
                            <button onClick={() => setPaxCount(paxCount + 1)} className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center">+</button>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kênh đặt</label>
                         <select 
                            value={source}
                            onChange={e => setSource(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 outline-none focus:border-violet-500/50 transition-all text-sm appearance-none"
                         >
                            <option value="Call" className="bg-[#0c0e12]">Gọi điện</option>
                            <option value="Website" className="bg-[#0c0e12]">Website</option>
                            <option value="App" className="bg-[#0c0e12]">Ứng dụng</option>
                            <option value="Zalo" className="bg-[#0c0e12]">Zalo OA</option>
                            <option value="WalkIn" className="bg-[#0c0e12]">Đến trực tiếp</option>
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                         <MessageSquare size={12} /> Ghi chú
                      </label>
                      <textarea 
                         value={specialRequests}
                         onChange={e => setSpecialRequests(e.target.value)}
                         placeholder="Yêu cầu đặc biệt..."
                         className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm outline-none focus:border-violet-500/50 transition-all h-20 resize-none"
                      />
                   </div>

                   <button
                      onClick={() => setActiveStep('table')}
                      className="w-full py-4 bg-violet-500 text-white rounded-[1.2rem] font-black uppercase tracking-widest text-xs hover:bg-violet-400 transition-all flex items-center justify-center gap-2"
                   >
                      Tiếp tục chọn bàn <LayoutGrid size={16} />
                   </button>
                </div>
             ) : (
                /* STEP 3: SELECT TABLE */
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div>
                         <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Khung giờ</div>
                         <div className="font-bold text-violet-400">{date} - {time}</div>
                      </div>
                      <button onClick={() => setActiveStep('details')} className="text-[10px] font-black uppercase text-muted-foreground hover:text-white underline">Quay lại</button>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Chọn bàn phù hợp ({paxCount} khách)</label>
                      <div className="grid grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                         {tablesLoading ? (
                            <div className="col-span-3 py-10 opacity-30 text-center flex flex-col items-center">
                               <Loader2 className="animate-spin mb-2" />
                               <span className="text-xs italic">Đang tìm bàn trống...</span>
                            </div>
                         ) : availableTables.length > 0 ? (
                            availableTables.map(t => (
                               <button
                                  key={t.id}
                                  onClick={() => setSelectedTable(t)}
                                  className={cn(
                                     "p-3 rounded-xl border text-center transition-all",
                                     selectedTable?.id === t.id 
                                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" 
                                        : "bg-white/5 border-white/5 hover:bg-white/10"
                                  )}
                               >
                                  <div className="text-lg font-black">{t.tableNumber}</div>
                                  <div className="text-[9px] uppercase tracking-tighter opacity-50">{t.capacity} chỗ</div>
                               </button>
                            ))
                         ) : (
                            <div className="col-span-3 py-10 opacity-30 text-center">
                               <X size={30} className="mx-auto mb-2" />
                               <p className="text-[10px] font-bold uppercase">Hết bàn phù hợp</p>
                            </div>
                         )}
                      </div>
                   </div>

                   <button
                      onClick={handleSubmit}
                      disabled={createReservationMutation.isPending || !selectedTable}
                      className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                   >
                      {createReservationMutation.isPending ? <Loader2 className="animate-spin" /> : "XÁC NHẬN ĐẶT BÀN"}
                   </button>
                </div>
             )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
