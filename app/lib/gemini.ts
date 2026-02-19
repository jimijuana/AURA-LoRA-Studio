// Client-side service that calls our server-side API
// This keeps the API key secure on the server

export async function generateContent(
  prompt: string,
  images: (File | string)[] = [],
  temperature: number = 0.7,
  seed?: number
): Promise<string> {
  try {
    // Convert any File objects to base64 data URLs
    const processedImages = await Promise.all(images.map(async (img) => {
      if (typeof img === 'string') return img;

      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(img);
      });
    }));

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        images: processedImages,
        temperature,
        seed
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.type === 'image') {
      return data.content; // Returns data URL for images
    } else {
      return data.content; // Returns text
    }

  } catch (error: any) {
    console.error("Generate API Error:", error);

    if (error.message && error.message.includes("fetch")) {
      return `Connection Error: ${error.message}. Please check your internet connection.`;
    }

    throw error;
  }
}
