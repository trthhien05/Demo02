'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Gift, Loader2, Sparkles, Target, Users } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoucherModal({ isOpen, onClose }: VoucherModalProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    description: '',
    type: 0, // 0: Percentage, 1: Fixed
    value: 0,
    expiryDays: 30,
    targetTier: '' // empty for all
  });
  const [isBulk, setIsBulk] = useState(true);

  const bulkMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/voucher/bulk-give', {
      ...data,
      targetTier: data.targetTier === '' ? null : parseInt(data.targetTier)
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('Campaign launched! Vouchers are being generated.');
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data || 'Failed to create vouchers.')
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.value <= 0) {
      toast.error('Value must be greater than 0');
      return;
    }
    await bulkMutation.mutateAsync(form);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-[#0f1115] border border-white/10 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 border border-yellow-500/20">
              <Gift size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold italic tracking-tight">Campaign Creation</h2>
              <p className="text-xs text-muted-foreground mt-0.5 uppercase tracking-widest font-bold">Reward Delivery Engine</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors text-muted-foreground hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Audience */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block flex items-center gap-2">
              <Target size={14} className="text-primary" /> Target Audience
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => setForm(f => ({ ...f, targetTier: '' }))}
                className={cn(
                  "py-3 rounded-xl border text-sm font-bold transition-all",
                  form.targetTier === '' ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/5 hover:bg-white/10 text-muted-foreground"
                )}
              >
                All Customers
              </button>
              <select 
                value={form.targetTier}
                onChange={e => setForm(f => ({ ...f, targetTier: e.target.value }))}
                className={cn(
                  "py-3 px-4 rounded-xl border text-sm font-bold bg-transparent outline-none transition-all",
                  form.targetTier !== '' ? "bg-primary/10 border-primary text-primary" : "bg-white/5 border-white/5 text-muted-foreground"
                )}
              >
                <option value="" disabled className="bg-[#0f1115]">Select Tier...</option>
                <option value="0" className="bg-[#0f1115]">Member Only</option>
                <option value="1" className="bg-[#0f1115]">Silver Only</option>
                <option value="2" className="bg-[#0f1115]">Gold Only</option>
                <option value="3" className="bg-[#0f1115]">Diamond Only</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Campaign Name / Description</label>
            <input 
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Summer Special 2026"
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500/50 outline-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Type */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Reward Type</label>
              <select 
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: parseInt(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500/50 outline-none transition-colors appearance-none"
              >
                <option value={0} className="bg-[#0f1115]">Percentage (%)</option>
                <option value={1} className="bg-[#0f1115]">Fixed Amount ($)</option>
              </select>
            </div>
            {/* Value */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Value</label>
              <input 
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: parseFloat(e.target.value) }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500/50 outline-none transition-colors font-mono"
              />
            </div>
          </div>

          {/* Expiry */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 block">Expiry (Days from now)</label>
            <input 
              type="number"
              value={form.expiryDays}
              onChange={e => setForm(f => ({ ...f, expiryDays: parseInt(e.target.value) }))}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-yellow-500/50 outline-none transition-colors font-mono"
            />
          </div>

          <button 
            type="submit"
            disabled={bulkMutation.isPending}
            className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-sm transition-all flex items-center justify-center gap-2 group shadow-[0_10px_30px_rgba(234,179,8,0.2)]"
          >
            {bulkMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
                LAUNCH CAMPAIGN
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
