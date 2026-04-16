'use client';

import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Armchair, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { useSignalR } from '@/hooks/useSignalR';

// Enum matches backend
type TableStatus = 'Available' | 'Reserved' | 'Occupied' | 'Cleaning';

interface DiningTable {
  id: number;
  tableNumber: string;
  capacity: number;
  status: TableStatus;
}

export default function TableStatusOverview() {
  const queryClient = useQueryClient();
  const connection = useSignalR();

  // 1. Fetch live tables from backend
  const { data: tables = [], isLoading, isError } = useQuery<DiningTable[]>({
    queryKey: ['diningTables'],
    queryFn: async () => {
      const res = await apiClient.get('/table');
      return res.data;
    },
    refetchInterval: 60000 // auto refresh every minute as a fallback
  });

  // 2. Listen to SignalR real-time updates
  useEffect(() => {
    if (connection) {
      const handleStatusChange = (tableId: number, status: string) => {
        // Mutate React Query cache dynamically without refetching fully!
        queryClient.setQueryData(['diningTables'], (oldData: DiningTable[] | undefined) => {
          if (!oldData) return oldData;
          return oldData.map((t) => 
            t.id === tableId ? { ...t, status: status as TableStatus } : t
          );
        });
      };

      // Ensure we don't bind multiple times if effect re-runs
      connection.off('TableStatusChanged'); 
      connection.on('TableStatusChanged', handleStatusChange);

      return () => {
        connection.off('TableStatusChanged', handleStatusChange);
      };
    }
  }, [connection, queryClient]);

  // 3. Compute Stats
  const tableStats = useMemo(() => {
    const occupied = tables.filter(t => t.status === 'Occupied' || t.status === 'Cleaning').length;
    const available = tables.filter(t => t.status === 'Available').length;
    const reserved = tables.filter(t => t.status === 'Reserved').length;

    return [
      { label: 'Occupied', count: occupied, color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/30', glow: 'shadow-primary/20' },
      { label: 'Available', count: available, color: 'text-emerald-400', bg: 'bg-emerald-400/20', border: 'border-emerald-400/30', glow: 'shadow-emerald-400/20' },
      { label: 'Reserved', count: reserved, color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30', glow: 'shadow-orange-400/20' },
    ];
  }, [tables]);

  const totalTables = tables.length || 1; // avoid div by 0
  const occupiedCount = tableStats[0].count;
  const occupancyRate = tables.length > 0 ? Math.round((occupiedCount / totalTables) * 100) : 0;

  if (isLoading) {
    return (
      <div className="glass rounded-[2rem] p-8 border-white/5 h-full flex flex-col items-center justify-center">
         <Loader2 className="animate-spin text-primary w-8 h-8 mb-4" />
         <p className="text-sm text-muted-foreground animate-pulse">Syncing floor plan...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="glass rounded-[2rem] p-8 border-white/5 h-full flex items-center justify-center">
         <p className="text-sm text-red-400">Failed to load table data</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-[2rem] p-8 border-white/5 space-y-8 h-full">
      <div className="flex items-center justify-between">
         <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
               <LayoutGrid className="text-emerald-400" size={24} />
               Floor Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Live table occupancy</p>
         </div>
         {connection && connection.state === 'Connected' && (
           <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
           </span>
         )}
      </div>

      <div className="relative w-full aspect-square max-w-[200px] mx-auto flex items-center justify-center mt-4">
         <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle 
              cx="50" cy="50" r="45" 
              fill="transparent" 
              stroke="rgba(255,255,255,0.05)" 
              strokeWidth="8"
            />
            <motion.circle 
              cx="50" cy="50" r="45" 
              fill="transparent" 
              stroke="hsl(var(--primary))" 
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray="283"
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset: 283 - (283 * occupancyRate) / 100 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
         </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <Armchair className="text-primary/50 mb-1" size={24} />
            <span className="text-3xl font-black">{occupancyRate}%</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-1">Full</span>
         </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-6">
         {tableStats.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className={cn(
                "p-4 rounded-[1.25rem] flex items-center justify-between border backdrop-blur-md transition-all hover:scale-[1.02] shadow-lg",
                stat.bg, stat.border, stat.glow
              )}
            >
               <span className={cn("font-bold text-sm tracking-wide", stat.color)}>{stat.label}</span>
               <span className="font-black text-xl">{stat.count}</span>
            </motion.div>
         ))}
      </div>
    </div>
  );
}
