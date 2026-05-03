import { NextRequest, NextResponse } from 'next/server';
import {
  getAvgTransactionTimeByDept,
  getAvgTransactionTimeByStaff,
  getStaffEfficiencyRating,
  getCrossValidationMetric,
} from '@/lib/ai/tools';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const departmentId = searchParams.get('departmentId');
  const daysBack = parseInt(searchParams.get('daysBack') || '7', 10);
  const metric = searchParams.get('metric');

  if (!departmentId) {
    return NextResponse.json(
      { error: 'departmentId is required' },
      { status: 400 },
    );
  }

  try {
    let result;

    switch (metric) {
      case 'avgTransactionTimeByDept':
        result = await getAvgTransactionTimeByDept.execute({
          departmentId,
          daysBack,
        });
        break;

      case 'avgTransactionTimeByStaff':
        result = await getAvgTransactionTimeByStaff.execute({
          departmentId,
          daysBack,
        });
        break;

      case 'staffEfficiencyRating':
        result = await getStaffEfficiencyRating.execute({
          departmentId,
          daysBack,
        });
        break;

      case 'crossValidationMetric':
        result = await getCrossValidationMetric.execute({
          departmentId,
          daysBack,
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid or missing metric parameter' },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 },
    );
  }
}
