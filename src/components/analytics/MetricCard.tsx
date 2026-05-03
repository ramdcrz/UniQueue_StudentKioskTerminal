import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: number; // Percentage change
  trendLabel?: string;
  details?: { label: string; value: string | number }[];
  isHighlighted?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  unit,
  icon,
  trend,
  trendLabel,
  details,
  isHighlighted = false,
  className,
}: MetricCardProps) {
  const trendIsPositive = trend !== undefined && trend > 0;
  const trendIsNegative = trend !== undefined && trend < 0;

  return (
    <Card
      className={cn(
        'border-none glass rounded-[2.5rem]',
        isHighlighted && 'bg-primary/10 border-primary/30',
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {icon && <div className="text-2xl text-primary">{icon}</div>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Main Value */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-primary">{value}</span>
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
        </div>

        {/* Trend Indicator */}
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trendIsPositive && 'text-green-600',
              trendIsNegative && 'text-red-600',
              !trendIsPositive && !trendIsNegative && 'text-muted-foreground',
            )}
          >
            <span>
              {trendIsPositive && '↑'}
              {trendIsNegative && '↓'}
              {!trendIsPositive && !trendIsNegative && '—'}
            </span>
            <span>
              {Math.abs(trend)}% {trendLabel ? ` ${trendLabel}` : ''}
            </span>
          </div>
        )}

        {/* Additional Details */}
        {details && details.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            {details.map((detail, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{detail.label}</span>
                <span className="font-medium text-foreground">{detail.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
