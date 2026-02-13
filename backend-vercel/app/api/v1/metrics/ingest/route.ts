import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '@/lib/supabase';

type MetricPayload = {
  metric_name: string;
  value: number;
  ts?: string;
  labels?: Record<string, any>;
};

// POST /api/v1/metrics/ingest
// Body: { metrics: MetricPayload[] } or single MetricPayload
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServiceClient();
    const body = await req.json();
    
    // Support both single metric and batch
    const metrics: MetricPayload[] = Array.isArray(body.metrics) ? body.metrics : [body];
    
    // Validate metrics
    const validMetrics = metrics.filter(m => {
      if (!m.metric_name || typeof m.value !== 'number') {
        console.warn('Invalid metric:', m);
        return false;
      }
      return true;
    });

    if (validMetrics.length === 0) {
      return NextResponse.json(
        { error: 'No valid metrics provided' },
        { status: 400 }
      );
    }

    // Insert into metrics_timeseries
    const records = validMetrics.map(m => ({
      metric_name: m.metric_name,
      value: m.value,
      ts: m.ts || new Date().toISOString(),
      labels: m.labels || {}
    }));

    const { error } = await supabase
      .from('metrics_timeseries')
      .insert(records);

    if (error) {
      console.error('Error inserting metrics:', error);
      return NextResponse.json(
        { error: 'Failed to insert metrics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: validMetrics.length
    });
  } catch (error: any) {
    console.error('Error processing metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
