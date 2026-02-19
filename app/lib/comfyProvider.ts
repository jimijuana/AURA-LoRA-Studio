export interface ComfyOptions {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    cfg?: number;
    samplerName?: string;
    scheduler?: string;
    denoise?: number;
    seed?: number;
    stylePreset?: string;
    temperature?: number;
    ckptName?: string;
    images?: File[];
    loras?: { name: string; strength: number }[];
    batchCount?: number;
    controlNets?: { model: string; image: File; strength: number }[];
}

export interface UploadedImage {
    filename: string;
    subfolder: string;
}

// All ComfyUI calls go through the Next.js API proxy to avoid CORS issues
const PROXY = '/api/comfy';

async function comfyFetch(action: string, payload: Record<string, unknown>): Promise<Response> {
    return fetch(PROXY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
    });
}

/** Fetch the list of installed checkpoint models from ComfyUI */
export async function getComfyModels(): Promise<string[]> {
    try {
        const res = await comfyFetch('models', {});
        const { models } = await res.json();
        return models || [];
    } catch {
        return [];
    }
}

/** Fetch the list of installed LoRA models from ComfyUI */
export async function getComfyLoras(): Promise<string[]> {
    try {
        const res = await fetch('/api/comfy/loras');
        const { loras } = await res.json();
        return loras || [];
    } catch {
        return [];
    }
}

/** Fetch the list of installed ControlNet models from ComfyUI */
export async function getComfyControlNets(): Promise<string[]> {
    try {
        const res = await fetch('/api/comfy/controlnet');
        const { controlNets } = await res.json();
        return controlNets || [];
    } catch {
        return [];
    }
}

/** Upload an image to ComfyUI for use in workflows */
export async function uploadImageToComfy(file: File): Promise<UploadedImage | null> {
    try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch('/api/comfy/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            throw new Error('Failed to upload image');
        }

        const data = await res.json();
        return {
            filename: data.filename,
            subfolder: data.subfolder || ''
        };
    } catch (error) {
        console.error('Image upload error:', error);
        return null;
    }
}

/** Check if ComfyUI is reachable. Returns { connected, url, error? } */
export async function checkComfyConnection(): Promise<{ connected: boolean; url: string; error?: string }> {
    const res = await comfyFetch('check', {});
    return res.json();
}

