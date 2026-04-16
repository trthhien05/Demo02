"use client";

import { motion } from "framer-motion";
import { ArrowRight, ChefHat, ShieldCheck, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-purple-500/15 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Content */}
      <main className="relative z-10 w-full max-w-5xl px-6 py-20 mx-auto text-center flex flex-col items-center">
        
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-medium text-primary/80"
        >
          <ShieldCheck size={16} />
          <span>VIP Restaurant Management System</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/50"
        >
          Elevate Your <br className="hidden md:block" />
          <span className="text-primary">Dining Experience</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="max-w-2xl text-lg text-muted-foreground mb-12"
        >
          The ultimate ProMax CRM System. Seamlessly manage tables, automate inventory, process payments, and boost customer loyalty with real-time analytics.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center"
        >
          <Link href="/admin/login">
            <button className="w-full sm:w-auto px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-2xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group shadow-lg shadow-primary/25">
              <span>Go to Admin Dashboard</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          
          <Link href="https://github.com/your-repo" target="_blank" rel="noreferrer">
            <button className="w-full sm:w-auto px-8 py-4 glass text-foreground font-semibold rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <ChefHat size={18} />
              <span>View Source</span>
            </button>
          </Link>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left w-full"
        >
          {[
            {
              title: "Real-time Operations",
              description: "Instant table status updates via SignalR.",
              icon: <UtensilsCrossed size={24} className="text-primary mb-4" />
            },
            {
              title: "Smart Inventory",
              description: "Automatic stock deduction based on recipes.",
              icon: <ChefHat size={24} className="text-blue-400 mb-4" />
            },
            {
              title: "Loyalty Program",
              description: "Tiered rewards and automated customer segments.",
              icon: <ShieldCheck size={24} className="text-purple-400 mb-4" />
            }
          ].map((feature, idx) => (
            <div key={idx} className="glass p-6 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
              {feature.icon}
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </motion.div>

      </main>
    </div>
  );
}
