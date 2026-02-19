import { NextRequest, NextResponse } from 'next/server';

const COMFY_URL = process.env.COMFY_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to ComfyUI's upload/image endpoint
    const uploadFormData = new FormData();
    uploadFormData.append('image', new Blob([buffer], { type: image.type }), image.name);

    const response = await fetch(`${COMFY_URL}/upload/image`, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Upload failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true, 
      filename: data.name,
      subfolder: data.subfolder || ''
    });

  } catch (error: any) {
    console.error('[ComfyUI Upload Error]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    );
  }
}