export async function generateWithComfy(options: ComfyOptions): Promise<string> {
    const {
        prompt,
        negativePrompt = 'low quality, blurry, distorted',
        width = 512,
        height = 768,
        steps = 25,
        cfg = 7,
        samplerName = 'dpmpp_2m',
        scheduler = 'karras',
        denoise = 1,
        seed = Math.floor(Math.random() * 1000000000),
        ckptName = '',
        images = [],
        loras = [],
        batchCount = 1,
        controlNets = []
    } = options;

    const isZImage = ckptName.toLowerCase().includes('z_image');
    const isTurbo = ckptName.toLowerCase().includes('turbo');
    const hasImages = images.length > 0;
    const hasControlNets = controlNets.length > 0;

    // Auto-adjust for Turbo models
    const finalSteps = isTurbo ? 8 : steps;
    const finalCfg = isTurbo ? 1.5 : cfg;

    // Upload reference images if provided
    let uploadedImages: UploadedImage[] = [];
    if (hasImages) {
        const uploadResults = await Promise.all(
            images.map(file => uploadImageToComfy(file))
        );
        uploadedImages = uploadResults.filter((img): img is UploadedImage => img !== null);
    }

    // Upload ControlNet images if provided
    let uploadedControlNets: { model: string; image: UploadedImage; strength: number }[] = [];
    if (hasControlNets) {
        const controlNetUploads = await Promise.all(
            controlNets.map(async (cn) => {
                const uploaded = await uploadImageToComfy(cn.image);
                if (uploaded) {
                    return { model: cn.model, image: uploaded, strength: cn.strength };
                }
                return null;
            })
        );
        uploadedControlNets = controlNetUploads.filter((cn): cn is { model: string; image: UploadedImage; strength: number } => cn !== null);
    }

    // Build workflow based on configuration
    let workflow: any;

    if (isZImage) {
        // Specialized Workflow for Z-Image (Lumina-2)
        workflow = buildZImageWorkflow({
            prompt, negativePrompt, width, height, seed, ckptName,
            steps: finalSteps, cfg: finalCfg
        });
    } else if (uploadedImages.length > 0 && !hasControlNets) {
        // IP-Adapter Workflow with reference images
        workflow = buildIPAdapterWorkflow({
            prompt, negativePrompt, width, height, finalSteps, finalCfg,
            samplerName, scheduler, denoise, seed, ckptName, loras,
            uploadedImages, batchCount
        });
    } else if (hasControlNets) {
        // ControlNet Workflow
        workflow = buildControlNetWorkflow({
            prompt, negativePrompt, width, height, finalSteps, finalCfg,
            samplerName, scheduler, denoise, seed, ckptName, loras,
            uploadedImages, uploadedControlNets, batchCount
        });
    } else {
        // Standard workflow with optional LoRAs
        workflow = buildStandardWorkflow({
            prompt, negativePrompt, width, height, finalSteps, finalCfg,
            samplerName, scheduler, denoise, seed, ckptName, loras, batchCount
        });
    }

    const clientId = Math.random().toString(36).substring(7);

    // 1. Submit the prompt via proxy
    const submitRes = await comfyFetch('prompt', { prompt: workflow, client_id: clientId });

    if (!submitRes.ok) {
        const errBody = await submitRes.json().catch(() => ({ error: submitRes.statusText }));
        throw new Error(
            errBody.error || `ComfyUI returned status ${submitRes.status}. Is ComfyUI running?`
        );
    }

    const { prompt_id } = await submitRes.json();

    // 2. Poll for result
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const MAX_ATTEMPTS = 180; // 3 minutes for complex workflows

        const checkStatus = async () => {
            attempts++;
            if (attempts > MAX_ATTEMPTS) {
                reject(new Error('ComfyUI generation timed out after 3 minutes.'));
                return;
            }

            try {
                const historyRes = await comfyFetch('history', { prompt_id });
                const history = await historyRes.json();

                if (history[prompt_id]) {
                    const outputs = history[prompt_id].outputs;
                    for (const node in outputs) {
                        if (outputs[node].images && outputs[node].images.length > 0) {
                            // Get the first generated image
                            const image = outputs[node].images[0];

                            // Fetch image via proxy
                            const imgRes = await comfyFetch('view', {
                                filename: image.filename,
                                subfolder: image.subfolder || '',
                                type: image.type || 'output',
                            });

                            const { dataUrl } = await imgRes.json();
                            resolve(dataUrl);
                            return;
                        }
                    }
                }

                // Not ready yet — poll again
                setTimeout(checkStatus, 1000);
            } catch (err) {
                reject(err);
            }
        };

        checkStatus();
    });
}

