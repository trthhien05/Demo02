import React, { useEffect, useState } from 'react';
import { 
  Clock, 
  LogIn, 
  LogOut, 
  User,
  MessageSquare,
  History,
  Timer
} from 'lucide-react';
import api, { type Shift } from '../services/api';

const ShiftManagement: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [clockInNote, setClockInNote] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchShifts();
    return () => clearInterval(timer);
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shift');
      setShifts(response.data);
      // Tìm ca hiện tại (chưa có EndTime)
      const active = response.data.find((s: Shift) => !s.endTime);
      setActiveShift(active || null);
    } catch (err) {
      console.error('Error fetching shifts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    try {
      await api.post('/shift/clock-in');
      alert("Bắt đầu ca thành công! Chúc bạn một ngày làm việc hiệu quả.");
      fetchShifts();
    } catch (err: any) {
      alert(err.response?.data || "Lỗi khi bắt đầu ca");
    }
  };

  const handleClockOut = async () => {
    try {
      await api.post('/shift/clock-out', clockInNote);
      alert("Kết thúc ca thành công! Hẹn gặp lại bạn.");
      setClockInNote('');
      fetchShifts();
    } catch (err: any) {
      alert(err.response?.data || "Lỗi khi kết thúc ca");
    }
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : new Date().getTime();
    const diff = Math.floor((endTime - startTime) / 1000); // seconds
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải dữ liệu ca làm...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Clock size={32} className="text-primary" />
            Ca làm việc & Chấm công
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý thời gian làm việc và bàn giao ca của nhân viên.</p>
        </div>
        <div className="text-right glass px-6 py-3 rounded-2xl">
           <p className="text-xs font-bold text-muted-foreground uppercase">{currentTime.toLocaleDateString()}</p>
           <p className="text-2xl font-black font-mono text-primary">{currentTime.toLocaleTimeString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Active Shift Card */}
        <div className="md:col-span-1">
           <div className={`glass p-8 h-full flex flex-col gap-6 relative overflow-hidden transition-all duration-500 border-l-4 ${activeShift ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-primary'}`}>
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="font-bold text-xl mb-1">{activeShift ? 'Ca đang diễn ra' : 'Sẵn sàng vào ca'}</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">{activeShift ? 'Bạn hiện đang làm việc' : 'Vui lòng Clock-in'}</p>
                 </div>
                 <div className={`p-3 rounded-2xl ${activeShift ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/20 text-primary'}`}>
                    <Timer size={24} className={activeShift ? 'animate-spin-slow' : ''} />
                 </div>
              </div>

              {activeShift ? (
                <div className="space-y-6 flex-1">
                   <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Bắt đầu lúc:</span>
                         <span className="font-bold">{new Date(activeShift.startTime).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Thời gian đã làm:</span>
                         <span className="font-bold text-emerald-400 text-lg">{calculateDuration(activeShift.startTime, null)}</span>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Ghi chú bàn giao ca:</p>
                      <textarea 
                        placeholder="Nhập ghi chú quan trọng cho ca sau..." 
                        className="input-field min-h-[100px] w-full"
                        value={clockInNote}
                        onChange={(e) => setClockInNote(e.target.value)}
                      />
                   </div>

                   <button 
                     onClick={handleClockOut}
                     className="btn-primary w-full justify-center py-4 bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20"
                   >
                     <LogOut size={20} />
                     KẾT THÚC CA
                   </button>
                </div>
              ) : (
                <div className="space-y-8 flex-1 flex flex-col justify-center">
                   <div className="text-center opacity-30 py-10 scale-150">
                      <LogIn size={64} className="mx-auto" />
                   </div>
                   <button 
                     onClick={handleClockIn}
                     className="btn-primary w-full justify-center py-4 shadow-xl shadow-primary/20 text-lg"
                   >
                     <LogIn size={20} />
                     BẮT ĐẦU CA MỚI
                   </button>
                </div>
              )}
           </div>
        </div>

        {/* Shift History Table */}
        <div className="md:col-span-2">
           <div className="glass h-full flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                 <h3 className="font-bold flex items-center gap-2"><History size={18} className="text-primary" /> Lịch sử ca làm việc</h3>
                 <button className="text-[10px] font-bold uppercase text-primary hover:underline">Xem tất cả</button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="text-[10px] font-bold uppercase text-muted-foreground border-b border-white/5">
                          <th className="px-6 py-4">Nhân viên</th>
                          <th className="px-6 py-4">Thời gian</th>
                          <th className="px-6 py-4">Tổng cộng</th>
                          <th className="px-6 py-4">Ghi chú</th>
                       </tr>
                    </thead>
                    <tbody>
                       {shifts.map((shift, idx) => (
                         <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                     {shift.user?.fullName.charAt(0) || <User size={12} />}
                                  </div>
                                  <span className="text-sm font-medium">{shift.user?.fullName}</span>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-zinc-300">{new Date(shift.startTime).toLocaleDateString()}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">
                                     {new Date(shift.startTime).toLocaleTimeString()} - {shift.endTime ? new Date(shift.endTime).toLocaleTimeString() : '...'}
                                  </p>
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className={`text-xs font-mono font-bold ${shift.endTime ? 'text-primary' : 'text-emerald-400 animate-pulse'}`}>
                                  {calculateDuration(shift.startTime, shift.endTime || null)}
                               </span>
                            </td>
                            <td className="px-6 py-4">
                               {shift.note ? (
                                 <div className="flex items-center gap-2 text-xs text-muted-foreground italic group-hover:text-zinc-300 transition-colors">
                                    <MessageSquare size={12} />
                                    <span className="truncate max-w-[150px]">{shift.note}</span>
                                 </div>
                               ) : <span className="text-xs text-zinc-800 italic">-</span>}
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>

                 {shifts.length === 0 && (
                   <div className="py-20 text-center text-muted-foreground/30 text-sm italic">
                      Chưa có ca làm việc nào được ghi nhận.
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftManagement;
