'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Award, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';

interface TopItem {
  itemName: string;
  quantity: number;
}

export default function TopSellingItems() {
  const { data: topItems = [], isLoading } = useQuery<TopItem[]>({
    queryKey: ['top-selling'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/top-selling');
      return res.data;
    }
  });

  return (
    <div className="glass rounded-[2rem] p-8 border-white/5 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Award className="text-orange-400" size={24} />
            Top Selling
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Highest volume menu items</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-sm text-muted-foreground animate-pulse">Loading analytics...</span>
          </div>
        ) : topItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <Package size={32} className="mb-2" />
            <span className="text-sm text-muted-foreground">No sales data yet</span>
          </div>
        ) : (
          topItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="group relative flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-transparent hover:border-orange-500/30 rounded-2xl transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400/20 to-pink-500/20 flex items-center justify-center font-black text-xl text-orange-400 border border-white/5 shrink-0 overflow-hidden relative shadow-[0_0_15px_rgba(251,146,60,0.15)] group-hover:shadow-[0_0_20px_rgba(251,146,60,0.3)] transition-all">
                  {idx + 1}
                  {idx === 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse border-2 border-background" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate pr-2 group-hover:text-orange-400 transition-colors tooltip">{item.itemName}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">Culinary</p>
                </div>
              </div>
              
              <div className="text-right shrink-0 ml-4">
                <p className="font-black text-sm text-foreground">{item.quantity} <span className="text-xs text-muted-foreground font-normal">sold</span></p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
