import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface StaffMetric {
  staffId: string;
  staffName?: string;
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
    <Card className="border-none glass rounded-[2.5rem]">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>

      <CardContent>
        {displayedMetrics.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No staff data available
          </div>
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
                      {staff.staffName || staff.staffId}
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
                          ? `${Number(staff.avgTransactionTimeMinutes).toFixed(1)}m`
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
