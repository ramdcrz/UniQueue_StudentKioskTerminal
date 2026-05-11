import { useEffect, useState } from 'react';

export interface AnalyticsData {
  avgTransactionTime: {
    byDept: Array<{
      departmentId: string;
      deptName: string;
      avgTimeMinutes: number;
      sampleCount: number;
    }>;
    byStaff: Array<{
      staffId: string;
      staffName: string;
      staffPhotoURL?: string;
      avgTimeMinutes: number;
      completedTickets: number;
    }>;
  };
  efficiency: Array<{
    staffId: string;
    staffName: string;
    staffPhotoURL?: string;
    speedScore: number;
    csatScore: number;
    efficiencyRating: number;
    csatRatedTickets: number;
    completedTickets: number;
    avgTransactionTimeMinutes: number;
  }>;
  crossValidation: {
    registrarCompletedCount: number;
    successfulConversions: number;
    conversionRate: number;
  };
}

export function useAnalytics(departmentId: string, daysBack: 1 | 7 | 30) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all metrics in parallel
        const [avgTimeByDept, avgTimeByStaff, efficiency, crossValidation] =
          await Promise.all([
            fetch(
              `/api/analytics?departmentId=${departmentId}&daysBack=${daysBack}&metric=avgTransactionTimeByDept`,
            ).then(res => res.json()),
            fetch(
              `/api/analytics?departmentId=${departmentId}&daysBack=${daysBack}&metric=avgTransactionTimeByStaff`,
            ).then(res => res.json()),
            fetch(
              `/api/analytics?departmentId=${departmentId}&daysBack=${daysBack}&metric=staffEfficiencyRating`,
            ).then(res => res.json()),
            fetch(
              `/api/analytics?departmentId=${departmentId}&daysBack=${daysBack}&metric=crossValidationMetric`,
            ).then(res => res.json()),
          ]);

        setData({
          avgTransactionTime: {
            byDept: avgTimeByDept.staffStats || [],
            byStaff: avgTimeByStaff.staffStats || [],
          },
          efficiency: efficiency.staffStats || [],
          crossValidation: {
            registrarCompletedCount: crossValidation.registrarCompletedCount || 0,
            successfulConversions: crossValidation.successfulConversions || 0,
            conversionRate: crossValidation.conversionRate || 0,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch analytics'));
      } finally {
        setIsLoading(false);
      }
    };

    if (departmentId) {
      fetchAnalytics();
    }
  }, [departmentId, daysBack]);

  return { data, isLoading, error };
}
