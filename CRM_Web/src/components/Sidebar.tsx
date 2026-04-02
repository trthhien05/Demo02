import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CalendarClock, 
  TicketPercent, 
  LogOut,
  Sparkles,
  Utensils,
  Map as MapIcon,
  ShoppingCart,
  ChefHat,
  Receipt,
  Package,
  FlaskConical,
  Clock,
  Shield,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Sidebar: React.FC = () => {
  const { logout } = useAuth();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Tổng quan', path: '/' },
    { icon: <BarChart3 size={20} />, label: 'Báo cáo', path: '/reports' },
    { icon: <ShoppingCart size={20} />, label: 'Bán hàng (POS)', path: '/pos' },
    { icon: <Receipt size={20} />, label: 'Thu ngân (Billing)', path: '/billing' },
    { icon: <ChefHat size={20} />, label: 'Nhà bếp (KDS)', path: '/kitchen' },
    { icon: <Clock size={20} />, label: 'Ca làm việc', path: '/shifts' },
    { icon: <Shield size={20} />, label: 'Nhân sự', path: '/staff' },
    { icon: <Package size={20} />, label: 'Quản lý Kho', path: '/inventory' },
    { icon: <FlaskConical size={20} />, label: 'Định lượng (BOM)', path: '/recipes' },
    { icon: <MapIcon size={20} />, label: 'Sơ đồ bàn', path: '/tables' },
    { icon: <Utensils size={20} />, label: 'Thực đơn', path: '/menu' },
    { icon: <Users size={20} />, label: 'Khách hàng', path: '/customers' },
    { icon: <CalendarClock size={20} />, label: 'Đặt bàn', path: '/reservations' },
    { icon: <TicketPercent size={20} />, label: 'Vouchers', path: '/vouchers' },
  ];

  return (
    <div className="glass h-screen w-64 fixed left-0 top-0 flex flex-col p-4 z-50">
      <div className="flex items-center gap-3 px-2 py-6 mb-4">
        <div className="p-2 bg-primary rounded-lg">
          <Sparkles className="text-white" size={24} />
        </div>
        <h2 className="text-xl font-bold title-gradient">CRM Pro</h2>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                isActive 
                  ? 'bg-primary/20 text-primary border border-primary/30' 
                  : 'text-muted-foreground hover:bg-white/10 hover:text-white'
              }`
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-300 mt-auto mb-4"
      >
        <LogOut size={20} />
        <span className="font-medium">Đăng xuất</span>
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .bg-primary { background-color: hsl(var(--primary)); }
        .text-primary { color: hsl(var(--primary)); }
        .text-muted-foreground { color: hsl(var(--muted-foreground)); }
        .flex { display: flex; }
        .flex-col { flex-direction: column; }
        .items-center { align-items: center; }
        .gap-3 { gap: 0.75rem; }
        .gap-2 { gap: 0.5rem; }
        .p-4 { padding: 1rem; }
        .px-4 { padding-left: 1rem; padding-right: 1rem; }
        .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
        .rounded-xl { border-radius: 0.75rem; }
        .h-screen { height: 100vh; }
        .w-64 { width: 16rem; }
        .fixed { position: fixed; }
        .left-0 { left: 0; }
        .top-0 { top: 0; }
        .z-50 { z-index: 50; }
        .mb-4 { margin-bottom: 1rem; }
        .mt-auto { margin-top: auto; }
        .font-bold { font-weight: 700; }
        .font-medium { font-weight: 500; }
        .text-xl { font-size: 1.25rem; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
      `}} />
    </div>
  );
};

export default Sidebar;
