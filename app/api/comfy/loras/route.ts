import { NextRequest, NextResponse } from 'next/server';

const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  try {
    // Try to get LoRAs from LoraLoader node
    const response = await fetch(
      `${COMFY_URL}/object_info/LoraLoader`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!response.ok) {
      // Try alternative endpoint names
      const altResponse = await fetch(
        `${COMFY_URL}/object_info/LoRALoader`,
        { signal: AbortSignal.timeout(5000) }
      );
      
      if (!altResponse.ok) {
        return NextResponse.json({ loras: [] });
      }
      
      const info = await altResponse.json();
      const loras: string[] = info?.LoRALoader?.input?.required?.lora_name?.[0] ?? [];
      return NextResponse.json({ loras });
    }

    const info = await response.json();
    const loras: string[] = info?.LoraLoader?.input?.required?.lora_name?.[0] ?? [];
    
    // Filter and sort LoRAs
    const filteredLoras = loras
      .filter(lora => lora.endsWith('.safetensors') || lora.endsWith('.ckpt'))
      .sort();

    return NextResponse.json({ loras: filteredLoras });

  } catch (error: any) {
    console.error('[ComfyUI Loras Error]', error);
    return NextResponse.json({ loras: [], error: error.message });
  }
}
