'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Plus, Search, Loader2, ShieldCheck, Mail, Phone, Briefcase, Trash2, Edit3, KeyRound, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface StaffMember {
  id: number;
  username: string;
  fullName: string;
  role: number;
  email: string | null;
  phoneNumber: string | null;
  department: string | null;
  createdAt: string;
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
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const queryClient = useQueryClient();

  const { data: staffList = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ['staff'],
    queryFn: async () => (await apiClient.get('/users')).data
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success('Đã xóa nhân viên');
    },
    onError: (err: any) => toast.error(err.response?.data || 'Không thể xóa nhân viên')
  });

  const filteredStaff = staffList.filter(s => 
    s.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
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
          <motion.button 
            onClick={() => { setEditingStaff(null); setIsModalOpen(true); }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <Plus size={18} /> Thêm Nhân Viên
          </motion.button>
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
                      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black text-2xl group-hover:bg-primary/10 transition-colors">
                        {member.fullName?.[0] || member.username[0].toUpperCase()}
                      </div>
                      <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border", roleInfo.color)}>
                        {roleInfo.label}
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

                   <div className="flex items-center gap-2 mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingStaff(member); setIsModalOpen(true); }}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
                      >
                        <Edit3 size={14} /> Chỉnh sửa
                      </button>
                      <button 
                        onClick={() => { if(confirm('Chắc chắn xóa?')) deleteMutation.mutate(member.id); }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                   </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Staff Modal */}
      <StaffModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        initialData={editingStaff} 
      />
    </div>
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
    department: ''
  });

  React.useEffect(() => {
    if (initialData) {
      setForm({
        username: initialData.username,
        password: '',
        fullName: initialData.fullName || '',
        role: initialData.role,
        email: initialData.email || '',
        phoneNumber: initialData.phoneNumber || '',
        department: initialData.department || ''
      });
    } else {
      setForm({ username: '', password: '', fullName: '', role: 1, email: '', phoneNumber: '', department: '' });
    }
  }, [initialData, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: any) => initialData 
      ? apiClient.put(`/users/${initialData.id}`, data) 
      : apiClient.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(initialData ? 'Đã cập nhật' : 'Đã tạo thành công');
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
