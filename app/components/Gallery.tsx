"use client";

import React from 'react';

interface HistoryItem {
    result: string;
    seed: number | null;
    timestamp: number;
}

interface GalleryProps {
    history: HistoryItem[];
    onSelect: (item: HistoryItem) => void;
}

const Gallery: React.FC<GalleryProps> = ({ history, onSelect }) => {
    return (
        <div className="w-[300px] bg-black/40 border-l border-white/10 flex flex-col h-full">
            <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-bold text-white tracking-wide">Gallery</h3>
                <p className="text-xs text-gray-500 mt-1">Session History</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {history.length === 0 ? (
                    <div className="text-center py-10 text-gray-600 text-sm italic">
                        No creations yet.<br />Start generating!
                    </div>
                ) : (
                    history.map((item, index) => (
                        <div
                            key={index}
                            onClick={() => onSelect(item)}
                            className="group relative aspect-square rounded-xl overflow-hidden border border-white/10 hover:border-pink-500/50 cursor-pointer transition-all hover:scale-[1.02]"
                        >
                            {item.result.startsWith('data:image') ? (
                                <img
                                    src={item.result}
                                    alt={`History ${index}`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-gray-900 flex items-center justify-center p-4">
                                    <p className="text-[10px] text-gray-400 line-clamp-6 text-center">{item.result}</p>
                                </div>
                            )}

                            {/* Seed Badge */}
                            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[9px] text-pink-400 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                Seed: {item.seed || 'Random'}
                            </div>

                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-xs text-white font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">View</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Gallery;
