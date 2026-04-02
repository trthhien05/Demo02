import axios from 'axios';

const API_BASE_URL = 'https://localhost:7293/api'; // Hoặc http://localhost:5013/api

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor để gắn Token vào Header
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor xử lý lỗi 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('crm_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export type OrderStatus = 0 | 1 | 2 | 3 | 4; // 0: Pending, 1: Preparing, 2: Served, 3: Completed, 4: Cancelled

export interface Customer {
  id: number;
  phoneNumber: string;
  fullName: string;
  email: string;
  points: number;
  tier: number;
  segment: string;
  lastVisit: string;
}

export interface Reservation {
  id: number;
  customerId: number;
  customer?: Customer;
  reservationTime: string;
  paxCount: number;
  status: number;
}

export interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  categoryId: number;
}

export interface MenuCategory {
  id: number;
  name: string;
  description?: string;
  menuItems: MenuItem[];
}

export interface DiningTable {
  id: number;
  tableNumber: string;
  capacity: number;
  status: number;
  zone?: string;
}

export interface OrderItem {
  id?: number;
  orderId?: number;
  menuItemId: number;
  menuItem?: MenuItem;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface Order {
  id: number;
  diningTableId: number;
  diningTable?: DiningTable;
  status: number;
  totalAmount: number;
  specialNotes?: string;
  createdAt: string;
  orderItems: OrderItem[];
}

export interface Invoice {
  id?: number;
  orderId: number;
  order?: Order;
  customerId?: number;
  customer?: Customer;
  subtotal: number;
  discountAmount: number;
  appliedVoucherCode?: string;
  vatAmount: number;
  serviceChargeAmount: number;
  finalAmount: number;
  status: number;
  issuedAt?: string;
  paymentMethod: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  stockQuantity: number;
  minStockLevel: number;
  lastUpdated: string;
}

export interface Recipe {
  id: number;
  menuItemId: number;
  menuItem?: MenuItem;
  inventoryItemId: number;
  inventoryItem?: InventoryItem;
  quantity: number;
}

export interface Shift {
  id: number;
  userId: number;
  user?: { fullName: string; username: string };
  startTime: string;
  endTime?: string;
  note?: string;
}

export interface Voucher {
  id: number;
  code: string;
  description?: string;
  discountType: number;
  value: number;
  expiryDate: string;
  isUsed: boolean;
  customerId: number;
  customer?: Customer;
}





