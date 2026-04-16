'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Plus, Calendar, Loader2, Users, Clock, MessageSquare, Check, X, ShieldCheck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Maps to .NET Enums
type ReservationStatus = 0 | 1 | 2 | 3 | 4 | 5; 
// 0: Pending, 1: Confirmed, 2: Seated, 3: Completed, 4: Cancelled, 5: NoShow

interface Customer {
  fullName: string;
  phoneNumber: string;
}

interface Reservation {
  id: number;
  customerId: number;
  diningTableId?: number | null;
  reservationTime: string;
  paxCount: number;
  status: ReservationStatus;
  specialRequest?: string;
  customer?: Customer; // Mapped via Include()
}

const STATUS_MAP: Record<number, { label: string, color: string }> = {
  0: { label: 'Pending', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  1: { label: 'Confirmed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  2: { label: 'Seated', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  3: { label: 'Completed', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  4: { label: 'Cancelled', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  5: { label: 'No Show', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
};

export default function ReservationsPage() {
  const queryClient = useQueryClient();

  // 1. Fetch Reservations
  const { data: reservations = [], isLoading } = useQuery<Reservation[]>({
    queryKey: ['reservations'],
    queryFn: async () => {
      const res = await apiClient.get('/reservation');
      return res.data;
    },
    refetchInterval: 30000 // Refetch every 30s
  });

  // 2. Check-In Mutation
  const checkInMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/reservation/${id}/check-in`);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.Message || 'Customer Checked-In Successfully', {
         description: 'Automated greeting message dispatched via Queue.',
         icon: <ShieldCheck className="text-emerald-400" />
      });
      // Refresh cache
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
    },
    onError: (error: any) => {
      toast.error('Check-in failed', {
         description: error.response?.data || error.message
      });
    }
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-purple-400 font-bold text-xs uppercase tracking-[0.2em]">Booking System</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">VIP <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">Reservations</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
            <Calendar size={18} /> View Schedule
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Plus size={18} className="text-purple-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">New Booking</span>
            </div>
          </motion.button>
        </div>
      </div>

      <motion.div 
         initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
         className="glass rounded-[2rem] p-8 border-white/5 min-h-[500px]"
      >
         {isLoading ? (
            <div className="flex flex-col items-center justify-center h-[400px]">
               <Loader2 className="animate-spin text-purple-500 w-10 h-10 mb-4" />
               <p className="text-muted-foreground animate-pulse">Loading upcoming schedule...</p>
            </div>
         ) : reservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
               <CalendarDays size={64} className="text-white/10 mb-6" />
               <h3 className="text-xl font-bold mb-2">No Bookings Found</h3>
               <p className="text-muted-foreground">The schedule is currently clear for today.</p>
            </div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {reservations.map((res, idx) => {
                  const status = STATUS_MAP[res.status] || STATUS_MAP[0];
                  // format date
                  const resDate = new Date(res.reservationTime);
                  const timeString = resDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const dateString = resDate.toLocaleDateString();

                  // Can the user check-in?
                  const canCheckIn = res.status === 0 || res.status === 1;

                  return (
                     <motion.div 
                        key={res.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className={cn(
                           "relative overflow-hidden rounded-[1.5rem] p-6 border transition-all",
                           res.status === 2 ? "bg-emerald-500/5 border-emerald-500/20" : "glass border-white/5 hover:border-purple-500/30 shadow-xl"
                        )}
                     >
                        {/* Background Decor */}
                        {res.status === 2 && (
                           <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                        )}

                        <div className="flex items-start justify-between mb-5 relative z-10">
                           <div>
                              <h3 className="font-bold text-lg">{res.customer?.fullName || 'Walk-in Guest'}</h3>
                              <p className="text-sm text-muted-foreground mt-1">{res.customer?.phoneNumber || 'No Contact'}</p>
                           </div>
                           <div className={cn("px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider", status.color)}>
                              {status.label}
                           </div>
                        </div>

                        <div className="space-y-3 mb-6 relative z-10">
                           <div className="flex items-center gap-3 text-sm text-muted-foreground bg-white/5 p-3 rounded-xl">
                              <Clock size={16} className="text-purple-400" />
                              <span className="font-bold text-foreground">{timeString}</span>
                              <span className="opacity-50">| {dateString}</span>
                           </div>
                           
                           <div className="flex items-center gap-3 text-sm text-muted-foreground px-1">
                              <Users size={16} className="text-blue-400" />
                              <span className="font-medium text-foreground">Party of {res.paxCount}</span>
                              {res.diningTableId && (
                                 <span className="ml-auto text-xs bg-white/10 px-2 py-1 rounded-md">
                                    Table ID: {res.diningTableId}
                                 </span>
                              )}
                           </div>

                           {res.specialRequest && (
                              <div className="flex items-start gap-3 text-sm text-muted-foreground px-1 mt-2">
                                 <MessageSquare size={16} className="text-orange-400 mt-0.5 shrink-0" />
                                 <span className="line-clamp-2 italic">"{res.specialRequest}"</span>
                              </div>
                           )}
                        </div>

                        <div className="pt-4 border-t border-white/10 flex items-center justify-between relative z-10">
                           <span className="text-xs text-muted-foreground">ID: #{res.id.toString().padStart(5, '0')}</span>
                           
                           <div className="flex gap-2">
                              {canCheckIn ? (
                                 <button 
                                    onClick={() => checkInMutation.mutate(res.id)}
                                    disabled={checkInMutation.isPending}
                                    className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                                 >
                                    {checkInMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    Check In
                                 </button>
                              ) : res.status === 2 ? (
                                 <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20">
                                    Customer Seated
                                 </span>
                              ) : (
                                 <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-muted-foreground border border-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-colors">
                                    Details
                                 </button>
                              )}
                           </div>
                        </div>
                     </motion.div>
                  );
               })}
            </div>
         )}
      </motion.div>
    </div>
  );
}
