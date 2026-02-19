"use client";

import React, { useState, useEffect, useRef } from 'react';

interface PromptEnhancerProps {
  originalPrompt: string;
  onEnhance: (enhancedPrompt: string) => void;
  onCancel: () => void;
}

type EnhancementLevel = 'minimal' | 'moderate' | 'extensive';

const PromptEnhancer: React.FC<PromptEnhancerProps> = ({ originalPrompt, onEnhance, onCancel }) => {
  const [isOpen, setIsOpen] = useState(true);
  const [level, setLevel] = useState<EnhancementLevel>('moderate');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCancel]);

  const generateEnhancement = async () => {
    if (!originalPrompt.trim()) {
      setError('Please enter a prompt first');
      return;
    }

    setIsEnhancing(true);
    setError(null);

    try {
      const levelInstructions = {
        minimal: 'Add only essential quality keywords like "high quality", "detailed", "8k resolution". Keep it brief.',
        moderate: 'Add lighting, style, and quality descriptors. Include atmosphere and mood. Be descriptive but concise.',
        extensive: 'Create a highly detailed prompt with camera angles, lighting setup, artistic style, mood, atmosphere, technical specifications, and rich descriptive language.'
      };

      const promptText = `Enhance this image generation prompt. ${levelInstructions[level]}

Original prompt: "${originalPrompt}"

Provide ONLY the enhanced prompt text, no explanations or markdown. Make it flow naturally and be suitable for AI image generation.`;

      // Call the Gemini API through our existing function
      const { generateContent } = await import('../lib/gemini');
      const enhanced = await generateContent(promptText, []);
      
      setPreview(enhanced);
    } catch (err) {
      setError('Failed to enhance prompt. Please try again.');
      console.error('Enhancement error:', err);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      onEnhance(preview);
      setIsOpen(false);
    }
  };

  const handleLevelChange = (newLevel: EnhancementLevel) => {
    setLevel(newLevel);
    setPreview(''); // Clear preview when level changes
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-[#1a1b1e] border border-[#2c2e33] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#2c2e33] bg-gradient-to-r from-pink-500/10 to-violet-500/10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Prompt Enhancer
            </h2>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-white transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Enhance your prompt with AI-powered descriptions
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
          {/* Enhancement Level Selector */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase mb-3 block">
              Enhancement Level
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['minimal', 'moderate', 'extensive'] as EnhancementLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => handleLevelChange(lvl)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    level === lvl
                      ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                      : 'bg-[#25262b] border-[#2c2e33] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-sm capitalize mb-1">{lvl}</div>
                  <div className="text-[10px] opacity-70">
                    {lvl === 'minimal' && 'Quality keywords only'}
                    {lvl === 'moderate' && 'Lighting + Style + Quality'}
                    {lvl === 'extensive' && 'Full detailed expansion'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Original Prompt Display */}
          <div>
            <label className="text-xs font-bold text-gray-300 uppercase mb-2 block">
              Original Prompt
            </label>
            <div className="p-3 bg-[#0f0f13] border border-[#2c2e33] rounded-lg text-sm text-gray-400 max-h-24 overflow-y-auto">
              {originalPrompt || 'No prompt entered'}
            </div>
          </div>

          {/* Generate Button */}
          {!preview && (
            <button
              onClick={generateEnhancement}
              disabled={isEnhancing || !originalPrompt.trim()}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                isEnhancing || !originalPrompt.trim()
                  ? 'bg-[#2c2e33] text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white'
              }`}
            >
              {isEnhancing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Enhancing...
                </span>
              ) : (
                'Generate Enhancement'
              )}
            </button>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Preview Section */}
          {preview && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase mb-2 block flex justify-between">
                  <span>Enhanced Preview</span>
                  <span className="text-pink-400">✨ AI Enhanced</span>
                </label>
                <div className="p-4 bg-[#25262b] border border-pink-500/30 rounded-lg text-sm text-gray-200 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {preview}
                </div>
              </div>

              {/* Comparison Stats */}
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-2 bg-[#0f0f13] rounded-lg">
                  <div className="text-[10px] text-gray-500 uppercase">Original Length</div>
                  <div className="text-lg font-bold text-gray-300">{originalPrompt.length}</div>
                  <div className="text-[10px] text-gray-600">characters</div>
                </div>
                <div className="p-2 bg-[#0f0f13] rounded-lg">
                  <div className="text-[10px] text-gray-500 uppercase">Enhanced Length</div>
                  <div className="text-lg font-bold text-pink-400">{preview.length}</div>
                  <div className="text-[10px] text-gray-600">characters</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-[#2c2e33] bg-[#141517] flex gap-3">
          {preview ? (
            <>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 text-white font-medium transition-all"
              >
                Apply Enhancement
              </button>
              <button
                onClick={() => setPreview('')}
                className="px-6 py-3 rounded-lg bg-[#25262b] border border-[#2c2e33] text-gray-400 hover:text-white transition-all"
              >
                Try Again
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-3 rounded-lg bg-[#25262b] border border-[#2c2e33] text-gray-400 hover:text-white transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onCancel}
              className="w-full py-3 rounded-lg bg-[#25262b] border border-[#2c2e33] text-gray-400 hover:text-white transition-all"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromptEnhancer;
