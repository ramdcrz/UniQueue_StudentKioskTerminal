import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn, formatDuration } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export interface StaffMetric {
  staffId: string;
  staffName?: string;
  staffPhotoURL?: string;
  avgTransactionTimeMinutes?: number;
  efficiencyRating?: number;
  speedScore?: number;
  csatScore?: number;
  csatRatedTickets?: number;
  completedTickets: number;
  [key: string]: any;
}

type SortField = 'staffId' | 'avgTransactionTimeMinutes' | 'efficiencyRating' | 'completedTickets';
type SortOrder = 'asc' | 'desc';

interface StaffComparisonGridProps {
  staffMetrics: StaffMetric[];
  title?: string;
  showMetrics?: ('avgTime' | 'efficiency' | 'csat' | 'tickets')[];
  maxRows?: number;
  className?: string;
}

export function StaffComparisonGrid({
  staffMetrics,
  title = 'Staff Performance',
  showMetrics = ['efficiency', 'avgTime', 'csat', 'tickets'],
  maxRows = 10,
  className,
}: StaffComparisonGridProps) {
  const [sortField, setSortField] = useState<SortField>('efficiencyRating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedMetrics = [...staffMetrics].sort((a, b) => {
    const aValue = a[sortField] ?? 0;
    const bValue = b[sortField] ?? 0;

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const displayedMetrics = sortedMetrics.slice(0, maxRows);

  const getEfficiencyBadgeColor = (rating: number) => {
    if (rating >= 80) return 'bg-green-100 text-green-800';
    if (rating >= 60) return 'bg-blue-100 text-blue-800';
    if (rating >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const SortableHeader = ({
    field,
    label,
    active,
  }: {
    field: SortField;
    label: string;
    active: boolean;
  }) => (
    <TableHead
      className="cursor-pointer select-none hover:bg-muted"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {active && (
          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  return (
    <Card className={cn("border-none glass rounded-[2.5rem]", className)}>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        {displayedMetrics.length === 0 ? (
          <EmptyState 
            icon="coffee"
            title="No performance data yet"
            description="Staff metrics will appear here once transactions are completed today."
            className="bg-transparent border-none shadow-none py-12"
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <SortableHeader
                    field="staffId"
                    label="Staff"
                    active={sortField === 'staffId'}
                  />

                  {showMetrics.includes('efficiency') && (
                    <SortableHeader
                      field="efficiencyRating"
                      label="Efficiency"
                      active={sortField === 'efficiencyRating'}
                    />
                  )}

                  {showMetrics.includes('avgTime') && (
                    <SortableHeader
                      field="avgTransactionTimeMinutes"
                      label="Avg Time"
                      active={sortField === 'avgTransactionTimeMinutes'}
                    />
                  )}

                  {showMetrics.includes('csat') && (
                    <TableHead>CSAT %</TableHead>
                  )}

                  {showMetrics.includes('tickets') && (
                    <SortableHeader
                      field="completedTickets"
                      label="Tickets"
                      active={sortField === 'completedTickets'}
                    />
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {displayedMetrics.map(staff => (
                  <TableRow key={staff.staffId} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarImage src={staff.staffPhotoURL || ''} alt={staff.staffName || staff.staffId} className="object-cover" />
                          <AvatarFallback className="bg-secondary/10 text-secondary text-[10px] font-black">{(staff.staffName || staff.staffId || '?').charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{staff.staffName || staff.staffId}</span>
                      </div>
                    </TableCell>

                    {showMetrics.includes('efficiency') && (
                      <TableCell>
                        {staff.efficiencyRating !== undefined && (
                          <Badge
                            className={cn(
                              'font-semibold',
                              getEfficiencyBadgeColor(staff.efficiencyRating),
                            )}
                            variant="outline"
                          >
                            {Math.round(staff.efficiencyRating)}
                          </Badge>
                        )}
                      </TableCell>
                    )}

                    {showMetrics.includes('avgTime') && (
                      <TableCell className="text-sm">
                        {staff.avgTransactionTimeMinutes !== undefined
                          ? formatDuration(staff.avgTransactionTimeMinutes)
                          : '—'}
                      </TableCell>
                    )}

                    {showMetrics.includes('csat') && (
                      <TableCell className="text-sm">
                        {staff.csatScore !== undefined
                          ? `${Math.round(staff.csatScore)}%`
                          : '—'}
                        {staff.csatRatedTickets !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            ({staff.csatRatedTickets})
                          </span>
                        )}
                      </TableCell>
                    )}

                    {showMetrics.includes('tickets') && (
                      <TableCell className="text-sm text-right">
                        {staff.completedTickets}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {staffMetrics.length > maxRows && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Showing {displayedMetrics.length} of {staffMetrics.length} staff
          </p>
        )}
      </CardContent>
    </Card>
  );
}
