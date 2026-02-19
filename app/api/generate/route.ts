import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';

if (!API_KEY) {
  console.error("AURA_API: No Google API key found in GOOGLE_API_KEY or NEXT_PUBLIC_GOOGLE_API_KEY");
}

const genAI = new GoogleGenerativeAI(API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, images = [], temperature = 0.7, seed } = body;

    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
      );
    }

    // List of models to try in order of preference
    const modelsToTry = [
      "gemini-3-pro-image-preview", // Experimental primary
      "gemini-1.5-pro",            // Reliable high-quality fallback
      "gemini-1.5-flash"           // Speed fallback
    ];

    let lastError: any = null;

    for (const modelId of modelsToTry) {
      try {
        console.log(`AURA: Attempting generation with ${modelId}...`);
        const model = genAI.getGenerativeModel({
          model: modelId,
          generationConfig: { temperature }
        });

        const seedInstruction = seed !== undefined
          ? `\n\n[IMPORTANT: Use seed ${seed} for reproducibility. Generate consistent output based on this seed.]`
          : '';
        const finalPrompt = prompt + seedInstruction;

        let result;
        if (images.length > 0) {
          const imageParts = images.map((imageData: string) => {
            const base64Image = imageData.split(',')[1];
            const mimeType = imageData.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
            return { inlineData: { data: base64Image, mimeType } };
          });
          result = await model.generateContent([finalPrompt, ...imageParts]);
        } else {
          result = await model.generateContent(finalPrompt);
        }

        const response = await result.response;

        // Handle successful response
        const text = response.text();
        if (text) {
          return NextResponse.json({ content: text, type: 'text', model: modelId });
        }

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              return NextResponse.json({
                content: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`,
                type: 'image',
                model: modelId
              });
            }
          }
        }

        // If we got here but no text/image, mark as no content and continue to next model
        console.warn(`${modelId} returned empty response.`);
        continue;

      } catch (error: any) {
        lastError = error;
        console.error(`${modelId} failed:`, error.message);

        // Only retry if it's a 503 (busy) or 429 (rate limit)
        // If it's a 400 (bad prompt) or 401 (bad key), stop immediately
        const status = error.status || (error.message?.includes('503') ? 503 : 0);
        if (status !== 503 && status !== 429 && !error.message?.includes('high demand')) {
          break;
        }
        console.log(`Retrying with next model due to service availability issue...`);
      }
    }

    // If all models failed
    const errorMsg = lastError?.message || 'Failed to generate content';
    const status = lastError?.status || (errorMsg.includes('503') ? 503 : 500);

    return NextResponse.json(
      { error: errorMsg.includes("fetch") || status === 503 ? "Gemini is currently overloaded. Please try again." : errorMsg },
      { status: status }
    );
  } catch (globalError: any) {
    console.error("Critical Gemini API Error:", globalError);
    return NextResponse.json(
      { error: globalError.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