// Build standard workflow with LoRA support
function buildStandardWorkflow(params: any): any {
    const { prompt, negativePrompt, width, height, steps, cfg, samplerName,
        scheduler, denoise, seed, ckptName, loras, batchCount } = params;

    const workflow: any = {
        "1": {
            "inputs": { "ckpt_name": ckptName },
            "class_type": "CheckpointLoaderSimple"
        },
        "2": {
            "inputs": {
                "text": prompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "3": {
            "inputs": {
                "text": negativePrompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "4": {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": batchCount
            },
            "class_type": "EmptyLatentImage"
        },
        "5": {
            "inputs": {
                "seed": seed,
                "steps": steps,
                "cfg": cfg,
                "sampler_name": samplerName,
                "scheduler": scheduler,
                "denoise": denoise,
                "model": ["1", 0],
                "positive": ["2", 0],
                "negative": ["3", 0],
                "latent_image": ["4", 0]
            },
            "class_type": "KSampler"
        },
        "6": {
            "inputs": {
                "samples": ["5", 0],
                "vae": ["1", 2]
            },
            "class_type": "VAEDecode"
        },
        "7": {
            "inputs": {
                "filename_prefix": "Aura_Studio",
                "images": ["6", 0]
            },
            "class_type": "SaveImage"
        }
    };

    // Add LoRA nodes if specified
    if (loras && loras.length > 0) {
        let currentModelNode = "1";
        let currentClipNode = "1";

        loras.forEach((lora: any, index: number) => {
            const loraNodeId = (10 + index).toString();

            workflow[loraNodeId] = {
                "inputs": {
                    "lora_name": lora.name,
                    "strength_model": lora.strength,
                    "strength_clip": lora.strength,
                    "model": [currentModelNode, 0],
                    "clip": [currentClipNode, 1]
                },
                "class_type": "LoraLoader"
            };

            currentModelNode = loraNodeId;
            currentClipNode = loraNodeId;
        });

        // Update sampler to use the last LoRA's outputs
        workflow["5"].inputs.model = [currentModelNode, 0];
        workflow["2"].inputs.clip = [currentClipNode, 1];
        workflow["3"].inputs.clip = [currentClipNode, 1];
    }

    return workflow;
}

// Build IP-Adapter workflow with reference images
function buildIPAdapterWorkflow(params: any): any {
    const { prompt, negativePrompt, width, height, steps, cfg, samplerName,
        scheduler, denoise, seed, ckptName, loras, uploadedImages, batchCount } = params;

    const workflow: any = {
        "1": {
            "inputs": { "ckpt_name": ckptName },
            "class_type": "CheckpointLoaderSimple"
        },
        "2": {
            "inputs": {
                "text": prompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "3": {
            "inputs": {
                "text": negativePrompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "4": {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": batchCount
            },
            "class_type": "EmptyLatentImage"
        },
        "20": {
            "inputs": {
                "ipadapter_file": "ip-adapter_sd15.safetensors"
            },
            "class_type": "IPAdapterModelLoader"
        },
        "21": {
            "inputs": {
                "clip_name": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
            },
            "class_type": "CLIPVisionLoader"
        }
    };

    // Load reference images
    uploadedImages.forEach((img: UploadedImage, index: number) => {
        const loadNodeId = (30 + index).toString();
        workflow[loadNodeId] = {
            "inputs": {
                "image": img.filename,
                "upload": "image"
            },
            "class_type": "LoadImage"
        };

        // Encode image with CLIP Vision
        const encodeNodeId = (40 + index).toString();
        workflow[encodeNodeId] = {
            "inputs": {
                "clip_vision": ["21", 0],
                "image": [loadNodeId, 0]
            },
            "class_type": "CLIPVisionEncode"
        };

        // Apply IP-Adapter
        const applyNodeId = (50 + index).toString();
        const prevModelNode = index === 0 ? "1" : (50 + index - 1).toString();

        workflow[applyNodeId] = {
            "inputs": {
                "ipadapter": ["20", 0],
                "model": [prevModelNode, 0],
                "image": [encodeNodeId, 0],
                "weight": 0.8,
                "noise": 0.0,
                "weight_type": "original",
                "start_at": 0.0,
                "end_at": 1.0,
                "unfold_batch": false
            },
            "class_type": "IPAdapterApply"
        };
    });

    // KSampler using the last IP-Adapter output
    const lastIPAdapterNode = uploadedImages.length > 0
        ? (50 + uploadedImages.length - 1).toString()
        : "1";

    workflow["5"] = {
        "inputs": {
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": samplerName,
            "scheduler": scheduler,
            "denoise": denoise,
            "model": [lastIPAdapterNode, 0],
            "positive": ["2", 0],
            "negative": ["3", 0],
            "latent_image": ["4", 0]
        },
        "class_type": "KSampler"
    };

    workflow["6"] = {
        "inputs": {
            "samples": ["5", 0],
            "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
    };

    workflow["7"] = {
        "inputs": {
            "filename_prefix": "Aura_Studio_IPA",
            "images": ["6", 0]
        },
        "class_type": "SaveImage"
    };

    // Add LoRA nodes if specified
    if (loras && loras.length > 0) {
        let currentModelNode = "1";
        let currentClipNode = "1";

        loras.forEach((lora: any, index: number) => {
            const loraNodeId = (10 + index).toString();

            workflow[loraNodeId] = {
                "inputs": {
                    "lora_name": lora.name,
                    "strength_model": lora.strength,
                    "strength_clip": lora.strength,
                    "model": [currentModelNode, 0],
                    "clip": [currentClipNode, 1]
                },
                "class_type": "LoraLoader"
            };

            currentModelNode = loraNodeId;
            currentClipNode = loraNodeId;
        });

        // Update connections
        workflow["2"].inputs.clip = [currentClipNode, 1];
        workflow["3"].inputs.clip = [currentClipNode, 1];

        // Update first IP-Adapter or KSampler to use LoRA'd model
        if (uploadedImages.length > 0) {
            workflow["50"].inputs.model = [currentModelNode, 0];
        } else {
            workflow["5"].inputs.model = [currentModelNode, 0];
        }
    }

    return workflow;
}

// Build Z-Image (Lumina-2) workflow
function buildZImageWorkflow(params: any): any {
    const { prompt, negativePrompt, width, height, seed, ckptName, steps, cfg } = params;

    // Lumina-2 (Z-Image) prefers descriptive prompts without structured tags.
    // We attempt to extract the main prompt if it has AURA tags.
    const cleanPrompt = prompt.includes('[CREATIVE DESCRIPTION]')
        ? prompt.split('[CREATIVE DESCRIPTION]\n')[1]?.split('\n')[0] || prompt
        : prompt;

    return {
        "1": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": ckptName,
                "weight_dtype": "default"
            }
        },
        "2": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": "qwen_3_4b.safetensors",
                "type": "lumina_2"
            }
        },
        "3": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": "ae.safetensors"
            }
        },
        "4": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": steps || 8,
                "cfg": cfg || 1.0,
                "sampler_name": "euler",
                "scheduler": "simple",
                "denoise": 1.0,
                "model": ["1", 0],
                "positive": ["5", 0],
                "negative": ["6", 0],
                "latent_image": ["7", 0]
            }
        },
        "5": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": cleanPrompt,
                "clip": ["2", 0]
            }
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negativePrompt || "low quality, blurry, distorted",
                "clip": ["2", 0]
            }
        },
        "7": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": 1
            }
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["4", 0],
                "vae": ["3", 0]
            }
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "Z_Image",
                "images": ["8", 0]
            }
        }
    };
}

