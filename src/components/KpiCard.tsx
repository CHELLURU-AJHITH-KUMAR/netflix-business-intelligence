"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: string;
  delay?: number;
}

export default function KpiCard({ title, value, icon: Icon, description, delay = 0 }: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="glass-card p-6 flex items-start justify-between relative group overflow-hidden"
    >
      {/* Background glow hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 to-red-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="space-y-2 z-10">
        <span className="text-xs font-semibold tracking-wider text-gray-500 uppercase">{title}</span>
        <h3 className="text-3xl font-bold tracking-tight text-white group-hover:text-red-500 transition-colors duration-300">
          {value}
        </h3>
        <p className="text-xs text-gray-400 font-light">{description}</p>
      </div>

      <div className="p-3 bg-white/5 rounded-lg border border-white/10 group-hover:border-red-600/30 group-hover:bg-[#e50914]/10 transition-all duration-300 z-10">
        <Icon className="w-5 h-5 text-gray-400 group-hover:text-[#e50914] group-hover:scale-110 transition-all duration-300" />
      </div>
    </motion.div>
  );
}
