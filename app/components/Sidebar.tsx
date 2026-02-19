"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { ImageProvider } from '../lib/imageService';
import { checkComfyConnection, getComfyModels, getComfyLoras, getComfyControlNets } from '../lib/comfyProvider';

interface SidebarProps {
    prompt: string;
    setPrompt: (value: string) => void;

    // Character Builder
    gender: string;
    setGender: (value: string) => void;
    ethnicity: string;
    setEthnicity: (value: string) => void;
    bodyType: string;
    setBodyType: (value: string) => void;
    bodyShape: string;
    setBodyShape: (value: string) => void;
    torsoLegRatio: string;
    setTorsoLegRatio: (value: string) => void;
    shoulderWidth: string;
    setShoulderWidth: (value: string) => void;
    limbProportions: string;
    setLimbProportions: (value: string) => void;
    hairStyle: string;
    setHairStyle: (value: string) => void;
    clothing: string;
    setClothing: (value: string) => void;

    // Multi-Image Face
    faceImages: File[];
    setFaceImages: (files: File[]) => void;
    facePreviews: string[];
    setFacePreviews: (previews: string[]) => void;

    location: string;
    setLocation: (value: string) => void;

    backgroundDesc: string;
    setBackgroundDesc: (value: string) => void;

    // Multi-Image Background
    backgroundImages: File[];
    setBackgroundImages: (files: File[]) => void;
    bgPreviews: string[];
    setBgPreviews: (previews: string[]) => void;

    negativePrompt: string;
    setNegativePrompt: (value: string) => void;

    aspectRatio: string;
    setAspectRatio: (value: string) => void;

    // Generation Parameters
    temperature: number;
    setTemperature: (value: number) => void;
    seed: number | null;
    setSeed: (value: number | null) => void;
    stylePreset: string;
    setStylePreset: (value: string) => void;

    // Prompt Preview
    smartNegativeAdded: boolean;

    // Prompt Enhancer
    onOpenEnhancer: () => void;
    canUndoEnhancement: boolean;
    onUndoEnhancement: () => void;

    handleGenerate: () => void;
    loading: boolean;

    // Reset Functions
    resetAll: () => void;
    resetCharacter: () => void;
    resetScene: () => void;

    // Provider
    provider: ImageProvider;
    setProvider: (value: ImageProvider) => void;
    ckptName: string;
    setComfyModel: (value: string) => void;

    // LoRA Support
    loras: { name: string; strength: number }[];
    setLoras: (loras: { name: string; strength: number }[]) => void;

    // Batch Generation
    batchCount: number;
    setBatchCount: (count: number) => void;

    // ControlNet Support
    controlNets: { model: string; image: File; strength: number }[];
    setControlNets: (controlNets: { model: string; image: File; strength: number }[]) => void;

