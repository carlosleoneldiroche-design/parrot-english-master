
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, ShieldCheck, Settings, AlertCircle, Headphones, Loader2, Info, ChevronRight, Lock } from 'lucide-react';

const SCENARIOS = [
  { id: 'general', icon: '🤖', label: 'Tutor General', prompt: 'You are a friendly English tutor.' },
  { id: 'airport', icon: '✈️', label: 'Aeropuerto', prompt: 'You are an airport customs officer. Be professional and firm.' },
  { id: 'restaurant', icon: '🍔', label: 'Restaurante', prompt: 'You are a waiter at a busy NYC restaurant. Be energetic and helpful.' },
  { id: 'interview', icon: '💼', label: 'Entrevista', prompt: 'You are a hiring manager at a tech company. Ask tough but fair questions.' },
  { id: 'church', icon: '⛪', label: 'Comunidad', prompt: 'You are a kind community leader welcoming a newcomer.' },
];

type PermissionState = 'checking' | 'granted' | 'denied' | 'prompt';

const LiveChat: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [status, setStatus] = useState('Listo para hablar');
  const [permissionState, setPermissionState] = useState<PermissionState>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  
  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    checkPermission();
    return () => stopSession();
  }, []);

  const checkPermission = async () => {
    if (!navigator.permissions || !navigator.permissions.query) {
      setPermissionState('prompt');
      return;
    }

    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setPermissionState(result.state as PermissionState);
      
      result.onchange = () => {
        setPermissionState(result.state as PermissionState);
      };
    } catch (e) {
      setPermissionState('prompt');
    }
  };

  const requestPermission = async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop()); 
      setPermissionState('granted');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ningún micrófono conectado.');
      } else {
        setErrorMessage('Error al acceder al micrófono.');
      }
    }
  };

  const startSession = async () => {
    try {
      setStatus('Conectando...');
      setErrorMessage(null);
      
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => { 
            setStatus('¡Adelante!'); 
            setIsActive(true); 
          },
          onmessage: async (message: LiveServerMessage) => {
             if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                playAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
             }
          },
          onerror: (e) => {
            console.error(e);
            setStatus('Error de conexión');
            setErrorMessage('La conexión con la IA falló.');
            stopSession();
          },
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `${scenario.prompt} Encourage the user and keep the role-play immersive.`,
          outputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
      
      const source = audioContextInRef.current!.createMediaStreamSource(stream);
      const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
        sessionPromise.then(session => {
          session.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } });
        });
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(audioContextInRef.current!.destination);

    } catch (err: any) { 
      console.error(err);
      setStatus('Error de micrófono');
      setErrorMessage(err.name === 'NotAllowedError' ? 'Permiso de micrófono denegado.' : 'No se pudo iniciar la sesión.');
    }
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (b: string) => new Uint8Array(atob(b).split("").map(c => c.charCodeAt(0)));

  const playAudio = async (data: string) => {
    if (!audioContextOutRef.current) return;
    const ctx = audioContextOutRef.current;
    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
    const buf = await decodeAudioData(decode(data), ctx, 24000, 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(nextStartTimeRef.current);
    nextStartTimeRef.current += buf.duration;
  };

  const decodeAudioData = async (d: Uint8Array, ctx: AudioContext, sr: number, ch: number) => {
    const i16 = new Int16Array(d.buffer);
    const buf = ctx.createBuffer(ch, i16.length/ch, sr);
    for(let c=0; c<ch; c++) { let cd = buf.getChannelData(c); for(let i=0; i<cd.length; i++) cd[i] = i16[i*ch+c]/32768; }
    return buf;
  };

  const stopSession = () => { 
    if (sessionRef.current) sessionRef.current.close();
    streamRef.current?.getTracks().forEach(t => t.stop()); 
    setIsActive(false); 
    setStatus('Listo para hablar');
  };

  const BrowserGuide = () => (
    <div className="bg-white p-8 rounded-[3rem] border-2 border-indigo-100 shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center text-white">
          <Settings size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-800">Guía de Configuración</h3>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pasos para habilitar tu voz</p>
        </div>
      </div>

      {/* Mock Browser UI for visual help */}
      <div className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-4 bg-white rounded-lg p-2 border border-gray-100 shadow-sm">
          <div className="bg-emerald-100 p-1.5 rounded-md text-emerald-600">
            <Lock size={14} />
          </div>
          <div className="h-4 bg-gray-100 rounded w-full flex items-center px-2 text-[10px] text-gray-400 font-mono">
            parrotai.app/...
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex gap-4 items-start">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-1">1</div>
            <p className="text-sm font-bold text-gray-600">
              Haz clic en el icono del <span className="text-emerald-600 font-black">candado 🔒</span> o en el icono de <span className="text-indigo-600 font-black">ajustes ⚙️</span> a la izquierda de la dirección web.
            </p>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-1">2</div>
            <p className="text-sm font-bold text-gray-600">
              Busca la opción <span className="text-gray-800 font-black">"Micrófono"</span> en la lista de permisos.
            </p>
          </div>
          <div className="flex gap-4 items-start">
            <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-1">3</div>
            <p className="text-sm font-bold text-gray-600">
              Cambia el interruptor a <span className="text-emerald-600 font-black">"Permitir"</span> o "Activado".
            </p>
          </div>
        </div>
      </div>

      <button 
        onClick={() => {
          if (permissionState === 'denied') window.location.reload();
          else setShowGuide(false);
        }}
        className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
      >
        {permissionState === 'denied' ? 'ENTENDIDO, RECARGAR' : 'CONTINUAR'}
        <ChevronRight size={18} />
      </button>
    </div>
  );

  if (permissionState === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 animate-pulse text-gray-300">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-black uppercase tracking-widest text-xs">Comprobando micrófono...</p>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-8 animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-red-100 rounded-[2rem] flex items-center justify-center text-red-500 shadow-lg shadow-red-50">
          <MicOff size={48} />
        </div>
        <div className="space-y-4 max-w-sm">
          <h2 className="text-3xl font-black text-gray-800">Acceso Denegado</h2>
          <p className="text-gray-500 font-bold leading-relaxed">
            Parece que el micrófono está bloqueado en este sitio. No podemos escucharte si no habilitas el permiso.
          </p>
        </div>
        
        <BrowserGuide />

        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Necesitas recargar la página tras cambiar el permiso</p>
      </div>
    );
  }

  if (permissionState === 'prompt') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 text-center space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
        {showGuide ? (
          <BrowserGuide />
        ) : (
          <>
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-3xl opacity-20 animate-pulse" />
              <div className="w-40 h-40 bg-white border-4 border-emerald-100 rounded-[3rem] flex items-center justify-center text-7xl shadow-xl relative z-10">
                🎙️
              </div>
            </div>
            <div className="space-y-4 max-w-md">
              <h2 className="text-3xl font-black text-gray-800">Activa tu voz</h2>
              <p className="text-gray-500 font-bold leading-relaxed">
                Parrot necesita tu permiso para escucharte. Al pulsar el botón, verás una ventana emergente del navegador.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <button 
                onClick={requestPermission}
                className="w-full py-5 bg-emerald-500 text-white font-black rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-3"
              >
                <ShieldCheck size={24} /> PERMITIR MICRÓFONO
              </button>
              <button 
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
              >
                <Info size={14} /> ¿CÓMO PERMITIR EL ACCESO?
              </button>
            </div>
            {errorMessage && (
              <p className="text-red-500 text-xs font-bold flex items-center gap-2 bg-red-50 px-4 py-2 rounded-xl border border-red-100">
                <AlertCircle size={14} /> {errorMessage}
              </p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] space-y-6 animate-in fade-in duration-500">
      <header className="bg-white border-2 border-gray-100 p-6 rounded-3xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Escenario de Práctica</h3>
          <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full border border-emerald-100">
            <ShieldCheck size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">Micrófono Listo</span>
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
          {SCENARIOS.map(s => (
            <button 
              key={s.id}
              onClick={() => { setScenario(s); isActive && stopSession(); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all min-w-[100px] ${scenario.id === s.id ? 'bg-indigo-50 border-indigo-500' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{s.icon}</span>
              <span className={`text-xs font-bold ${scenario.id === s.id ? 'text-indigo-600' : 'text-gray-500'}`}>{s.label}</span>
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 bg-white rounded-3xl border-2 border-gray-100 shadow-sm flex flex-col items-center justify-center p-10 text-center space-y-8 relative overflow-hidden group">
        {isActive && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse" />
          </div>
        )}
        
        <div className={`w-48 h-48 rounded-[3.5rem] flex items-center justify-center text-8xl shadow-2xl transition-all duration-700 relative z-10 ${isActive ? 'bg-indigo-100 scale-110 shadow-indigo-100 border-4 border-indigo-400' : 'bg-gray-50 border-4 border-transparent'}`}>
          {scenario.icon}
          {isActive && (
            <div className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-2xl animate-bounce shadow-lg">
              <Headphones size={24} />
            </div>
          )}
        </div>

        <div className="relative z-10 space-y-2">
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Practicando: {scenario.label}</h2>
          <p className="text-gray-500 font-bold max-w-xs mx-auto text-sm leading-relaxed">
            {isActive ? 'Escuchando... ¡Háblame con confianza!' : 'La IA actuará según este contexto para una experiencia inmersiva.'}
          </p>
        </div>

        <div className="flex flex-col items-center gap-6 relative z-10">
          <div className="flex flex-col items-center gap-2">
            <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full border transition-all duration-500 ${isActive ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
              {status}
            </span>
          </div>
          
          <button 
            onClick={isActive ? stopSession : startSession}
            className={`w-28 h-28 rounded-full flex items-center justify-center text-4xl text-white shadow-2xl transition-all active:scale-90 ${isActive ? 'bg-red-500 animate-pulse shadow-red-200 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
          >
            {isActive ? '⏹️' : <Mic size={40} />}
          </button>
          
          <p className="text-xs font-black text-gray-300 uppercase tracking-widest">
            {isActive ? 'Haz clic para finalizar' : 'Pulsa para empezar a hablar'}
          </p>
        </div>
        
        {errorMessage && (
          <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold border border-red-100 animate-in shake duration-300">
            ⚠️ {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveChat;
