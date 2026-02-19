import { generateContent as generateWithGemini } from './gemini';
import { generateWithComfy, ComfyOptions } from './comfyProvider';

export type ImageProvider = 'gemini' | 'comfyui';

export interface GenerationOptions extends ComfyOptions {
    provider: ImageProvider;
    images?: File[];
}

// Helper function to convert File to base64 data URL
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function generateImage(options: GenerationOptions): Promise<string> {
    const { provider, prompt, images, temperature, seed, ckptName, ...rest } = options;

    if (provider === 'comfyui') {
        return generateWithComfy({
            prompt,
            temperature,
            seed,
            ckptName,
            ...rest
        });
    } else {
        // Convert File[] to base64 strings for Gemini
        let imageDataUrls: string[] = [];
        if (images && images.length > 0) {
            imageDataUrls = await Promise.all(images.map(file => fileToBase64(file)));
        }
        
        return generateWithGemini(prompt, imageDataUrls, temperature, seed);
    }
}
