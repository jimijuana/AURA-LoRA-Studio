"use client";

import { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ResultDisplay from './components/ResultDisplay';
import Gallery from './components/Gallery';
import PromptEnhancer from './components/PromptEnhancer';
import { generateImage, ImageProvider } from './lib/imageService';

// Storage key for localStorage
const STORAGE_KEY = 'aura-studio-settings';

// Default settings
const defaultSettings = {
  prompt: '',
  gender: 'Unspecified',
  ethnicity: 'Unspecified',
  bodyType: 'Unspecified',
  bodyShape: 'Unspecified',
  torsoLegRatio: 'Unspecified',
  shoulderWidth: 'Unspecified',
  limbProportions: 'Unspecified',
  hairStyle: 'Unspecified',
  clothing: 'Unspecified',
  location: '',
  backgroundDesc: '',
  negativePrompt: '',
  aspectRatio: '1:1',
  temperature: 0.7,
  seed: null as number | null,
  stylePreset: '',
  provider: 'gemini' as ImageProvider,
  ckptName: '',
  loras: [] as { name: string; strength: number }[],
  batchCount: 1,
  controlNets: [] as { model: string; image: File; strength: number }[]
};

export default function Home() {
  const [prompt, setPrompt] = useState(defaultSettings.prompt);

  // Advanced State: Multi-Image
  const [faceImages, setFaceImages] = useState<File[]>([]);
  const [facePreviews, setFacePreviews] = useState<string[]>([]);

  const [backgroundImages, setBackgroundImages] = useState<File[]>([]);
  const [bgPreviews, setBgPreviews] = useState<string[]>([]);

  // Character Builder State
  const [gender, setGender] = useState(defaultSettings.gender);
  const [ethnicity, setEthnicity] = useState(defaultSettings.ethnicity);
  const [bodyType, setBodyType] = useState(defaultSettings.bodyType);
  const [bodyShape, setBodyShape] = useState(defaultSettings.bodyShape);
  const [torsoLegRatio, setTorsoLegRatio] = useState(defaultSettings.torsoLegRatio);
  const [shoulderWidth, setShoulderWidth] = useState(defaultSettings.shoulderWidth);
  const [limbProportions, setLimbProportions] = useState(defaultSettings.limbProportions);
  const [hairStyle, setHairStyle] = useState(defaultSettings.hairStyle);
  const [clothing, setClothing] = useState(defaultSettings.clothing);

  const [location, setLocation] = useState(defaultSettings.location);
  const [backgroundDesc, setBackgroundDesc] = useState(defaultSettings.backgroundDesc);
  const [negativePrompt, setNegativePrompt] = useState(defaultSettings.negativePrompt);
  const [aspectRatio, setAspectRatio] = useState(defaultSettings.aspectRatio);

  // Generation Parameters
  const [temperature, setTemperature] = useState(defaultSettings.temperature);
  const [seed, setSeed] = useState<number | null>(defaultSettings.seed);
  const [stylePreset, setStylePreset] = useState(defaultSettings.stylePreset);
  const [provider, setProvider] = useState<ImageProvider>(defaultSettings.provider);
  const [ckptName, setComfyModel] = useState(defaultSettings.ckptName);

  // LoRA Support
  const [loras, setLoras] = useState<{ name: string; strength: number }[]>([]);

  // Batch Generation
  const [batchCount, setBatchCount] = useState<number>(1);

  // ControlNet Support
  const [controlNets, setControlNets] = useState<{ model: string; image: File; strength: number }[]>([]);

  // Load settings from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = { ...defaultSettings, ...JSON.parse(saved) };
        setPrompt(s.prompt);
        setGender(s.gender);
        setEthnicity(s.ethnicity);
        setBodyType(s.bodyType);
        setBodyShape(s.bodyShape);
        setTorsoLegRatio(s.torsoLegRatio);
        setShoulderWidth(s.shoulderWidth);
        setLimbProportions(s.limbProportions);
        setHairStyle(s.hairStyle);
        setClothing(s.clothing);
        setLocation(s.location);
        setBackgroundDesc(s.backgroundDesc);
        setNegativePrompt(s.negativePrompt);
        setAspectRatio(s.aspectRatio);
        setTemperature(s.temperature);
        setSeed(s.seed);
        setStylePreset(s.stylePreset);
        setProvider(s.provider);
        setComfyModel(s.ckptName || '');
        if (s.loras) setLoras(s.loras);
        if (s.batchCount) setBatchCount(s.batchCount);
        if (s.controlNets) setControlNets(s.controlNets);
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);


  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ result: string; seed: number | null; timestamp: number }[]>([]);

  // Generation Metadata for displaying seed and settings
  const [generationMetadata, setGenerationMetadata] = useState<{
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
  } | null>(null);

  // Prompt Enhancer State
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState<string>('');
  const [canUndo, setCanUndo] = useState(false);

  // Clipboard Paste State
  const [showPasteMenu, setShowPasteMenu] = useState(false);
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pasteTarget, setPasteTarget] = useState<'face' | 'background' | null>(null);
  const [pasteNotification, setPasteNotification] = useState<string | null>(null);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const settingsToSave = {
      prompt,
      gender,
      ethnicity,
      bodyType,
      bodyShape,
      torsoLegRatio,
      shoulderWidth,
      limbProportions,
      hairStyle,
      clothing,
      location,
      backgroundDesc,
      negativePrompt,
      aspectRatio,
      temperature,
      seed,
      stylePreset,
      provider,
      ckptName,
      loras,
      batchCount,
      controlNets
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
  }, [prompt, gender, ethnicity, bodyType, bodyShape, torsoLegRatio, shoulderWidth, limbProportions, hairStyle, clothing, location, backgroundDesc, negativePrompt, aspectRatio, temperature, seed, stylePreset, provider, ckptName, loras, batchCount, controlNets]);

  // Enhanced descriptive dictionaries for better AI adherence
  const bodyTypeEnhancements: Record<string, string> = {
    'Unspecified': '',
    'Slim': 'slender, lean physique with minimal body fat, thin frame, lightweight build',
    'Athletic': 'athletic, toned physique with visible muscle definition, fit and muscular build, well-defined muscles',
    'Average': 'average, medium build with balanced proportions, neither thin nor heavy, normal body composition',
    'Chubby': 'plus-size, full-figured build with rounded features, visible body fat, soft and curvy physique, overweight with plump appearance',
    'Muscular': 'heavily muscular, bodybuilder physique with prominent muscle mass, large and powerful build, extremely defined muscles',
    'Curvy': 'hourglass figure with pronounced curves, voluptuous build with full hips and bust, shapely and rounded physique'
  };

  // Generate smart negative prompts based on selected body type
  const generateSmartNegativePrompt = (selectedBodyType: string): string => {
    const exclusions: Record<string, string> = {
      'Slim': 'overweight, obese, chubby, fat, plus-size, heavyset, thick, curvy, voluptuous, large build',
      'Athletic': 'overweight, obese, skinny, emaciated, frail, weak, underweight, extremely thin, no muscle definition',
      'Average': 'extremely thin, skeletal, emaciated, obese, morbidly obese, unrealistic proportions, exaggerated features',
      'Chubby': 'skinny, thin, slim, athletic, muscular, underweight, lean, defined muscles, six-pack abs, gaunt',
      'Muscular': 'skinny, thin, overweight, obese, chubby, fat, weak, frail, no muscle definition, soft physique',
      'Curvy': 'skinny, thin, emaciated, stick-thin, boyish figure, flat, no curves, athletic build, rectangular shape'
    };

    return exclusions[selectedBodyType] || '';
  };

  // Check if smart negative prompts are being added
  const smartNegativeAdded = bodyType !== 'Unspecified';

  // Prompt Enhancer Handlers
  const handleOpenEnhancer = () => {
    setOriginalPrompt(prompt);
    setShowEnhancer(true);
  };

  const handleEnhancePrompt = (enhancedText: string) => {
    setPrompt(enhancedText);
    setCanUndo(true);
    setShowEnhancer(false);
  };

  const handleUndoEnhancement = () => {
    if (originalPrompt) {
      setPrompt(originalPrompt);
      setCanUndo(false);
    }
  };

  const handleCancelEnhancer = () => {
    setShowEnhancer(false);
  };

  const handleGenerate = async () => {
    if (!prompt && faceImages.length === 0 && backgroundImages.length === 0) {
      setError("Please provide a prompt or reference images.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const enhancedBodyType = bodyType !== 'Unspecified' ? bodyTypeEnhancements[bodyType] : '';
      const smartNegative = bodyType !== 'Unspecified' ? generateSmartNegativePrompt(bodyType) : '';
      const combinedNegativePrompt = negativePrompt + (smartNegative ? `, ${smartNegative}` : '');

      const fullPrompt = `
[CRITICAL ATTRIBUTES - MUST FOLLOW STRICTLY]
(((PRIORITY CHARACTER SPECIFICATIONS)))
${gender !== 'Unspecified' ? `Gender: ${gender} - CRITICAL, must be clearly visible and accurate` : ''}
${ethnicity !== 'Unspecified' ? `Ethnicity: ${ethnicity} - CRITICAL, must accurately represent this ethnicity` : ''}
${bodyType !== 'Unspecified' ? `Body Type: ${bodyType} - CRITICAL, must show ${enhancedBodyType}. This is ESSENTIAL.` : ''}
${bodyShape !== 'Unspecified' ? `Body Shape: ${bodyShape} figure` : ''}
${torsoLegRatio !== 'Unspecified' ? `Torso-Leg Ratio: ${torsoLegRatio}` : ''}
${shoulderWidth !== 'Unspecified' ? `Shoulder Width: ${shoulderWidth} shoulders` : ''}
${limbProportions !== 'Unspecified' ? `Limb Proportions: ${limbProportions}` : ''}
${hairStyle !== 'Unspecified' ? `Hair Style: ${hairStyle} - must be clearly depicted` : ''}

[CHARACTER DETAILS]
${clothing !== 'Unspecified' ? `Clothing: ${clothing}` : ''}

[CREATIVE DESCRIPTION]
${prompt}
${stylePreset ? `Style: ${stylePreset}` : ''}

[SCENE CONTEXT]
${location ? `Location: ${location}` : ''}
${backgroundDesc ? `Background: ${backgroundDesc}` : ''}

[GENERATION REQUIREMENTS]
Aspect Ratio: ${aspectRatio}
Temperature: ${temperature}
${seed ? `Seed: ${seed}` : ''}
${combinedNegativePrompt ? `AVOID THESE ELEMENTS: ${combinedNegativePrompt}` : ''}

[STRICT INSTRUCTIONS]
1. CHARACTER ATTRIBUTES ABOVE ARE MANDATORY - do not ignore or modify them
2. Body type must be EXACTLY as specified - use visual weight, proportions, and silhouette to achieve this
3. Reference images should guide facial features and overall style
4. All critical attributes must be clearly visible and accurate in the final image
      `.trim();

      const allImages = [...faceImages, ...backgroundImages];

      const response = await generateImage({
        provider,
        prompt: fullPrompt,
        images: allImages,
        temperature,
        seed: seed ?? undefined,
        negativePrompt: combinedNegativePrompt,
        stylePreset,
        ckptName,
        loras: loras.length > 0 ? loras : undefined,
        batchCount: provider === 'comfyui' ? batchCount : 1,
        controlNets: controlNets.length > 0 ? controlNets : undefined
      });

      const actualSeed = seed ?? Math.floor(Math.random() * 1000000);
      setGenerationMetadata({
        seed: actualSeed,
        temperature,
        prompt,
        gender,
        ethnicity,
        bodyType,
        bodyShape,
        torsoLegRatio,
        shoulderWidth,
        limbProportions,
        hairStyle,
        clothing,
        location,
        aspectRatio,
        stylePreset
      });

      setResult(response);
      setHistory(prev => [{ result: response, seed: actualSeed, timestamp: Date.now() }, ...prev]);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectHistory = (item: { result: string; seed: number | null; timestamp: number }) => {
    setResult(item.result);
    if (generationMetadata) {
      setGenerationMetadata({
        ...generationMetadata,
        seed: item.seed
      });
    }
  };

  // Reset functions
  const resetAll = () => {
    setPrompt('');
    setGender('Unspecified');
    setEthnicity('Unspecified');
    setBodyType('Unspecified');
    setBodyShape('Unspecified');
    setTorsoLegRatio('Unspecified');
    setShoulderWidth('Unspecified');
    setLimbProportions('Unspecified');
    setHairStyle('Unspecified');
    setClothing('Unspecified');
    setLocation('');
    setBackgroundDesc('');
    setNegativePrompt('');
    setAspectRatio('1:1');
    setTemperature(0.7);
    setSeed(null);
    setStylePreset('');
    setProvider('gemini');
    setComfyModel('');
    setFaceImages([]);
    setFacePreviews([]);
    setBackgroundImages([]);
    setBgPreviews([]);
    setCanUndo(false);
    setOriginalPrompt('');
    setLoras([]);
    setBatchCount(1);
    setControlNets([]);
  };

  const resetCharacter = () => {
    setGender('Unspecified');
    setEthnicity('Unspecified');
    setBodyType('Unspecified');
    setBodyShape('Unspecified');
    setTorsoLegRatio('Unspecified');
    setShoulderWidth('Unspecified');
    setLimbProportions('Unspecified');
    setHairStyle('Unspecified');
    setClothing('Unspecified');
    setFaceImages([]);
    setFacePreviews([]);
  };

  const resetScene = () => {
    setLocation('');
    setBackgroundDesc('');
    setBackgroundImages([]);
    setBgPreviews([]);
  };

  // Process pasted image and add to appropriate section
  const processPastedImage = useCallback((file: File, target: 'face' | 'background') => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (target === 'face') {
        setFaceImages(prev => [...prev, file]);
        setFacePreviews(prev => [...prev, result]);
        showPasteNotification('Image added to Face References!');
      } else {
        setBackgroundImages(prev => [...prev, file]);
        setBgPreviews(prev => [...prev, result]);
        showPasteNotification('Image added to Background References!');
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // Show temporary paste notification
  const showPasteNotification = (message: string) => {
    setPasteNotification(message);
    setTimeout(() => setPasteNotification(null), 3000);
  };

  // Handle paste from clipboard
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Don't handle paste if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile: File | null = null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          imageFile = file;
          break;
        }
      }
    }

    if (imageFile) {
      e.preventDefault();
      setPastedImage(imageFile);
      setShowPasteMenu(true);
    }
  }, []);

  // Add pasted image to selected target
  const addPastedImage = (target: 'face' | 'background') => {
    if (pastedImage) {
      processPastedImage(pastedImage, target);
      setPastedImage(null);
      setShowPasteMenu(false);
    }
  };

  // Setup paste event listener and keyboard shortcuts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('paste', handlePaste);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showPasteMenu) return;

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        addPastedImage('face');
      } else if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        addPastedImage('background');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPasteMenu(false);
        setPastedImage(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlePaste, showPasteMenu, addPastedImage]);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [mobileGalleryOpen, setMobileGalleryOpen] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch swipe to close sidebar
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || !isMobile || !sidebarOpen) return;
    
    const currentX = e.touches[0].clientX;
    const diff = touchStart - currentX;
    
    // If swiped left more than 100px, close sidebar
    if (diff < -100) {
      setSidebarOpen(false);
      setTouchStart(null);
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  return (
    <div className="flex h-screen w-screen bg-[#09090b] text-white overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 h-14 bg-[#1a1b1e] border-b border-[#2c2e33] z-30 flex items-center justify-between px-4 lg:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-[#25262b] hover:bg-[#2c2e33] transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-violet-400">
            Aura Studio
          </h1>
          <div className="w-9" /> {/* Spacer for centering */}
        </div>
      )}

      {/* Left Sidebar - Inputs */}
      <div 
        className={`
          ${isMobile 
            ? `fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
            : 'relative'
          }
          lg:relative lg:transform-none
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Sidebar
          isMobile={isMobile}
          onCloseMobile={() => setSidebarOpen(false)}
        prompt={prompt}
        setPrompt={setPrompt}

        // Character Builder
        gender={gender}
        setGender={setGender}
        ethnicity={ethnicity}
        setEthnicity={setEthnicity}
        bodyType={bodyType}
        setBodyType={setBodyType}
        bodyShape={bodyShape}
        setBodyShape={setBodyShape}
        torsoLegRatio={torsoLegRatio}
        setTorsoLegRatio={setTorsoLegRatio}
        shoulderWidth={shoulderWidth}
        setShoulderWidth={setShoulderWidth}
        limbProportions={limbProportions}
        setLimbProportions={setLimbProportions}
        hairStyle={hairStyle}
        setHairStyle={setHairStyle}
        clothing={clothing}
        setClothing={setClothing}

        // Multi-Image Face
        faceImages={faceImages}
        setFaceImages={setFaceImages}
        facePreviews={facePreviews}
        setFacePreviews={setFacePreviews}

        location={location}
        setLocation={setLocation}

        backgroundDesc={backgroundDesc}
        setBackgroundDesc={setBackgroundDesc}

        // Multi-Image Background
        backgroundImages={backgroundImages}
        setBackgroundImages={setBackgroundImages}
        bgPreviews={bgPreviews}
        setBgPreviews={setBgPreviews}

        negativePrompt={negativePrompt}
        setNegativePrompt={setNegativePrompt}

        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}

        // Generation Parameters
        temperature={temperature}
        setTemperature={setTemperature}
        seed={seed}
        setSeed={setSeed}
        stylePreset={stylePreset}
        setStylePreset={setStylePreset}
        provider={provider}
        setProvider={setProvider}
        ckptName={ckptName}
        setComfyModel={setComfyModel}

        // LoRA Support
        loras={loras}
        setLoras={setLoras}

        // Batch Generation
        batchCount={batchCount}
        setBatchCount={setBatchCount}

        // ControlNet Support
        controlNets={controlNets}
        setControlNets={setControlNets}

        // Prompt Preview
        smartNegativeAdded={smartNegativeAdded}

        // Prompt Enhancer
        onOpenEnhancer={handleOpenEnhancer}
        canUndoEnhancement={canUndo}
        onUndoEnhancement={handleUndoEnhancement}

        handleGenerate={handleGenerate}
        loading={loading}

        // Reset Functions
        resetAll={resetAll}
        resetCharacter={resetCharacter}
        resetScene={resetScene}
      />
      </div>

      {/* Middle - Result Display */}
      <div className={`flex-1 flex flex-col ${isMobile ? 'pt-14 pb-20' : ''} min-w-0`}>
        <ResultDisplay
          result={result}
          loading={loading}
          error={error}
          metadata={generationMetadata}
        />
        
        {/* Mobile Generate Button */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#09090b] to-transparent lg:hidden z-20">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all ${
                loading
                  ? 'bg-gray-700 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-600 to-violet-600 hover:from-pink-500 hover:to-violet-500 shadow-lg shadow-pink-500/25'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating...
                </span>
              ) : (
                'Generate'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Right Sidebar - Gallery - desktop */}
      <div className="hidden xl:block w-64 border-l border-[#2c2e33]">
        <Gallery
          history={history}
          onSelect={handleSelectHistory}
        />
      </div>

      {/* Mobile Gallery Toggle */}
      {isMobile && (
        <button
          onClick={() => setMobileGalleryOpen(true)}
          className="fixed right-4 top-1/2 -translate-y-1/2 bg-[#1a1b1e] border border-[#2c2e33] p-3 rounded-full shadow-lg z-20"
          aria-label="Open gallery"
        >
          <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
      )}

      {/* Mobile Gallery Panel */}
      {isMobile && mobileGalleryOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setMobileGalleryOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-[#09090b] border-l border-[#2c2e33] z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[#2c2e33]">
              <h2 className="font-bold text-white">Gallery</h2>
              <button
                onClick={() => setMobileGalleryOpen(false)}
                className="p-2 rounded-lg hover:bg-[#25262b]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Gallery
                history={history}
                onSelect={(item) => {
                  handleSelectHistory(item);
                  setMobileGalleryOpen(false);
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Prompt Enhancer Modal */}
      {showEnhancer && (
        <PromptEnhancer
          originalPrompt={prompt}
          onEnhance={handleEnhancePrompt}
          onCancel={handleCancelEnhancer}
        />
      )}

      {/* Paste Menu Overlay */}
      {showPasteMenu && pastedImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasteMenu(false);
              setPastedImage(null);
            }
          }}
        >
          <div className="bg-[#1a1b1e] border border-[#2c2e33] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Image Pasted!
              </h3>
              <span className="text-[10px] text-gray-500 bg-[#25262b] px-2 py-1 rounded">Ctrl+V</span>
            </div>

            {/* Preview */}
            <div className="mb-6 rounded-lg overflow-hidden border border-[#2c2e33] relative group">
              <img
                src={URL.createObjectURL(pastedImage)}
                alt="Pasted preview"
                className="w-full h-48 object-contain bg-[#0f0f13]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            <p className="text-sm text-gray-400 mb-4">Where would you like to add this image?</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => addPastedImage('face')}
                className="p-4 rounded-xl bg-[#25262b] hover:bg-pink-500/20 border-2 border-[#2c2e33] hover:border-pink-500 transition-all text-center group relative overflow-hidden"
                autoFocus
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-2xl mb-2">👤</div>
                  <div className="text-sm font-medium text-white group-hover:text-pink-400">Face Reference</div>
                  <div className="text-[10px] text-gray-500 mt-1 group-hover:text-pink-300/70">Press F</div>
                </div>
              </button>

              <button
                onClick={() => addPastedImage('background')}
                className="p-4 rounded-xl bg-[#25262b] hover:bg-violet-500/20 border-2 border-[#2c2e33] hover:border-violet-500 transition-all text-center group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="text-2xl mb-2">🖼️</div>
                  <div className="text-sm font-medium text-white group-hover:text-violet-400">Background Reference</div>
                  <div className="text-[10px] text-gray-500 mt-1 group-hover:text-violet-300/70">Press B</div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowPasteMenu(false);
                setPastedImage(null);
              }}
              className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <span>Cancel</span>
              <span className="text-[10px] bg-[#25262b] px-1.5 py-0.5 rounded">Esc</span>
            </button>
          </div>
        </div>
      )}

      {/* Paste Notification Toast */}
      {pasteNotification && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-full shadow-lg z-50 animate-fade-in flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {pasteNotification}
        </div>
      )}

      {/* Paste Hint */}
      <div className="fixed bottom-4 right-4 text-[10px] text-gray-600 bg-[#1a1b1e]/80 px-3 py-2 rounded-lg border border-[#2c2e33] z-40 flex items-center gap-2">
        <span>Tip:</span>
        <span className="text-gray-500">Ctrl+V or Drag images</span>
      </div>
    </div>
  );
}
