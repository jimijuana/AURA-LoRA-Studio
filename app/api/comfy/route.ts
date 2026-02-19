import { NextRequest, NextResponse } from 'next/server';

const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, ...payload } = body;

        let comfyResponse: Response;

        if (action === 'prompt') {
            comfyResponse = await fetch(`${COMFY_URL}/prompt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
        } else if (action === 'models') {
            // Get the list of installed checkpoint models
            comfyResponse = await fetch(`${COMFY_URL}/object_info/CheckpointLoaderSimple`, {
                signal: AbortSignal.timeout(5000)
            });
            if (!comfyResponse.ok) {
                return NextResponse.json({ models: [] });
            }
            const info = await comfyResponse.json();
            const models: string[] = info?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
            return NextResponse.json({ models });
        } else if (action === 'history') {
            const { prompt_id } = payload;
            comfyResponse = await fetch(`${COMFY_URL}/history/${prompt_id}`);
        } else if (action === 'view') {
            const { filename, subfolder, type } = payload;
            const url = `${COMFY_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${encodeURIComponent(type || 'output')}`;
            comfyResponse = await fetch(url);

            if (!comfyResponse.ok) {
                return NextResponse.json({ error: 'Failed to fetch image from ComfyUI' }, { status: comfyResponse.status });
            }

            // Return image as base64
            const imageBuffer = await comfyResponse.arrayBuffer();
            const base64 = Buffer.from(imageBuffer).toString('base64');
            const contentType = comfyResponse.headers.get('content-type') || 'image/png';
            return NextResponse.json({ dataUrl: `data:${contentType};base64,${base64}` });
        } else if (action === 'check') {
            // Health check
            try {
                comfyResponse = await fetch(`${COMFY_URL}/system_stats`, { signal: AbortSignal.timeout(3000) });
                if (comfyResponse.ok) {
                    return NextResponse.json({ connected: true, url: COMFY_URL });
                }
                return NextResponse.json({ connected: false, url: COMFY_URL, error: `Status ${comfyResponse.status}` });
            } catch (err: any) {
                return NextResponse.json({ connected: false, url: COMFY_URL, error: err.message });
            }
        } else {
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
        }

        if (!comfyResponse.ok) {
            const errorText = await comfyResponse.text();
            return NextResponse.json({ error: errorText || comfyResponse.statusText }, { status: comfyResponse.status });
        }

        const data = await comfyResponse.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error('[ComfyUI Proxy Error]', error);
        return NextResponse.json(
            { error: `Cannot connect to ComfyUI at ${COMFY_URL}. Make sure ComfyUI is running.` },
            { status: 503 }
        );
    }
}
