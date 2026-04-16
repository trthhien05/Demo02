'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Download, Search, Loader2, Crown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface Customer {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  points: number;
  tier: number; // 0=Member, 1=Silver, 2=Gold, 3=Diamond
}

const TIER_MAP: Record<number, { label: string, color: string, iconColor: string }> = {
  3: { label: 'Diamond VIP', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]', iconColor: 'text-purple-400' },
  2: { label: 'Gold', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', iconColor: 'text-yellow-400' },
  1: { label: 'Silver', color: 'bg-slate-300/10 text-slate-300 border-slate-300/20', iconColor: 'text-slate-300' },
  0: { label: 'Member', color: 'bg-blue-400/10 text-blue-400 border-blue-400/20', iconColor: 'text-blue-400' },
};

export default function CustomersPage() {
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await apiClient.get('/customer');
      return res.data;
    }
  });

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="text-blue-400 font-bold text-xs uppercase tracking-[0.2em]">CRM Module</span>
          <h1 className="text-4xl font-black mt-2 tracking-tight">Customer <span className="title-gradient bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">Directory</span></h1>
        </motion.div>

        <div className="flex flex-wrap gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search customers..." 
              className="pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 transition-colors focus:bg-white/10 w-[250px]"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all font-bold text-sm">
            <Download size={18} /> Export List
          </button>
          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="group relative p-[1px] rounded-2xl overflow-hidden bg-gradient-to-r from-blue-500 to-indigo-500"
          >
            <div className="bg-background/90 rounded-[15px] px-6 py-3 flex items-center gap-3">
              <Plus size={18} className="text-blue-400 group-hover:rotate-90 transition-transform" />
              <span className="text-sm font-bold">Add Member</span>
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
               <Loader2 className="animate-spin text-blue-500 w-10 h-10 mb-4" />
               <p className="text-muted-foreground animate-pulse">Syncing VIP Database...</p>
            </div>
         ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
               <Users size={64} className="text-white/10 mb-6" />
               <h3 className="text-xl font-bold mb-2">No Customers Yet</h3>
               <p className="text-muted-foreground">Start adding customers to build your loyalty base.</p>
            </div>
         ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                  <thead>
                     <tr className="border-b border-white/10">
                        <th className="py-4 px-6 font-bold text-muted-foreground tracking-wider uppercase text-xs">Customer Name</th>
                        <th className="py-4 px-6 font-bold text-muted-foreground tracking-wider uppercase text-xs">Contact Info</th>
                        <th className="py-4 px-6 font-bold text-muted-foreground tracking-wider uppercase text-xs">Loyalty Tier</th>
                        <th className="py-4 px-6 font-bold text-muted-foreground tracking-wider uppercase text-xs text-right">Points</th>
                     </tr>
                  </thead>
                  <tbody>
                     {customers.map((c, index) => {
                        const tier = TIER_MAP[c.tier] || TIER_MAP[0];
                        return (
                           <motion.tr 
                              key={c.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors group cursor-pointer"
                           >
                              <td className="py-5 px-6">
                                 <div className="font-bold text-lg">{c.fullName}</div>
                                 <div className="text-xs text-muted-foreground">ID: #{c.id.toString().padStart(4, '0')}</div>
                              </td>
                              <td className="py-5 px-6">
                                 <div className="font-medium">{c.phoneNumber}</div>
                                 <div className="text-xs text-muted-foreground">{c.email || 'No email provided'}</div>
                              </td>
                              <td className="py-5 px-6">
                                 <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold uppercase", tier.color)}>
                                    <Crown size={12} className={tier.iconColor} />
                                    {tier.label}
                                 </div>
                              </td>
                              <td className="py-5 px-6 text-right">
                                 <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">
                                    {c.points.toLocaleString()}
                                 </span>
                                 <span className="text-xs text-muted-foreground ml-1">pts</span>
                              </td>
                           </motion.tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         )}
      </motion.div>
    </div>
  );
}
