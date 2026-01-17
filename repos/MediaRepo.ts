import { apiFetch } from '@/lib/api';

export interface AnalyzeScreenshotResponse {
  vision_summary?: string;
  ocr_text?: string;
  [key: string]: any;
}

export const MediaRepo = {
  async analyzeScreenshot(params: {
    base64Data: string;
    mimeType: string;
    personId?: string;
  }): Promise<AnalyzeScreenshotResponse> {
    const { base64Data, mimeType, personId } = params;
    const res = await apiFetch('/api/v1/agent/analyze/screenshot', {
      method: 'POST',
      requireAuth: true,
      body: JSON.stringify({
        // Backend expects either image_url or image_base64
        image_base64: base64Data,
        mime_type: mimeType,
        person_id: personId,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Screenshot analysis failed (${res.status}): ${text}`);
    }
    return (await res.json()) as AnalyzeScreenshotResponse;
  },
};
