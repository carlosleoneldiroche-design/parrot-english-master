
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { analyzeVideoContent } from '../services/geminiService';
import { AlertCircle, Video, Brain, Upload, Sparkles, Key } from 'lucide-react';

// Removed declare global to avoid conflicts with existing types and modifier errors.
// Using (window as any).aistudio instead for safety.

const VideoLab: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'generate' | 'analyze'>('generate');
  const [image, setImage] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    // Cast window to any to access aistudio safely and avoid interface merging issues
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      const selected = await aistudio.hasSelectedApiKey();
      setHasKey(selected);
    } else {
      setHasKey(true); // Fallback for env-based keys
    }
  };

  const handleOpenKeySelector = async () => {
    // Cast window to any to access aistudio safely and avoid interface merging issues
    const aistudio = (window as any).aistudio;
    if (aistudio) {
      await aistudio.openSelectKey();
      // Assume success after triggering openSelectKey to mitigate race condition as per guidelines
      setHasKey(true);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
  };

  const startAnalysis = async () => {
    if (!videoFile) return;
    setIsProcessing(true);
    setAnalysisResult(null);
    setStatusMessage('Gemini 3 Pro analizando video...');
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(videoFile);
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await analyzeVideoContent(base64);
        setAnalysisResult(result);
        setIsProcessing(false);
      };
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error al analizar el video.');
      setIsProcessing(false);
    }
  };

  const generateVideo = async () => {
    if (!image) return;
    setIsProcessing(true);
    setVideoUrl(null);
    setStatusMessage('Iniciando Veo 3.1...');

    try {
      // Create fresh instance before API call to ensure it always uses the most up-to-date API key
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = image.split(',')[1];

      const messages = [
        "Preparando lienzos digitales...",
        "Dibujando fotogramas clave...",
        "Modelando el movimiento temporal...",
        "Afinando los detalles visuales...",
        "Casi listo para el estreno..."
      ];
      
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
        setStatusMessage(messages[msgIdx % messages.length]);
        msgIdx++;
      }, 5000);

      let operation = (await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || 'Animate this image in a cinematic and fluid way',
        image: { imageBytes: base64Data, mimeType: 'image/png' },
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      })) as any;

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
      }

      clearInterval(msgInterval);

      if (operation.error) {
        throw new Error(operation.error.message || "Error en la generación");
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No se obtuvo el enlace de descarga");

      const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
      if (!videoResponse.ok) throw new Error("Error descargando el video");
      
      const blob = await videoResponse.blob();
      setVideoUrl(URL.createObjectURL(blob));
    } catch (error: any) {
      console.error(error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasKey(false);
        setStatusMessage('Error: Clave API no válida. Por favor, selecciona una de nuevo.');
      } else {
        setStatusMessage('Error en la generación: ' + error.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex bg-white p-1.5 rounded-3xl border-2 border-gray-100 shadow-sm w-fit mx-auto">
        <button 
          onClick={() => setActiveMode('generate')}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-all ${activeMode === 'generate' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-purple-600'}`}
        >
          <Video size={18} /> GENERAR VEO
        </button>
        <button 
          onClick={() => setActiveMode('analyze')}
          className={`flex items-center gap-2 px-8 py-3 rounded-2xl font-black text-sm transition-all ${activeMode === 'analyze' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-indigo-600'}`}
        >
          <Brain size={18} /> ANALIZAR PRO
        </button>
      </div>

      {activeMode === 'generate' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-50 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-800">Animación con Veo</h3>
              {hasKey === false && (
                <button 
                  onClick={handleOpenKeySelector}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-200 transition-all"
                >
                  <Key size={12} /> SELECCIONAR CLAVE PAGA
                </button>
              )}
            </div>

            {hasKey === false ? (
              <div className="p-6 bg-yellow-50 rounded-2xl border border-yellow-100 text-center">
                <AlertCircle className="mx-auto text-yellow-500 mb-2" size={32} />
                <p className="text-xs font-bold text-yellow-700 leading-relaxed mb-4">
                  Veo requiere una clave API de un proyecto con facturación habilitada.
                </p>
                <a 
                  href="https://ai.google.dev/gemini-api/docs/billing" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[10px] text-yellow-600 underline font-black block mb-4"
                >
                  DOCUMENTACIÓN DE FACTURACIÓN
                </a>
                <button 
                  onClick={handleOpenKeySelector}
                  className="w-full py-4 bg-yellow-500 text-white font-black rounded-xl shadow-lg hover:bg-yellow-600 transition-all"
                >
                  CONFIGURAR CLAVE AHORA
                </button>
              </div>
            ) : (
              <>
                <div 
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                  className="h-64 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex items-center justify-center cursor-pointer hover:bg-purple-50 transition-all overflow-hidden relative group"
                >
                  {image ? (
                    <img src={image} className="h-full w-full object-cover" alt="Upload" />
                  ) : (
                    <div className="text-center">
                      <Upload className="mx-auto text-gray-300 mb-2" size={48} />
                      <p className="text-sm font-black text-gray-400">SUBIR IMAGEN INICIAL</p>
                    </div>
                  )}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Instrucción de Movimiento</label>
                  <textarea 
                    className="w-full p-6 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-purple-400 h-32 font-bold text-gray-700 outline-none"
                    placeholder="Describe qué debería pasar en el video..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                  />
                </div>
                <button 
                  onClick={generateVideo} 
                  disabled={isProcessing || !image}
                  className="w-full py-5 bg-purple-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-3"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : <Sparkles size={20} />}
                  {isProcessing ? 'PROCESANDO...' : 'GENERAR VIDEO'}
                </button>
              </>
            )}
          </div>
          <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm flex items-center justify-center p-8 min-h-[500px]">
            {videoUrl ? (
              <video src={videoUrl} controls autoPlay loop className="w-full rounded-2xl shadow-2xl" />
            ) : isProcessing ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                   <Video className="text-purple-500" size={32} />
                </div>
                <p className="font-black text-purple-600 animate-pulse uppercase tracking-widest text-xs">{statusMessage}</p>
                <p className="text-[10px] text-gray-400 font-bold max-w-xs mx-auto">
                  La generación puede tardar hasta 2 minutos. No cierres esta ventana.
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-200">
                <Video className="mx-auto mb-4 opacity-20" size={120} />
                <p className="font-black">Tu creación aparecerá aquí</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-[3rem] border-2 border-gray-50 shadow-sm space-y-6">
            <h3 className="text-2xl font-black text-gray-800">Análisis Inteligente</h3>
            <p className="text-gray-400 font-bold">Sube un video para que Gemini 3 Pro extraiga lecciones, gramática y vocabulario.</p>
            <div 
              onClick={() => !isProcessing && videoInputRef.current?.click()}
              className="h-64 border-4 border-dashed border-gray-100 rounded-[2.5rem] flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 transition-all"
            >
              <Upload className="text-gray-300 mb-4" size={48} />
              <p className="font-black text-gray-400">{videoFile ? videoFile.name : 'Seleccionar archivo .mp4'}</p>
              <input type="file" ref={videoInputRef} className="hidden" accept="video/mp4" onChange={handleVideoUpload} />
            </div>
            <button 
              onClick={startAnalysis}
              disabled={isProcessing || !videoFile}
              className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:scale-[1.02] active:scale-95 disabled:bg-gray-200 transition-all flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : <Brain size={20} />}
              {isProcessing ? 'ANALIZANDO...' : 'INICIAR ANÁLISIS PRO'}
            </button>
          </div>
          <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-sm p-8 min-h-[500px] overflow-y-auto">
            {isProcessing && (
              <div className="h-full flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-indigo-500 animate-pulse">{statusMessage}</p>
              </div>
            )}
            {analysisResult ? (
              <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                <h4 className="text-xl font-black text-indigo-600 mb-6 flex items-center gap-2">
                   <Sparkles size={20} /> Insight del Tutor AI
                </h4>
                <div className="space-y-4 whitespace-pre-wrap font-bold leading-relaxed text-gray-700 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  {analysisResult}
                </div>
              </div>
            ) : !isProcessing && (
              <div className="h-full flex items-center justify-center text-gray-200 font-black text-center">
                <div className="space-y-4">
                   <Brain size={80} className="mx-auto opacity-10" />
                   <p>Sube un video para ver el análisis de Gemini 3 Pro</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoLab;
