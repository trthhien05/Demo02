'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Award } from 'lucide-react';
import { cn } from '@/lib/utils';

const topItems = [
  { id: 1, name: 'Wagyu A5 Ribeye', category: 'Main Course', sales: 145, revenue: '$18,500', trend: '+12%', isHot: true },
  { id: 2, name: 'Lobster Thermidor', category: 'Seafood', sales: 98, revenue: '$9,800', trend: '+5%', isHot: false },
  { id: 3, name: 'Truffle Risotto', category: 'Pasta', sales: 210, revenue: '$6,300', trend: '+18%', isHot: true },
  { id: 4, name: 'Dom Perignon 2012', category: 'Beverage', sales: 12, revenue: '$4,200', trend: '-2%', isHot: false },
  { id: 5, name: 'Foie Gras Terrine', category: 'Appetizer', sales: 115, revenue: '$3,450', trend: '+8%', isHot: false },
];

export default function TopSellingItems() {
  return (
    <div className="glass rounded-[2rem] p-8 border-white/5 space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Award className="text-orange-400" size={24} />
            Top Selling
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Highest revenue generating menu items</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        {topItems.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="group relative flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-2xl transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-black text-xl text-primary border border-white/5 shrink-0 overflow-hidden relative">
                {idx + 1}
                {item.isHot && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full animate-pulse border-2 border-background" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm truncate pr-2 group-hover:text-primary transition-colors">{item.name}</h4>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mt-1">{item.category}</p>
              </div>
            </div>
            
            <div className="text-right shrink-0 ml-4">
              <p className="font-black text-sm">{item.revenue}</p>
              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full inline-flex">
                <TrendingUp size={10} />
                {item.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
