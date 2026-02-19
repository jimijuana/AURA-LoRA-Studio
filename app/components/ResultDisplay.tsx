"use client";

import React, { useState, useRef, useCallback } from 'react';

interface GenerationMetadata {
    seed: number | null;
    temperature: number;
    prompt: string;
    gender: string;
    ethnicity: string;
    bodyType: string;
    bodyShape: string;
    torsoLegRatio: string;
    shoulderWidth: string;
    limbProportions: string;
    hairStyle: string;
    clothing: string;
    location: string;
    aspectRatio: string;
    stylePreset: string;
}

interface ResultDisplayProps {
    result: string;
    loading: boolean;
    error: string | null;
    metadata: GenerationMetadata | null;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ result, loading, error, metadata }) => {
    const [showMetadata, setShowMetadata] = useState(false);
    const [copied, setCopied] = useState(false);
    const [fullscreen, setFullscreen] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imageRef = useRef<HTMLImageElement>(null);

    const handleCopyMetadata = () => {
        if (!metadata) return;
        
        const metadataText = `
Generation Settings:
Seed: ${metadata.seed || 'Random'}
Temperature: ${metadata.temperature}
Prompt: ${metadata.prompt}
Gender: ${metadata.gender}
Ethnicity: ${metadata.ethnicity}
Body Type: ${metadata.bodyType}
Body Shape: ${metadata.bodyShape}
Torso-Leg Ratio: ${metadata.torsoLegRatio}
Shoulder Width: ${metadata.shoulderWidth}
Limb Proportions: ${metadata.limbProportions}
Hair Style: ${metadata.hairStyle}
Clothing: ${metadata.clothing}
Location: ${metadata.location}
Aspect Ratio: ${metadata.aspectRatio}
Style: ${metadata.stylePreset || 'None'}
        `.trim();
        
        navigator.clipboard.writeText(metadataText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (!fullscreen) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
    }, [fullscreen]);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!fullscreen || zoom <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }, [fullscreen, zoom, pan]);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging) return;
        setPan({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    }, [isDragging, dragStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetView = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const closeFullscreen = () => {
        setFullscreen(false);
        resetView();
    };

    const isImage = result && result.startsWith('data:image');

    return (
        <div className="flex-1 h-full bg-[#0f0f13] relative overflow-hidden flex flex-col items-center justify-center p-4 lg:p-8">
            {/* Background Ambient Effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[20%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-20%] right-[20%] w-[60%] h-[60%] bg-pink-900/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Fullscreen Modal */}
            {fullscreen && isImage && (
                <div 
                    className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                >
                    {/* Close Button */}
                    <button
                        onClick={closeFullscreen}
                        className="absolute top-4 right-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Zoom Controls */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-4 py-2">
                        <button
                            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
                            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="text-white text-sm w-16 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={() => setZoom(prev => Math.min(prev + 0.25, 5))}
                            className="w-8 h-8 flex items-center justify-center text-white hover:bg-white/20 rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </button>
                        <button
                            onClick={resetView}
                            className="ml-2 px-3 py-1 text-xs text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                        >
                            Reset
                        </button>
                    </div>

                    {/* Instructions */}
                    <div className="absolute top-4 left-4 text-white/50 text-xs">
                        <p>Scroll to zoom • Drag to pan</p>
                    </div>

                    {/* Fullscreen Image */}
                    <img
                        ref={imageRef}
                        src={result}
                        alt="Generated Result"
                        className="max-w-none transition-transform duration-100 ease-out"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                        }}
                        draggable={false}
                    />
                </div>
            )}

            {loading ? (
                <div className="text-center z-10 animate-pulse">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full border-4 border-t-pink-500 border-r-transparent border-b-violet-500 border-l-transparent animate-spin"></div>
                    <h2 className="text-2xl font-light text-white tracking-widest uppercase">Dreaming</h2>
                    <p className="text-gray-500 text-sm mt-2">Consulting the oracle...</p>
                </div>
            ) : error ? (
                <div className="max-w-md p-6 bg-red-500/10 border border-red-500/30 rounded-2xl text-center z-10">
                    <h3 className="text-red-400 font-bold mb-2">Generation Failed</h3>
                    <p className="text-red-200 text-sm">{error}</p>
                </div>
            ) : result ? (
                <div className="w-full max-w-4xl max-h-full flex flex-col items-center z-10 animate-fade-in">
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden backdrop-blur-sm group relative">
                        {isImage ? (
                            <>
                                <img
                                    src={result}
                                    alt="Generated Result"
                                    className="max-h-[50vh] lg:max-h-[70vh] max-w-full rounded-xl object-contain cursor-zoom-in"
                                    onClick={() => setFullscreen(true)}
                                />
                                {/* Fullscreen Hint */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                        </svg>
                                        Click to expand
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="p-8 max-h-[70vh] overflow-y-auto w-[600px]">
                                <p className="text-gray-200 leading-relaxed whitespace-pre-wrap font-light text-lg text-center">{result}</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 lg:mt-6 flex flex-col items-center gap-3 lg:gap-4 w-full max-w-2xl px-2">
                        <div className="flex flex-wrap justify-center gap-2 lg:gap-4">
                            {isImage && (
                                <>
                                    <button
                                        onClick={() => setFullscreen(true)}
                                        className="px-4 lg:px-6 py-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 rounded-full text-violet-400 text-xs lg:text-sm transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                        </svg>
                                        <span className="hidden sm:inline">Fullscreen</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = result;
                                            link.download = `aura-${Date.now()}.png`;
                                            link.click();
                                        }}
                                        className="px-4 lg:px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white text-xs lg:text-sm transition-colors flex items-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                        <span className="hidden sm:inline">Download</span>
                                    </button>
                                </>
                            )}
                            
                            <button
                                onClick={() => setShowMetadata(!showMetadata)}
                                className="px-4 lg:px-6 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/30 rounded-full text-pink-400 text-xs lg:text-sm transition-colors flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                                <span className="hidden sm:inline">{showMetadata ? 'Hide' : 'Show'} Info</span>
                                <span className="sm:hidden">{showMetadata ? 'Hide' : 'Info'}</span>
                            </button>
                        </div>

                        {/* Metadata Panel */}
                        {showMetadata && metadata && (
                            <div className="w-full bg-[#1a1b1e] border border-[#2c2e33] rounded-xl p-4 animate-fade-in">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-white">Generation Details</h3>
                                    <button
                                        onClick={handleCopyMetadata}
                                        className={`text-[10px] px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
                                            copied 
                                                ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                                : 'bg-[#25262b] text-gray-400 hover:text-white border border-[#2c2e33]'
                                        }`}
                                    >
                                        {copied ? (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                                Copy All Settings
                                            </>
                                        )}
                                    </button>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Seed</span>
                                        <span className="text-pink-400 font-mono">{metadata.seed || 'Random'}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Temperature</span>
                                        <span className="text-pink-400 font-mono">{metadata.temperature}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Gender</span>
                                        <span className="text-gray-300">{metadata.gender}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Body Type</span>
                                        <span className="text-gray-300">{metadata.bodyType}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Body Shape</span>
                                        <span className="text-gray-300">{metadata.bodyShape}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Torso-Leg</span>
                                        <span className="text-gray-300">{metadata.torsoLegRatio}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Shoulders</span>
                                        <span className="text-gray-300">{metadata.shoulderWidth}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Limbs</span>
                                        <span className="text-gray-300">{metadata.limbProportions}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Aspect Ratio</span>
                                        <span className="text-gray-300">{metadata.aspectRatio}</span>
                                    </div>
                                    <div className="flex justify-between p-2 bg-[#0f0f13] rounded">
                                        <span className="text-gray-500">Style</span>
                                        <span className="text-gray-300">{metadata.stylePreset || 'None'}</span>
                                    </div>
                                </div>
                                
                                <div className="mt-3 p-2 bg-[#0f0f13] rounded">
                                    <span className="text-gray-500 text-[11px] block mb-1">Prompt</span>
                                    <p className="text-gray-300 text-[10px] line-clamp-3">{metadata.prompt}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="text-center z-10 opacity-30">
                    <div className="text-6xl mb-4">✨</div>
                    <p className="text-xl font-light tracking-wide">Ready to Create</p>
                </div>
            )}
        </div>
    );
};

export default ResultDisplay;
