'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Loader2, ShieldCheck, Mail, Phone, Briefcase, Trash2, Edit3, KeyRound, X, Clock, Download, Camera } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import RoleGuard from '@/components/auth/RoleGuard';

interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  role: number;
  email: string | null;
  phoneNumber: string | null;
  department: string | null;
  createdAt: string;
  avatarUrl: string | null;
  isActive: boolean;
  isClockedIn: boolean;
}

const ROLE_MAP: Record<number, { label: string, color: string }> = {
  0: { label: 'Quản Trị Viên', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  1: { label: 'Nhân Viên', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { label: 'Thu Ngân', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  3: { label: 'Bếp Trưởng', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  4: { label: 'Phục Vụ', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
};

export default function StaffPage() {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShiftLogsOpen, setIsShiftLogsOpen] = useState(false);
  const [shiftTargetId, setShiftTargetId] = useState<number | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const queryClient = useQueryClient();

  const { data: staffList = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => (await apiClient.get('/users')).data
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => (await apiClient.get('/users/profile')).data
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Đã xóa nhân viên thành công');
    },
    onError: (err: any) => toast.error(err.response?.data || 'Không thể xóa nhân viên')
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number, isActive: boolean }) => 
      apiClient.put(`/users/${id}`, { isActive: !isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Cập nhật trạng thái thành công');
    }
  });

  const exportStaffCSV = () => {
    const csvContent = [
      ['ID', 'Username', 'Họ Tên', 'Vai Trò', 'Email', 'SĐT', 'Phòng Ban', 'Ngày tạo', 'Trạng thái'],
      ...staffList.map(s => [
        s.id, 
        s.username, 
        s.fullName || '', 
        ROLE_MAP[s.role]?.label || '', 
        s.email || '', 
        s.phoneNumber || '', 
        s.department || '', 
        new Date(s.createdAt).toLocaleDateString(),
        s.isActive ? 'Đang hoạt động' : 'Đã khóa'
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `VIP_PROMAX_Staff_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    toast.success('Đã xuất danh sách nhân sự!');
  };

  const filteredStaff = staffList.filter(s => 
    s.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGuard allowedRoles={[0, 3]}>
      <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-primary font-bold text-xs uppercase tracking-[0.2em]">Administrative Hub</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Đội Ngũ <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Nhân Sự</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" placeholder="Tìm tên, username..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-primary/50 transition-colors focus:bg-white/10 w-[250px]"
            />
          </div>
          </div>
          {profile?.role === 0 && (
            <motion.button 
              onClick={exportStaffCSV}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl font-bold flex items-center gap-2 hover:bg-white/10 transition-colors"
            >
              <Download size={18} /> Xuất CSV
            </motion.button>
          )}
          {profile?.role === 0 && (
            <motion.button 
              onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus size={18} /> Thêm Nhân Viên
            </motion.button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary w-10 h-10 mb-4" />
          <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">Đang tải danh sách nhân sự...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredStaff.map((member, idx) => {
              const roleInfo = ROLE_MAP[member.role] || ROLE_MAP[1];
              return (
                <motion.div 
                  key={member.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass group rounded-[2rem] p-6 border-white/5 hover:border-primary/30 transition-all relative overflow-hidden"
                >
                   <div className="flex items-start justify-between mb-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black text-2xl group-hover:bg-primary/10 transition-colors overflow-hidden">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.fullName} className="w-full h-full object-cover" />
                          ) : (
                            member.fullName?.[0] || member.username[0].toUpperCase()
                          )}
                        </div>
                        {member.isClockedIn && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0c0e14] rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", roleInfo.color)}>
                           {roleInfo.label}
                         </div>
                         {member.isClockedIn && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                               <span className="w-1 h-1 bg-emerald-400 rounded-full" /> Đang trực
                            </span>
                         )}
                         {!member.isActive && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                               Tài khoản khóa
                            </span>
                         )}
                      </div>
                   </div>

                   <h3 className="text-xl font-bold truncate mb-1">{member.fullName || member.username}</h3>
                   <p className="text-xs text-muted-foreground font-mono mb-4 italic">@{member.username}</p>

                   <div className="space-y-3 pt-4 border-t border-white/5">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Mail size={14} className="text-primary" /> {member.email || 'N/A'}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Phone size={14} className="text-primary" /> {member.phoneNumber || 'N/A'}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <Briefcase size={14} className="text-primary" /> {member.department || 'Vận hành'}
                      </div>
                   </div>

                   {profile?.role === 0 && (
                     <div className="flex items-center gap-2 mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => { setEditingStaff(member); setIsModalOpen(true); }}
                          className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
                        >
                          <Edit3 size={14} /> Chỉnh sửa
                        </button>
                        <button 
                          onClick={() => { setShiftTargetId(member.id); setIsShiftLogsOpen(true); }}
                          className="p-2 bg-white/5 hover:bg-primary/20 hover:text-primary rounded-xl transition-colors"
                          title="Lịch sử chấm công"
                        >
                           <Clock size={16} />
                        </button>
                        <button 
                           onClick={() => toggleActiveMutation.mutate({ id: member.id, isActive: member.isActive })}
                           className={cn("p-2 rounded-xl transition-colors", member.isActive ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20")}
                           title={member.isActive ? "Đang hoạt động - Nhấn để khóa" : "Đã khóa - Nhấn để mở"}
                        >
                           <ShieldCheck size={16} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('Chắc chắn xóa vĩnh viễn?')) deleteMutation.mutate(member.id); }}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                     </div>
                   )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

        <StaffModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          initialData={editingStaff} 
        />

        <ShiftLogsModal 
           isOpen={isShiftLogsOpen} 
           onClose={() => setIsShiftLogsOpen(false)} 
           userId={shiftTargetId} 
        />
    </div>
    </RoleGuard>
  );
}

function ShiftLogsModal({ isOpen, onClose, userId }: { isOpen: boolean, onClose: () => void, userId: number | null }) {
  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ['shifts', userId],
    queryFn: async () => (await apiClient.get(`/shift/user/${userId}`)).data,
    enabled: !!userId && isOpen
  });

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
       <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="glass w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col rounded-[2.5rem] border-white/5 shadow-2xl">
          <div className="p-8 border-b border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/20 rounded-2xl text-primary"><Clock size={20} /></div>
                <div>
                   <h2 className="text-xl font-black uppercase tracking-tight">Lịch sử chấm công</h2>
                   <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Dữ liệu giờ vào / giờ ra của nhân sự</p>
                </div>
             </div>
             <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
             {isLoading ? (
                <div className="flex items-center justify-center h-40"><Loader2 className="animate-spin text-primary" /></div>
             ) : shifts.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground uppercase text-[10px] font-black tracking-widest">Chưa có dữ liệu ca làm việc</div>
             ) : (
                <table className="w-full text-left border-separate border-spacing-y-2">
                   <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky top-0 bg-[#0c0e14] z-10">
                      <tr>
                         <th className="pb-4 pl-4">Thời gian</th>
                         <th className="pb-4">Giờ Vào</th>
                         <th className="pb-4">Giờ Ra</th>
                         <th className="pb-4">Thời lượng</th>
                         <th className="pb-4 pr-4">Ghi chú</th>
                      </tr>
                   </thead>
                   <tbody className="text-sm">
                      {shifts.map((s: any) => {
                         const start = new Date(s.startTime);
                         const end = s.endTime ? new Date(s.endTime) : null;
                         const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
                         return (
                            <tr key={s.id} className="bg-white/[0.02] hover:bg-white/5 transition-colors group">
                               <td className="py-4 pl-4 rounded-l-2xl border-y border-l border-white/5 font-bold">{start.toLocaleDateString()}</td>
                               <td className="py-4 border-y border-white/5 font-mono text-emerald-400">{start.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</td>
                               <td className="py-4 border-y border-white/5 font-mono text-orange-400">{end ? end.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '---'}</td>
                               <td className="py-4 border-y border-white/5 text-muted-foreground">{duration ? `${duration} phút` : <span className="text-emerald-400 animate-pulse">Đang trực</span>}</td>
                               <td className="py-4 pr-4 rounded-r-2xl border-y border-r border-white/5 italic text-muted-foreground">{s.note || '---'}</td>
                            </tr>
                         );
                      })}
                   </tbody>
                </table>
             )}
          </div>
       </motion.div>
    </motion.div>
  );
}

function StaffModal({ isOpen, onClose, initialData }: { isOpen: boolean, onClose: () => void, initialData: StaffMember | null }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 1,
    email: '',
    phoneNumber: '',
    department: '',
    avatarUrl: ''
  });
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (initialData) {
      setForm({
        username: initialData.username,
        password: '',
        fullName: initialData.fullName || '',
        role: initialData.role,
        email: initialData.email || '',
        phoneNumber: initialData.phoneNumber || '',
        department: initialData.department || '',
        avatarUrl: initialData.avatarUrl || ''
      });
    } else {
      setForm({ username: '', password: '', fullName: '', role: 1, email: '', phoneNumber: '', department: '', avatarUrl: '' });
    }
  }, [initialData, isOpen]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default');

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'drpm4i6y6'}/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.secure_url) {
        setForm(prev => ({ ...prev, avatarUrl: data.secure_url }));
        toast.success('Đã tải ảnh lên thành công');
      }
    } catch {
      toast.error('Lỗi tải ảnh lên');
    } finally {
      setIsUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: (data: any) => initialData 
      ? apiClient.put(`/users/${initialData.id}`, data) 
      : apiClient.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(initialData ? 'Cập nhật nhân sự thành công' : 'Đã tạo tài khoản thành công');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data || 'Đã xảy ra lỗi')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="bg-[#0c0e14] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
           <div>
              <h2 className="text-2xl font-black italic tracking-tight uppercase flex items-center gap-3">
                 <ShieldCheck className="text-primary" /> {initialData ? 'Cập Nhật Nhân Sự' : 'Đăng Ký Nhân Viên'}
              </h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">Hệ thống quản trị tài khoản nội bộ</p>
           </div>
           <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
        </div>

        <div className="px-8 pt-8 flex items-center gap-6">
            <div className="relative group">
                <div className="w-24 h-24 rounded-3xl bg-black/40 border border-white/10 flex items-center justify-center text-primary text-3xl font-black shadow-xl overflow-hidden">
                    {isUploading ? (
                        <Loader2 className="animate-spin" />
                    ) : form.avatarUrl ? (
                        <img src={form.avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                    ) : (
                        form.fullName?.[0] || '?'
                    )}
                </div>
                <label className="absolute -bottom-2 -right-2 p-2 bg-primary text-white rounded-xl cursor-pointer hover:scale-110 transition-transform shadow-lg">
                    <Camera size={14} />
                    <input type="file" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                </label>
            </div>
            <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">{form.fullName || 'Tên nhân sự'}</h3>
                <p className="text-[10px] font-bold text-muted-foreground">Ảnh đại diện nhân viên (Khuyên dùng 1:1)</p>
            </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Tên đăng nhập</label>
                <input 
                   disabled={!!initialData}
                   value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Mật khẩu {initialData && '(Để trống nếu không đổi)'}</label>
                <div className="relative">
                   <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <input 
                      type="password"
                      value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-primary/50 outline-none"
                   />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Vai Trò Hệ Thống</label>
                <select 
                   value={form.role} onChange={e => setForm({...form, role: parseInt(e.target.value)})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
                >
                   {Object.entries(ROLE_MAP).map(([val, info]) => (
                      <option key={val} value={val} className="bg-[#0c0e14]">{info.label}</option>
                   ))}
                </select>
              </div>
           </div>

           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Họ và Tên</label>
                <input 
                   value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Email / Contact</label>
                <input 
                   value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Phòng Ban / Bộ Phận</label>
                <input 
                   value={form.department} onChange={e => setForm({...form, department: e.target.value})}
                   className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary/50 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Số điện thoại</label>
                <div className="relative">
                   <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <input 
                      value={form.phoneNumber} onChange={e => setForm({...form, phoneNumber: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm focus:border-primary/50 outline-none"
                      placeholder="09xx..."
                   />
                </div>
              </div>
           </div>

           <div className="md:col-span-2 pt-6 flex gap-4">
              <button 
                type="submit" 
                disabled={mutation.isPending}
                className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                {mutation.isPending ? <Loader2 className="animate-spin inline mr-2" /> : initialData ? 'Lưu thay đổi' : 'Tạo tài khoản'}
              </button>
              <button 
                type="button" onClick={onClose}
                className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-white/10 transition-all"
              >
                Hủy
              </button>
           </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
