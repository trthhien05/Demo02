'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LayoutGrid, Armchair } from 'lucide-react';
import { cn } from '@/lib/utils';

const tableStats = [
  { label: 'Occupied', count: 18, color: 'text-primary', bg: 'bg-primary/20', border: 'border-primary/30', glow: 'shadow-primary/20' },
  { label: 'Available', count: 4, color: 'text-emerald-400', bg: 'bg-emerald-400/20', border: 'border-emerald-400/30', glow: 'shadow-emerald-400/20' },
  { label: 'Reserved', count: 2, color: 'text-orange-400', bg: 'bg-orange-400/20', border: 'border-orange-400/30', glow: 'shadow-orange-400/20' },
];

export default function TableStatusOverview() {
  const totalTables = 24;
  const occupancyRate = Math.round((18 / totalTables) * 100);

  return (
    <div className="glass rounded-[2rem] p-8 border-white/5 space-y-8">
      <div className="flex items-center justify-between">
         <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
               <LayoutGrid className="text-emerald-400" size={24} />
               Floor Plan
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Live table occupancy</p>
         </div>
      </div>

      <div className="relative w-full aspect-square max-w-[200px] mx-auto flex items-center justify-center">
         {/* Simple circular progress visualization */}
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

      <div className="grid grid-cols-1 gap-3">
         {tableStats.map((stat, idx) => (
            <motion.div 
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className={cn(
                "p-4 rounded-2xl flex items-center justify-between border backdrop-blur-md transition-all hover:scale-105 shadow-lg",
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
