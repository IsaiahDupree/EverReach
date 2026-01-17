import { NextRequest } from 'next/server';
import { options, unauthorized, serverError } from "@/lib/cors";
import { getUser } from "@/lib/auth";
import { getClientOrThrow } from "@/lib/supabase";

export const runtime = "edge";

export function OPTIONS(req: Request){ return options(req); }

/**
 * POST /v1/export/ml-dump
 * 
 * Exports ML-ready dataset as CSV and uploads to Supabase storage.
 * Requires admin/service role authentication.
 * 
 * Query Parameters:
 * - days: Number of days to export (default: 30)
 * - format: csv|json (default: csv)
 * 
 * Returns:
 * - Public URL to download the export
 */
export async function POST(req: NextRequest){
  const user = await getUser(req);
  
  // TODO: Add admin role check
  // For now, require authentication
  if (!user) {
    return unauthorized("Admin access required", req);
  }

  const searchParams = req.nextUrl.searchParams;
  const days = parseInt(searchParams.get('days') || '30', 10);
  const format = searchParams.get('format') || 'csv';

  if (days < 1 || days > 365) {
    return new Response(JSON.stringify({ error: 'days must be between 1 and 365' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = getClientOrThrow(req);

  try {
    // 1) Fetch ML data from view
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: mlData, error: fetchError } = await supabase
      .rpc('ml_dump_date_range', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

    if (fetchError) {
      console.error('[ML Export] Fetch error:', fetchError);
      return serverError(`Failed to fetch ML data: ${fetchError.message}`, req);
    }

    if (!mlData || mlData.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No data found for specified date range',
        count: 0,
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2) Convert to CSV or JSON
    let fileContent: string;
    let contentType: string;
    let fileExtension: string;

    if (format === 'json') {
      fileContent = JSON.stringify(mlData, null, 2);
      contentType = 'application/json';
      fileExtension = 'json';
    } else {
      // CSV format
      const headers = Object.keys(mlData[0]).join(',');
      const rows = mlData.map((row: any) => 
        Object.values(row).map(val => {
          // Escape commas and quotes in CSV
          if (val === null) return '';
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      );
      fileContent = [headers, ...rows].join('\n');
      contentType = 'text/csv';
      fileExtension = 'csv';
    }

    // 3) Upload to Supabase storage (ml-datasets bucket)
    const fileName = `ml_export_${days}d_${Date.now()}.${fileExtension}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('ml-datasets')
      .upload(fileName, fileContent, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[ML Export] Upload error:', uploadError);
      return serverError(`Failed to upload export: ${uploadError.message}`, req);
    }

    // 4) Get public URL
    const { data: urlData } = supabase.storage
      .from('ml-datasets')
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      success: true,
      url: urlData.publicUrl,
      fileName,
      recordCount: mlData.length,
      format,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[ML Export] Error:', error);
    return serverError(`Internal error: ${error.message}`, req);
  }
}