    // Mobile Support
    isMobile?: boolean;
    onCloseMobile?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
    prompt, setPrompt,
    gender, setGender, ethnicity, setEthnicity, bodyType, setBodyType, bodyShape, setBodyShape, torsoLegRatio, setTorsoLegRatio, shoulderWidth, setShoulderWidth, limbProportions, setLimbProportions, hairStyle, setHairStyle, clothing, setClothing,
    faceImages, setFaceImages, facePreviews, setFacePreviews,
    location, setLocation,
    backgroundDesc, setBackgroundDesc,
    backgroundImages, setBackgroundImages, bgPreviews, setBgPreviews,
    negativePrompt, setNegativePrompt,
    aspectRatio, setAspectRatio,
    temperature, setTemperature,
    seed, setSeed,
    stylePreset, setStylePreset,
    smartNegativeAdded,
    onOpenEnhancer,
    canUndoEnhancement,
    onUndoEnhancement,
    handleGenerate, loading,
    resetAll, resetCharacter, resetScene,
    provider, setProvider,
    ckptName, setComfyModel,
    loras, setLoras,
    batchCount, setBatchCount,
    controlNets, setControlNets,
    isMobile = false,
    onCloseMobile
}) => {
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [showSmartNegativeTooltip, setShowSmartNegativeTooltip] = useState(false);
    const [dragOver, setDragOver] = useState<'face' | 'background' | null>(null);
    const [comfyStatus, setComfyStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
    const [comfyError, setComfyError] = useState<string>('');
    const [comfyModels, setComfyModels] = useState<string[]>([]);
    const [loadingModels, setLoadingModels] = useState(false);
    const [comfyLoras, setComfyLoras] = useState<string[]>([]);
    const [loadingLoras, setLoadingLoras] = useState(false);
    const [showLoraSection, setShowLoraSection] = useState(false);

    // ControlNet state
    const [comfyControlNets, setComfyControlNets] = useState<string[]>([]);
    const [loadingControlNets, setLoadingControlNets] = useState(false);
    const [showControlNetSection, setShowControlNetSection] = useState(false);
    const [controlNetPreviews, setControlNetPreviews] = useState<string[]>([]);

    // Collapsible sections state
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        provider: false,
        character: false,
        scene: false,
        references: false,
        advanced: true // Advanced starts collapsed
    });

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const pingComfy = useCallback(async () => {
        setComfyStatus('checking');
        setComfyError('');
        try {
            const result = await checkComfyConnection();
            if (result.connected) {
                setComfyStatus('connected');
                setLoadingModels(true);
                const models = await getComfyModels();
                setComfyModels(models);
                if (models.length > 0 && !ckptName) {
                    setComfyModel(models[0]);
                }
                setLoadingModels(false);

                setLoadingLoras(true);
                const lorasList = await getComfyLoras();
                setComfyLoras(lorasList);
                setLoadingLoras(false);

                // Fetch ControlNet models
                setLoadingControlNets(true);
                const controlNetsList = await getComfyControlNets();
                setComfyControlNets(controlNetsList);
                setLoadingControlNets(false);
            } else {
                setComfyStatus('error');
                setComfyError(result.error || 'Not reachable');
            }
        } catch (e: any) {
            setComfyStatus('error');
            setComfyError(e.message || 'Connection failed');
        }
    }, [ckptName, setComfyModel]);

    useEffect(() => {
        if (provider === 'comfyui') {
            pingComfy();
        } else {
            setComfyStatus('idle');
        }
    }, [provider, pingComfy]);

    const bodyTypeOptions = ['Unspecified', 'Slim', 'Athletic', 'Average', 'Chubby', 'Muscular', 'Curvy'];
    const bodyShapeOptions = ['Unspecified', 'Hourglass', 'Pear', 'Inverted Triangle', 'Rectangle', 'Athletic'];
    const torsoLegRatioOptions = ['Unspecified', 'Long Torso', 'Long Legs', 'Balanced'];
    const shoulderWidthOptions = ['Unspecified', 'Broad', 'Narrow', 'Average'];
    const limbProportionsOptions = ['Unspecified', 'Long Limbs', 'Short Limbs', 'Stocky', 'Elongated'];

    // LoRA management functions
    const addLora = (loraName: string) => {
        if (loras.length < 3 && !loras.find(l => l.name === loraName)) {
            setLoras([...loras, { name: loraName, strength: 1.0 }]);
        }
    };

    const removeLora = (index: number) => {
        const updated = [...loras];
        updated.splice(index, 1);
        setLoras(updated);
    };

    const updateLoraStrength = (index: number, strength: number) => {
        const updated = [...loras];
        updated[index].strength = strength;
        setLoras(updated);
    };

    // ControlNet management functions
    const addControlNet = (model: string, image: File) => {
        if (controlNets.length < 2) {
            const reader = new FileReader();
            reader.onload = () => {
                setControlNetPreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(image);
            setControlNets([...controlNets, { model, image, strength: 1.0 }]);
        }
    };

    const removeControlNet = (index: number) => {
        const updated = [...controlNets];
        updated.splice(index, 1);
        setControlNets(updated);

        const updatedPreviews = [...controlNetPreviews];
        updatedPreviews.splice(index, 1);
        setControlNetPreviews(updatedPreviews);
    };

    const updateControlNetStrength = (index: number, strength: number) => {
        const updated = [...controlNets];
        updated[index].strength = strength;
        setControlNets(updated);
    };

    const handleDragOver = (e: React.DragEvent, target: 'face' | 'background') => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(target);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
    };

    const handleDrop = (
        e: React.DragEvent,
        setFiles: (files: File[]) => void,
        setPreviews: (s: string[]) => void,
        currentFiles: File[],
        currentPreviews: string[]
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);

        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            const newFiles = [...currentFiles, ...imageFiles];
            setFiles(newFiles);

            const newPreviews: string[] = [];
            let processed = 0;

            imageFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    newPreviews.push(reader.result as string);
                    processed++;
                    if (processed === imageFiles.length) {
                        setPreviews([...currentPreviews, ...newPreviews]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const handleImageUpload = (
        e: React.ChangeEvent<HTMLInputElement>,
        setFiles: (files: File[]) => void,
        setPreviews: (s: string[]) => void,
        currentFiles: File[],
        currentPreviews: string[]
    ) => {
        const files = Array.from(e.target.files || []);
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
            const newFiles = [...currentFiles, ...imageFiles];
            setFiles(newFiles);

            const newPreviews: string[] = [];
            let processed = 0;

            imageFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = () => {
                    newPreviews.push(reader.result as string);
                    processed++;
                    if (processed === imageFiles.length) {
                        setPreviews([...currentPreviews, ...newPreviews]);
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (
        index: number,
        setFiles: (files: File[]) => void,
        setPreviews: (s: string[]) => void,
        currentFiles: File[],
        currentPreviews: string[]
    ) => {
        const updatedFiles = [...currentFiles];
        updatedFiles.splice(index, 1);
        setFiles(updatedFiles);

        const updatedPreviews = [...currentPreviews];
        updatedPreviews.splice(index, 1);
        setPreviews(updatedPreviews);
    };

    // Collapsible Section Component
    const CollapsibleSection = ({
        id,
        title,
        children,
        className = "",
        badge
    }: {
        id: string;
        title: string;
        children: React.ReactNode;
        className?: string;
        badge?: React.ReactNode;
    }) => (
        <section className={`${className}`}>
            <button
                onClick={() => toggleSection(id)}
                className="w-full flex items-center justify-between mb-3 group"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold group-hover:text-gray-400 transition-colors">
                        {title}
                    </span>
                    {badge}
                </div>
                <svg
                    className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${collapsedSections[id] ? '' : 'rotate-180'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${collapsedSections[id] ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                {children}
            </div>
        </section>
    );

    return (
        <div className="w-[320px] sm:w-[380px] lg:w-[420px] bg-[#1a1b1e] border-r border-[#2c2e33] flex flex-col h-full overflow-hidden">
            <header className="p-4 lg:p-6 border-b border-[#2c2e33] bg-[#141517] flex justify-between items-center">
                <div className="flex items-center gap-3">
                    {isMobile && (
                        <button
                            onClick={onCloseMobile}
                            className="p-2 rounded-lg bg-[#25262b] hover:bg-[#2c2e33] transition-colors lg:hidden"
                            aria-label="Close menu"
                            suppressHydrationWarning
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                    <div>
                        <h1 className="text-lg lg:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-violet-400">
                            Aura Studio
                        </h1>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1 hidden lg:block">Configuration</p>
                    </div>
                </div>
                <button
                    onClick={resetAll}
                    className="text-[10px] text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-gray-700 hover:border-red-500"
                    title="Reset All Settings"
                    suppressHydrationWarning
                >
                    Reset
                </button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 custom-scrollbar">

                {/* 0. Model Provider */}
                <section>
                    <label className="text-[10px] text-gray-500 mb-2 block uppercase tracking-wider font-bold">Image Provider</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#141517] p-1 rounded-xl border border-[#2c2e33]">
                        <button
                            onClick={() => setProvider('gemini')}
                            className={`py-2 rounded-lg text-xs font-medium transition-all ${provider === 'gemini'
                                ? 'bg-gradient-to-r from-pink-600 to-violet-600 text-white shadow-lg'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                            suppressHydrationWarning
                        >
                            Google Gemini
                        </button>
                        <button
                            onClick={() => setProvider('comfyui')}
                            className={`py-2 rounded-lg text-xs font-medium transition-all ${provider === 'comfyui'
                                ? 'bg-[#25262b] text-pink-400 border border-pink-500/30'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                            suppressHydrationWarning
                        >
                            Local ComfyUI
                        </button>
                    </div>
                    {provider === 'comfyui' && (
                        <div className="mt-2 px-1 space-y-2">
                            {comfyStatus === 'checking' && (
                                <div className="flex items-center gap-2 text-[10px] text-yellow-400">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
                                    Checking connection…
                                </div>
                            )}
                            {comfyStatus === 'connected' && (
                                <div className="flex items-center gap-2 text-[10px] text-green-400">
                                    <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
                                    Connected to ComfyUI ✓
                                </div>
                            )}
                            {comfyStatus === 'error' && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-[10px] text-red-400">
                                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                                        Not reachable — {comfyError}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] text-gray-600 italic">Start ComfyUI then:</p>
                                        <button
                                            onClick={pingComfy}
                                            className="text-[9px] text-pink-400 hover:text-pink-300 underline"
                                        >
                                            Retry
                                        </button>
                                    </div>
                                </div>
                            )}
                            {/* Model selector — shown once connected */}
                            {comfyStatus === 'connected' && (
                                <div>
                                    <label className="text-[10px] text-gray-500 mb-1 block">CHECKPOINT MODEL</label>
                                    {loadingModels ? (
                                        <p className="text-[10px] text-gray-500 italic">Loading models…</p>
                                    ) : comfyModels.length > 0 ? (
                                        <select
                                            value={ckptName}
                                            onChange={(e) => setComfyModel(e.target.value)}
                                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                                        >
                                            {comfyModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-red-400">No checkpoints found in ComfyUI.</p>
                                            <p className="text-[9px] text-gray-600">Add a model to ComfyUI's models/checkpoints/ folder, then retry.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* LoRA selector — shown once connected */}
                            {comfyStatus === 'connected' && (
                                <div className="mt-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] text-gray-500 block">LoRA MODELS</label>
                                        <button
                                            onClick={() => setShowLoraSection(!showLoraSection)}
                                            className="text-[9px] text-pink-400 hover:text-pink-300"
                                        >
                                            {showLoraSection ? 'Hide' : 'Show'} ({loras.length}/3)
                                        </button>
                                    </div>

                                    {showLoraSection && (
                                        <div className="space-y-2">
                                            {loadingLoras ? (
                                                <p className="text-[10px] text-gray-500 italic">Loading LoRAs…</p>
                                            ) : comfyLoras.length > 0 ? (
                                                <>
                                                    {/* Add LoRA selector */}
                                                    {loras.length < 3 && (
                                                        <select
                                                            onChange={(e) => {
                                                                if (e.target.value) {
                                                                    addLora(e.target.value);
                                                                    e.target.value = '';
                                                                }
                                                            }}
                                                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                                                            value=""
                                                        >
                                                            <option value="">+ Add LoRA ({loras.length}/3)</option>
                                                            {comfyLoras
                                                                .filter(lora => !loras.find(l => l.name === lora))
                                                                .map(lora => (
                                                                    <option key={lora} value={lora}>{lora}</option>
                                                                ))}
                                                        </select>
                                                    )}

                                                    {/* Selected LoRAs */}
                                                    {loras.map((lora, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 bg-[#25262b] p-2 rounded-md border border-[#2c2e33]">
                                                            <span className="text-[10px] text-white flex-1 truncate">{lora.name}</span>
                                                            <input
                                                                type="range"
                                                                min="0"
                                                                max="1.5"
                                                                step="0.1"
                                                                value={lora.strength}
                                                                onChange={(e) => updateLoraStrength(idx, parseFloat(e.target.value))}
                                                                className="w-16 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                            />
                                                            <span className="text-[9px] text-gray-400 w-8">{lora.strength.toFixed(1)}</span>
                                                            <button
                                                                onClick={() => removeLora(idx)}
                                                                className="text-red-400 hover:text-red-300 text-xs px-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <p className="text-[9px] text-gray-500 italic">No LoRAs found in models/lora/</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Batch Count — shown once connected */}
                            {comfyStatus === 'connected' && (
                                <div className="mt-3">
                                    <label className="text-[10px] text-gray-500 mb-1 block">BATCH COUNT</label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setBatchCount(Math.max(1, batchCount - 1))}
                                            className="px-2 py-1 bg-[#25262b] border border-[#2c2e33] rounded text-xs text-white hover:bg-[#2c2e33]"
                                        >
                                            -
                                        </button>
                                        <span className="text-xs text-white w-8 text-center">{batchCount}</span>
                                        <button
                                            onClick={() => setBatchCount(Math.min(9, batchCount + 1))}
                                            className="px-2 py-1 bg-[#25262b] border border-[#2c2e33] rounded text-xs text-white hover:bg-[#2c2e33]"
                                        >
                                            +
                                        </button>
                                        <span className="text-[9px] text-gray-500 ml-2">images per generation</span>
                                    </div>
                                </div>
                            )}

                            {/* ControlNet — shown once connected */}
                            {comfyStatus === 'connected' && (
                                <div className="mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-[10px] text-gray-500 block">CONTROLNET</label>
                                        <button
                                            onClick={() => setShowControlNetSection(!showControlNetSection)}
                                            className="text-[9px] text-violet-400 hover:text-violet-300"
                                        >
                                            {showControlNetSection ? 'Hide' : 'Show'} ({controlNets.length}/2)
                                        </button>
                                    </div>

                                    {showControlNetSection && (
                                        <div className="space-y-3">
                                            {loadingControlNets ? (
                                                <p className="text-[10px] text-gray-500 italic">Loading ControlNet models…</p>
                                            ) : comfyControlNets.length > 0 ? (
                                                <>
                                                    {/* Add ControlNet */}
                                                    {controlNets.length < 2 && (
                                                        <div className="space-y-2">
                                                            <select
                                                                onChange={(e) => {
                                                                    const selectedModel = e.target.value;
                                                                    if (selectedModel) {
                                                                        // Trigger file input click
                                                                        const fileInput = document.getElementById('controlnet-upload');
                                                                        if (fileInput) {
                                                                            fileInput.setAttribute('data-model', selectedModel);
                                                                            fileInput.click();
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                                                                value=""
                                                            >
                                                                <option value="">+ Add ControlNet ({controlNets.length}/2)</option>
                                                                {comfyControlNets.map(cn => (
                                                                    <option key={cn} value={cn}>{cn}</option>
                                                                ))}
                                                            </select>
                                                            <input
                                                                id="controlnet-upload"
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    const model = e.target.getAttribute('data-model');
                                                                    if (file && model) {
                                                                        addControlNet(model, file);
                                                                    }
                                                                    e.target.value = '';
                                                                }}
                                                            />
                                                        </div>
                                                    )}

                                                    {/* Selected ControlNets */}
                                                    {controlNets.map((cn, idx) => (
                                                        <div key={idx} className="bg-[#25262b] p-3 rounded-md border border-[#2c2e33] space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[10px] text-white truncate flex-1">{cn.model}</span>
                                                                <button
                                                                    onClick={() => removeControlNet(idx)}
                                                                    className="text-red-400 hover:text-red-300 text-xs px-1"
                                                                >
                                                                    ×
                                                                </button>
                                                            </div>
                                                            {controlNetPreviews[idx] && (
                                                                <img
                                                                    src={controlNetPreviews[idx]}
                                                                    alt="ControlNet reference"
                                                                    className="w-full h-24 object-cover rounded"
                                                                />
                                                            )}
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[9px] text-gray-500">Strength</span>
                                                                <input
                                                                    type="range"
                                                                    min="0"
                                                                    max="2"
                                                                    step="0.1"
                                                                    value={cn.strength}
                                                                    onChange={(e) => updateControlNetStrength(idx, parseFloat(e.target.value))}
                                                                    className="flex-1 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                                                />
                                                                <span className="text-[9px] text-gray-400 w-8">{cn.strength.toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    {controlNets.length === 0 && (
                                                        <p className="text-[9px] text-gray-500 italic">
                                                            Select a ControlNet model and upload a reference image
                                                        </p>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="space-y-1">
                                                    <p className="text-[9px] text-gray-500 italic">No ControlNet models found</p>
                                                    <p className="text-[8px] text-gray-600">Install ControlNet extension in ComfyUI</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* 1. Creative Prompt */}
                <section>
                    <div className="flex justify-between items-center mb-3">
                        <label className="text-xs font-bold text-gray-300 uppercase">1. Creative Prompt</label>
                        <div className="flex gap-2">
                            {canUndoEnhancement && (
                                <button
                                    onClick={onUndoEnhancement}
                                    className="text-[10px] text-orange-400 hover:text-orange-300 flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30 transition-colors"
                                    title="Undo last enhancement"
                                >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                    </svg>
                                    Undo
                                </button>
                            )}
                            <button
                                onClick={onOpenEnhancer}
                                disabled={!prompt.trim()}
                                className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded transition-colors ${prompt.trim()
                                    ? 'text-pink-400 hover:text-pink-300 bg-pink-500/10 border border-pink-500/30 hover:border-pink-400'
                                    : 'text-gray-600 cursor-not-allowed bg-gray-800 border border-gray-700'
                                    }`}
                                title="Enhance prompt with AI"
                            >
                                <span className="text-sm">✨</span>
                                Enhance
                            </button>
                        </div>
                    </div>
                    <textarea
                        className="w-full p-3 rounded-lg bg-[#25262b] border border-[#2c2e33] focus:border-pink-500/50 outline-none text-sm text-gray-200 placeholder-gray-600 transition-all resize-none h-24"
                        placeholder="Describe your vision..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                    />
                    {canUndoEnhancement && (
                        <p className="text-[10px] text-orange-400/70 mt-2 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Prompt has been enhanced. Click "Undo" to revert.
                        </p>
                    )}
                </section>

                {/* 2. Character Builder */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-t border-[#2c2e33] pt-4">
                        <label className="text-xs font-bold text-gray-300 uppercase">2. Character Builder</label>
                        <button
                            onClick={resetCharacter}
                            className="text-[10px] text-gray-500 hover:text-pink-400 transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Gender */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">GENDER</label>
                        <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                        >
                            <option value="Unspecified">Unspecified</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Non-binary">Non-binary</option>
                        </select>
                    </div>

                    {/* Ethnicity & Body Type with Visual */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">ETHNICITY</label>
                            <select
                                value={ethnicity}
                                onChange={(e) => setEthnicity(e.target.value)}
                                className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                            >
                                <option value="Unspecified">Any</option>
                                <option value="Malay">Malay</option>
                                <option value="Chinese">Chinese</option>
                                <option value="Japanese">Japanese</option>
                                <option value="Filipino">Filipino</option>
                                <option value="Indonesian">Indonesian</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">BODY TYPE</label>
                            <div className="relative">
                                <select
                                    value={bodyType}
                                    onChange={(e) => setBodyType(e.target.value)}
                                    className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none appearance-none"
                                >
                                    {bodyTypeOptions.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Body Type Description */}
                    {bodyType !== 'Unspecified' && (
                        <div className="p-3 bg-[#25262b] rounded-lg border border-[#2c2e33]">
                            <p className="text-xs text-white font-medium mb-1">{bodyType}</p>
                            <p className="text-[10px] text-gray-500">
                                {bodyType === 'Chubby' && 'Plus-size, full-figured build with visible body fat'}
                                {bodyType === 'Slim' && 'Slender, lean physique with minimal body fat'}
                                {bodyType === 'Athletic' && 'Toned physique with muscle definition'}
                                {bodyType === 'Muscular' && 'Heavily muscular, bodybuilder physique'}
                                {bodyType === 'Curvy' && 'Hourglass figure with pronounced curves'}
                                {bodyType === 'Average' && 'Medium build with balanced proportions'}
                            </p>
                        </div>
                    )}

                    {/* Body Shape */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">BODY SHAPE</label>
                        <select
                            value={bodyShape}
                            onChange={(e) => setBodyShape(e.target.value)}
                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                        >
                            {bodyShapeOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Torso-Leg Ratio */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">TORSO-LEG RATIO</label>
                        <select
                            value={torsoLegRatio}
                            onChange={(e) => setTorsoLegRatio(e.target.value)}
                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                        >
                            {torsoLegRatioOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Shoulder Width */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">SHOULDER WIDTH</label>
                        <select
                            value={shoulderWidth}
                            onChange={(e) => setShoulderWidth(e.target.value)}
                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                        >
                            {shoulderWidthOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Limb Proportions */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-1 block">LIMB PROPORTIONS</label>
                        <select
                            value={limbProportions}
                            onChange={(e) => setLimbProportions(e.target.value)}
                            className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                        >
                            {limbProportionsOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">HAIR STYLE</label>
                            <select
                                value={hairStyle}
                                onChange={(e) => setHairStyle(e.target.value)}
                                className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                            >
                                <option value="Unspecified">Any</option>
                                <option value="Bob cut">Bob cut</option>
                                <option value="Pixie">Pixie</option>
                                <option value="Ponytails">Ponytails</option>
                                <option value="Buns">Buns</option>
                                <option value="Braids">Braids</option>
                                <option value="Half-up">Half-up</option>
                                <option value="Long hair">Long hair</option>
                                <option value="Wolf cut">Wolf cut</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 mb-1 block">CLOTHING</label>
                            <select
                                value={clothing}
                                onChange={(e) => setClothing(e.target.value)}
                                className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                            >
                                <option value="Unspecified">Any</option>
                                <option value="Dress">Dress</option>
                                <option value="Suits/Uniform">Suits/Uniform</option>
                                <option value="Casual">Casual</option>
                                <option value="Swimwear">Swimwear</option>
                                <option value="Bodysuits">Bodysuits</option>
                                <option value="Robe">Robe</option>
                                <option value="Sleepwear">Sleepwear</option>
                            </select>
                        </div>
                    </div>

                    {/* Multi-Image Face Match Upload */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-2 block">FACE REFERENCE (MULTI-UPLOAD)</label>
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-2 transition-all duration-200 ${dragOver === 'face'
                                ? 'border-pink-500 bg-pink-500/10'
                                : 'border-[#2c2e33] hover:border-pink-500/30'
                                }`}
                            onDragOver={(e) => handleDragOver(e, 'face')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, setFaceImages, setFacePreviews, faceImages, facePreviews)}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleImageUpload(e, setFaceImages, setFacePreviews, faceImages, facePreviews)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />

                            {facePreviews.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 relative z-20 pointer-events-none">
                                    {facePreviews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square group/img pointer-events-auto">
                                            <img src={src} alt="Face" className="w-full h-full object-cover rounded-md" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeImage(idx, setFaceImages, setFacePreviews, faceImages, facePreviews); }}
                                                className="absolute top-0 right-0 bg-black/60 hover:bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-bl-md text-[10px]"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-center bg-[#25262b] rounded-md pointer-events-none">
                                        <span className="text-[10px] text-gray-500">+Add</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 pointer-events-none">
                                    <div className={`text-2xl mb-1 transition-transform ${dragOver === 'face' ? 'scale-125' : ''}`}>📷</div>
                                    <span className="text-[10px] text-gray-500">Upload or Drag Images</span>
                                    <div className="text-[9px] text-gray-600 mt-1">Ctrl+V to paste</div>
                                </div>
                            )}
                        </div>
                    </div>

                </section>

                {/* 3. Scene Details */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-t border-[#2c2e33] pt-4">
                        <label className="text-xs font-bold text-gray-300 uppercase">3. Scene Details</label>
                        <button
                            onClick={resetScene}
                            className="text-[10px] text-gray-500 hover:text-pink-400 transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    <input
                        type="text"
                        className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] focus:border-pink-500/50 outline-none text-xs text-white placeholder-gray-600"
                        placeholder="Location (e.g., Cyberpunk City)..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    />

                    <textarea
                        className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] focus:border-pink-500/50 outline-none text-xs text-white placeholder-gray-600 resize-none h-16"
                        placeholder="Background description..."
                        value={backgroundDesc}
                        onChange={(e) => setBackgroundDesc(e.target.value)}
                    />

                    {/* Multi-Image Background Upload */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-2 block">BACKGROUND REFERENCE (MULTI-UPLOAD)</label>
                        <div
                            className={`relative border-2 border-dashed rounded-lg p-2 transition-all duration-200 ${dragOver === 'background'
                                ? 'border-violet-500 bg-violet-500/10'
                                : 'border-[#2c2e33] hover:border-violet-500/30'
                                }`}
                            onDragOver={(e) => handleDragOver(e, 'background')}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, setBackgroundImages, setBgPreviews, backgroundImages, bgPreviews)}
                        >
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleImageUpload(e, setBackgroundImages, setBgPreviews, backgroundImages, bgPreviews)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            {bgPreviews.length > 0 ? (
                                <div className="grid grid-cols-3 gap-2 relative z-20 pointer-events-none">
                                    {bgPreviews.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square group/img pointer-events-auto">
                                            <img src={src} alt="Bg" className="w-full h-full object-cover rounded-md" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); removeImage(idx, setBackgroundImages, setBgPreviews, backgroundImages, bgPreviews); }}
                                                className="absolute top-0 right-0 bg-black/60 hover:bg-red-500 text-white w-4 h-4 flex items-center justify-center rounded-bl-md text-[10px]"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-center bg-[#25262b] rounded-md pointer-events-none">
                                        <span className="text-[10px] text-gray-500">+Add</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 pointer-events-none">
                                    <div className={`text-2xl mb-1 transition-transform ${dragOver === 'background' ? 'scale-125' : ''}`}>🖼️</div>
                                    <span className="text-[10px] text-gray-500">Upload or Drag Images</span>
                                    <div className="text-[9px] text-gray-600 mt-1">Ctrl+V to paste</div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* 4. Generation Details */}
                <section className="space-y-4">
                    <label className="text-xs font-bold text-gray-300 uppercase block border-t border-[#2c2e33] pt-4">4. Generation Details</label>

                    {/* Negative Prompt with Smart Badge */}
                    <div className="relative">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] text-gray-500">NEGATIVE PROMPTS</label>
                            {smartNegativeAdded && (
                                <div
                                    className="relative"
                                    onMouseEnter={() => setShowSmartNegativeTooltip(true)}
                                    onMouseLeave={() => setShowSmartNegativeTooltip(false)}
                                >
                                    <span className="text-[9px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30 cursor-help">
                                        ✓ Enhanced
                                    </span>
                                    {showSmartNegativeTooltip && (
                                        <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-[#1a1b1e] border border-[#2c2e33] rounded-lg shadow-lg z-50">
                                            <p className="text-[10px] text-gray-400">
                                                Auto-generated exclusions added based on your body type selection to improve adherence.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <input
                            type="text"
                            className="w-full p-2 rounded-md bg-[#25262b] border border-red-900/20 focus:border-red-500/50 outline-none text-xs text-red-200 placeholder-red-900/50"
                            placeholder="Negative prompts (Avoid these)..."
                            value={negativePrompt}
                            onChange={(e) => setNegativePrompt(e.target.value)}
                        />
                    </div>

                    {/* Aspect Ratio */}
                    <div>
                        <label className="text-[10px] text-gray-500 mb-2 block">ASPECT RATIO</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: '1:1', label: 'Square', icon: 'aspect-square' },
                                { id: '3:4', label: 'Portrait', icon: 'aspect-[3/4]' },
                                { id: '16:9', label: 'Landscape', icon: 'aspect-video' }
                            ].map((ratio) => (
                                <button
                                    key={ratio.id}
                                    onClick={() => setAspectRatio(ratio.id)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${aspectRatio === ratio.id
                                        ? 'bg-[#25262b] border-pink-500 text-pink-400'
                                        : 'bg-[#1a1b1e] border-[#2c2e33] text-gray-500 hover:border-gray-500'
                                        }`}
                                >
                                    <div className={`w-4 bg-current opacity-50 mb-1 rounded-sm ${ratio.icon.replace('aspect-', 'aspect-') === 'aspect-square' ? 'h-4' : ratio.icon === 'aspect-[3/4]' ? 'h-5' : 'h-3 w-6'}`}></div>
                                    <span className="text-[9px] font-medium">{ratio.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Settings Toggle */}
                    <div className="border border-[#2c2e33] rounded-lg overflow-hidden">
                        <button
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            className="w-full px-4 py-2 bg-[#1a1b1e] hover:bg-[#25262b] flex justify-between items-center text-xs text-gray-400 transition-colors"
                        >
                            <span className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                </svg>
                                Advanced Settings
                            </span>
                            <svg
                                className={`w-4 h-4 transform transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {showAdvancedSettings && (
                            <div className="p-4 space-y-4 bg-[#0f0f13] border-t border-[#2c2e33]">
                                {/* Temperature */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-1">
                                            <label className="text-[10px] text-gray-500">TEMPERATURE</label>
                                            <div className="group relative">
                                                <svg className="w-3 h-3 text-gray-500 cursor-help hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#1a1b1e] border border-[#2c2e33] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                                    <p className="text-[10px] text-gray-300 mb-2"><strong>Controls creativity vs consistency</strong></p>
                                                    <ul className="text-[10px] text-gray-400 space-y-1">
                                                        <li><span className="text-pink-400">Low (0.0-0.3):</span> Predictable, precise results</li>
                                                        <li><span className="text-pink-400">Medium (0.4-0.7):</span> Balanced creativity</li>
                                                        <li><span className="text-pink-400">High (0.8-1.0):</span> Artistic, surprising results</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-pink-400">{temperature.toFixed(1)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.1"
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                        className="w-full h-1 bg-[#2c2e33] rounded-lg appearance-none cursor-pointer accent-pink-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                                        <span>Precise</span>
                                        <span>Creative</span>
                                    </div>
                                </div>

                                {/* Seed */}
                                <div>
                                    <div className="flex items-center gap-1 mb-2">
                                        <label className="text-[10px] text-gray-500">SEED (Optional)</label>
                                        <div className="group relative">
                                            <svg className="w-3 h-3 text-gray-500 cursor-help hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="absolute bottom-full left-0 mb-2 w-64 p-3 bg-[#1a1b1e] border border-[#2c2e33] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                                <p className="text-[10px] text-gray-300 mb-2"><strong>Random number for reproducible results</strong></p>
                                                <ul className="text-[10px] text-gray-400 space-y-1">
                                                    <li>Same seed + same prompt = Same image</li>
                                                    <li>Different seed = Different variations</li>
                                                    <li>Leave empty for random results each time</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Random"
                                            value={seed || ''}
                                            onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                                            className="flex-1 p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                                        />
                                        <button
                                            onClick={() => setSeed(null)}
                                            className="px-3 py-2 bg-[#25262b] border border-[#2c2e33] rounded-md text-xs text-gray-400 hover:text-white transition-colors"
                                        >
                                            Random
                                        </button>
                                    </div>
                                </div>

                                {/* Style Preset */}
                                <div>
                                    <label className="text-[10px] text-gray-500 mb-2 block">STYLE PRESET</label>
                                    <select
                                        value={stylePreset}
                                        onChange={(e) => setStylePreset(e.target.value)}
                                        className="w-full p-2 rounded-md bg-[#25262b] border border-[#2c2e33] text-xs text-white outline-none"
                                    >
                                        <option value="">None</option>
                                        <option value="Photorealistic">Photorealistic</option>
                                        <option value="Anime">Anime</option>
                                        <option value="Digital Art">Digital Art</option>
                                        <option value="Oil Painting">Oil Painting</option>
                                        <option value="Watercolor">Watercolor</option>
                                        <option value="3D Render">3D Render</option>
                                        <option value="Cinematic">Cinematic</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <div className="pb-8"></div>
            </div>

            <div className="p-6 border-t border-[#2c2e33] bg-[#141517]">
                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className={`w-full py-3 rounded-lg font-bold text-sm tracking-widest transition-all transform active:scale-95 ${loading
                        ? 'bg-[#2c2e33] text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white shadow-lg shadow-pink-500/20'
                        }`}
                >
                    {loading ? 'DREAMING...' : 'GENERATE'}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
