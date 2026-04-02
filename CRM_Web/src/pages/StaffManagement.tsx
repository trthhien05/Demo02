import React, { useEffect, useState } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Shield, 
  MoreVertical,
  Mail,
  Smartphone,
  CheckCircle2,
  Lock,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

interface UserData {
  id: number;
  username: string;
  fullName: string;
  role: number;
}

const StaffManagement: React.FC = () => {
  const [staff, setStaff] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      // Giả định API register/users hoặc tương đương
      const response = await api.get('/auth/users'); // Sẽ cần tạo endpoint này ở backend
      setStaff(response.data);
    } catch (err) {
      console.error('Error fetching staff:', err);
      // Mock data nếu chưa có API
      setStaff([
        { id: 1, username: 'admin', fullName: 'Quản trị viên', role: 0 },
        { id: 2, username: 'cashier1', fullName: 'Nguyễn Thu Ngân', role: 3 },
        { id: 3, username: 'chef1', fullName: 'Trần Đầu Bếp', role: 4 },
        { id: 4, username: 'waiter1', fullName: 'Lê Phục Vụ', role: 5 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-20 opacity-50">Đang tải danh sách nhân viên...</div>;

  const getRoleBadge = (role: number) => {
    switch(role) {
      case 0: return { label: 'Admin', color: 'bg-red-500/20 text-red-400', icon: <ShieldAlert size={12} /> };
      case 3: return { label: 'Cashier', color: 'bg-emerald-500/20 text-emerald-400', icon: <ShieldCheck size={12} /> };
      case 4: return { label: 'Kitchen', color: 'bg-orange-500/20 text-orange-400', icon: <Shield size={12} /> };
      case 5: return { label: 'Waiter', color: 'bg-blue-500/20 text-blue-400', icon: <Shield size={12} /> };
      default: return { label: 'Staff', color: 'bg-white/5 text-muted-foreground', icon: <Shield size={12} /> };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users size={32} className="text-primary" />
            Đội ngũ nhân sự
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý tài khoản, vai trò và phân quyền truy cập hệ thống.</p>
        </div>
        <button className="btn-primary">
          <UserPlus size={18} />
          Thêm nhân viên mới
        </button>
      </div>

      <div className="flex gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên hoặc tên đăng nhập..." 
              className="input-field pl-10 w-full bg-white/5" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2">
            {['Tất cả', 'Admin', 'Thu ngân', 'Bếp', 'Phục vụ'].map(f => (
              <button key={f} className="glass px-4 py-2 text-xs font-bold hover:bg-white/5 transition-all">{f}</button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {staff.filter(s => s.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map((member, idx) => {
          const role = getRoleBadge(member.role);
          return (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={member.id} 
              className="glass p-6 group hover:border-primary/30 transition-all relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 hover:bg-white/5 rounded-lg"><MoreVertical size={16} /></button>
               </div>

               <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl font-black text-primary border-2 border-primary/20">
                       {member.fullName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-zinc-900 flex items-center justify-center" title="Online">
                       <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                    </div>
                  </div>

                  <div>
                     <h3 className="font-bold text-lg">{member.fullName}</h3>
                     <p className="text-xs text-muted-foreground font-mono">@{member.username}</p>
                  </div>

                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${role.color}`}>
                     {role.icon} {role.label}
                  </div>

                  <div className="w-full pt-4 border-t border-white/5 space-y-2">
                     <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-zinc-300">
                        <Mail size={12} />
                        <span className="truncate">{member.username}@restaurant.com</span>
                     </div>
                     <div className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-zinc-300">
                        <Smartphone size={12} />
                        <span>09x-xxx-xxxx</span>
                     </div>
                  </div>

                  <div className="w-full flex gap-2 pt-2">
                     <button className="flex-1 py-2 glass text-[10px] font-bold uppercase hover:bg-primary/20 hover:text-primary transition-all flex items-center justify-center gap-1">
                        <Lock size={12} /> Password
                     </button>
                     <button className="px-3 py-2 glass text-emerald-400 hover:bg-emerald-500/20 transition-all">
                        <CheckCircle2 size={16} />
                     </button>
                  </div>
               </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default StaffManagement;
