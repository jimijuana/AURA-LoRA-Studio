import { NextRequest, NextResponse } from 'next/server';

const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  try {
    // Fetch available ControlNet models
    const response = await fetch(
      `${COMFY_URL}/object_info/ControlNetLoader`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      return NextResponse.json({ controlNets: [] });
    }

    const info = await response.json();
    const controlNets: string[] = info?.ControlNetLoader?.input?.required?.control_net_name?.[0] ?? [];
    
    // Filter for common ControlNet types
    const filteredControlNets = controlNets
      .filter((cn: string) => 
        cn.includes('openpose') || 
        cn.includes('canny') || 
        cn.includes('depth') || 
        cn.includes('lineart') ||
        cn.includes('softedge') ||
        cn.includes('scribble')
      )
      .sort();

    return NextResponse.json({ controlNets: filteredControlNets });

  } catch (error: any) {
    console.error('[ComfyUI ControlNet Error]', error);
    return NextResponse.json({ controlNets: [], error: error.message });
  }
}
