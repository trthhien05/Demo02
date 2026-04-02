import React, { useEffect, useState } from 'react';
import { 
  CalendarClock, 
  Search, 
  User, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  CalendarDays,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api, { type Reservation } from '../services/api';

const Reservations: React.FC = () => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await api.get('/reservation');
      setReservations(response.data);
    } catch (err) {
      console.error('Error fetching reservations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      await api.post(`/reservation/${id}/check-in`);
      alert("Khách đã Check-in thành công!");
      fetchReservations();
    } catch (err) {
      alert("Lỗi khi Check-in");
    }
  };

  const handleUpdateStatus = async (id: number, status: number) => {
    try {
      await api.put(`/reservation/${id}/status`, status, {
        headers: { 'Content-Type': 'application/json' }
      });
      fetchReservations();
    } catch (err) {
      alert("Lỗi khi cập nhật trạng thái");
    }
  };

  const getStatusBadge = (status: number) => {
    switch(status) {
      case 0: return { label: 'Chờ xác nhận', color: 'bg-orange-500/20 text-orange-400' };
      case 1: return { label: 'Đã xác nhận', color: 'bg-emerald-500/20 text-emerald-400' };
      case 2: return { label: 'Đã đến (Seated)', color: 'bg-blue-500/20 text-blue-400' };
      case 3: return { label: 'Hoàn thành', color: 'bg-zinc-500/20 text-zinc-400' };
      case 4: return { label: 'Đã hủy', color: 'bg-red-500/20 text-red-500' };
      default: return { label: 'Không xác định', color: 'bg-white/5 text-muted-foreground' };
    }
  };

  const filteredReservations = reservations.filter(r => {
    const matchesSearch = r.customer?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.customer?.phoneNumber.includes(searchTerm);
    const matchesFilter = filter === 'all' ? true : r.status === filter;
    return matchesSearch && matchesFilter;
  });

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải danh sách đặt bàn...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarClock size={32} className="text-primary" />
            Quản lý Đặt bàn
          </h1>
          <p className="text-muted-foreground mt-1">Theo dõi lịch hẹn khách hàng và sắp xếp bàn ăn hiệu quả.</p>
        </div>
        <button className="btn-primary">
          <CalendarDays size={18} />
          Thêm đặt bàn mới
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên khách hoặc SĐT..." 
              className="input-field pl-10 w-full bg-white/5" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${filter === 'all' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'glass hover:bg-white/5'}`}
            >
              Tất cả
            </button>
            {[0, 1, 2, 4].map(s => (
               <button 
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${filter === s ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'glass hover:bg-white/5'}`}
              >
                {getStatusBadge(s).label}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
         <AnimatePresence mode='popLayout'>
            {filteredReservations.map((res, idx) => {
              const status = getStatusBadge(res.status);
              const resTime = new Date(res.reservationTime);
              return (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  key={res.id} 
                  className="glass p-6 group hover:border-primary/30 transition-all flex flex-col md:flex-row items-center gap-6"
                >
                   <div className="w-16 h-16 rounded-2xl bg-primary/10 flex flex-col items-center justify-center border border-primary/20">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{resTime.toLocaleString('vi-VN', { month: 'short' })}</span>
                      <span className="text-xl font-black text-primary">{resTime.getDate()}</span>
                   </div>

                   <div className="flex-1 min-w-0 text-center md:text-left">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-1">
                         <h3 className="font-bold text-lg">{res.customer?.fullName}</h3>
                         <div className={`w-fit mx-auto md:mx-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${status.color}`}>
                            {status.label}
                         </div>
                      </div>
                      <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-muted-foreground">
                         <div className="flex items-center gap-1.5"><User size={14} /> {res.customer?.phoneNumber}</div>
                         <div className="flex items-center gap-1.5"><Users size={14} /> {res.paxCount} khách</div>
                         <div className="flex items-center gap-1.5 font-bold text-zinc-300"><Clock size={14} /> {resTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                   </div>

                   <div className="flex gap-2 w-full md:w-auto">
                      {res.status === 0 && (
                        <button 
                          onClick={() => handleUpdateStatus(res.id, 1)}
                          className="flex-1 md:flex-none px-4 py-2 glass text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={14} /> Xác nhận
                        </button>
                      )}
                      {(res.status === 0 || res.status === 1) && (
                        <>
                          <button 
                            onClick={() => handleCheckIn(res.id)}
                            className="flex-1 md:flex-none px-6 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/80 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                          >
                            CHECK-IN <ChevronRight size={14} />
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(res.id, 4)}
                            className="p-2 glass text-red-400 hover:bg-red-500/20"
                            title="Hủy đặt bàn"
                          >
                            <XCircle size={18} />
                          </button>
                        </>
                      )}
                      <button className="p-2 glass text-muted-foreground hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                         <MoreVertical size={18} />
                      </button>
                   </div>
                </motion.div>
              );
            })}
         </AnimatePresence>

         {filteredReservations.length === 0 && (
           <div className="py-20 text-center glass border-dashed">
              <div className="text-muted-foreground/20 scale-150 mb-4 inline-block">
                 <CalendarClock size={48} />
              </div>
              <p className="text-muted-foreground italic">Không tìm thấy yêu cầu đặt bàn nào phù hợp.</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Reservations;