// Build ControlNet workflow
function buildControlNetWorkflow(params: any): any {
    const { prompt, negativePrompt, width, height, steps, cfg, samplerName,
        scheduler, denoise, seed, ckptName, loras, uploadedImages,
        uploadedControlNets, batchCount } = params;

    const workflow: any = {
        "1": {
            "inputs": { "ckpt_name": ckptName },
            "class_type": "CheckpointLoaderSimple"
        },
        "2": {
            "inputs": {
                "text": prompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "3": {
            "inputs": {
                "text": negativePrompt,
                "clip": ["1", 1]
            },
            "class_type": "CLIPTextEncode"
        },
        "4": {
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": batchCount
            },
            "class_type": "EmptyLatentImage"
        }
    };

    // Load ControlNet reference images
    uploadedControlNets.forEach((cn: any, index: number) => {
        const loadNodeId = (60 + index).toString();
        workflow[loadNodeId] = {
            "inputs": {
                "image": cn.image.filename,
                "upload": "image"
            },
            "class_type": "LoadImage"
        };

        // Load ControlNet model
        const cnLoaderNodeId = (70 + index).toString();
        workflow[cnLoaderNodeId] = {
            "inputs": {
                "control_net_name": cn.model
            },
            "class_type": "ControlNetLoader"
        };

        // Apply ControlNet
        const cnApplyNodeId = (80 + index).toString();
        const prevPositiveNode = index === 0 ? "2" : (80 + index - 1).toString();

        workflow[cnApplyNodeId] = {
            "inputs": {
                "conditioning": [prevPositiveNode, 0],
                "control_net": [cnLoaderNodeId, 0],
                "image": [loadNodeId, 0],
                "strength": cn.strength
            },
            "class_type": "ControlNetApply"
        };
    });

    // KSampler using the last ControlNet output
    const lastControlNetNode = uploadedControlNets.length > 0
        ? (80 + uploadedControlNets.length - 1).toString()
        : "2";

    workflow["5"] = {
        "inputs": {
            "seed": seed,
            "steps": steps,
            "cfg": cfg,
            "sampler_name": samplerName,
            "scheduler": scheduler,
            "denoise": denoise,
            "model": ["1", 0],
            "positive": [lastControlNetNode, 0],
            "negative": ["3", 0],
            "latent_image": ["4", 0]
        },
        "class_type": "KSampler"
    };

    workflow["6"] = {
        "inputs": {
            "samples": ["5", 0],
            "vae": ["1", 2]
        },
        "class_type": "VAEDecode"
    };

    workflow["7"] = {
        "inputs": {
            "filename_prefix": "Aura_Studio_CN",
            "images": ["6", 0]
        },
        "class_type": "SaveImage"
    };

    // Add IP-Adapter if reference images provided
    if (uploadedImages && uploadedImages.length > 0) {
        workflow["20"] = {
            "inputs": {
                "ipadapter_file": "ip-adapter_sd15.safetensors"
            },
            "class_type": "IPAdapterModelLoader"
        };

        workflow["21"] = {
            "inputs": {
                "clip_name": "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
            },
            "class_type": "CLIPVisionLoader"
        };

        // Load reference images for IP-Adapter
        uploadedImages.forEach((img: any, index: number) => {
            const loadNodeId = (30 + index).toString();
            workflow[loadNodeId] = {
                "inputs": {
                    "image": img.filename,
                    "upload": "image"
                },
                "class_type": "LoadImage"
            };

            const encodeNodeId = (40 + index).toString();
            workflow[encodeNodeId] = {
                "inputs": {
                    "clip_vision": ["21", 0],
                    "image": [loadNodeId, 0]
                },
                "class_type": "CLIPVisionEncode"
            };

            const applyNodeId = (50 + index).toString();
            const prevModelNode = index === 0 ? "1" : (50 + index - 1).toString();

            workflow[applyNodeId] = {
                "inputs": {
                    "ipadapter": ["20", 0],
                    "model": [prevModelNode, 0],
                    "image": [encodeNodeId, 0],
                    "weight": 0.8,
                    "noise": 0.0,
                    "weight_type": "original",
                    "start_at": 0.0,
                    "end_at": 1.0,
                    "unfold_batch": false
                },
                "class_type": "IPAdapterApply"
            };
        });

        // Update KSampler to use IP-Adapter model
        const lastIPAdapterNode = uploadedImages.length > 0
            ? (50 + uploadedImages.length - 1).toString()
            : "1";
        workflow["5"].inputs.model = [lastIPAdapterNode, 0];
    }

    // Add LoRA nodes if specified
    if (loras && loras.length > 0) {
        let currentModelNode = uploadedImages.length > 0
            ? (50 + uploadedImages.length - 1).toString()
            : "1";
        let currentClipNode = "1";

        loras.forEach((lora: any, index: number) => {
            const loraNodeId = (10 + index).toString();

            workflow[loraNodeId] = {
                "inputs": {
                    "lora_name": lora.name,
                    "strength_model": lora.strength,
                    "strength_clip": lora.strength,
                    "model": [currentModelNode, 0],
                    "clip": [currentClipNode, 1]
                },
                "class_type": "LoraLoader"
            };

            currentModelNode = loraNodeId;
            currentClipNode = loraNodeId;
        });

        // Update connections
        workflow["2"].inputs.clip = [currentClipNode, 1];
        workflow["3"].inputs.clip = [currentClipNode, 1];

        // Update KSampler to use LoRA'd model
        workflow["5"].inputs.model = [currentModelNode, 0];
    }

    return workflow;
}
