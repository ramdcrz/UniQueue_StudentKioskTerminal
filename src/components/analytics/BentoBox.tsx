import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface BentoBoxItem {
  id: string;
  span?: 'sm' | 'md' | 'lg'; // sm = 1 unit, md = 2 units, lg = 3+ units
  children: React.ReactNode;
}

interface BentoBoxProps {
  items: BentoBoxItem[];
  className?: string;
}

export function BentoBox({ items, className }: BentoBoxProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4',
        'sm:grid-cols-2',
        'lg:grid-cols-3',
        'xl:grid-cols-4',
        className,
      )}
    >
      {items.map(item => (
        <div
          key={item.id}
          className={cn(
            'col-span-1',
            // Adjust span based on screen size
            item.span === 'md' && 'sm:col-span-2 lg:col-span-2',
            item.span === 'lg' && 'sm:col-span-2 lg:col-span-3 xl:col-span-2',
          )}
        >
          {item.children}
        </div>
      ))}
    </div>
  );
}
