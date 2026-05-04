"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Coffee, CheckCircle2, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: 'coffee' | 'check' | LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ 
  icon = 'check', 
  title, 
  description, 
  className 
}: EmptyStateProps) {
  const IconComponent = typeof icon === 'string' 
    ? (icon === 'coffee' ? Coffee : CheckCircle2) 
    : icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-4 rounded-[2rem] bg-white/40 border border-white/60 shadow-inner",
        className
      )}
    >
      <div className="p-4 bg-primary/5 rounded-full">
        <IconComponent size={48} className="text-primary/30" />
      </div>
      <div className="space-y-1">
        <h3 className="text-xl font-black text-secondary uppercase tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
    </motion.div>
  );
}
