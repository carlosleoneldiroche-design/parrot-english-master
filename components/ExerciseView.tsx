
import React, { useState, useEffect, useRef } from 'react';
import { Exercise, PronunciationFeedback, SavedPhrase } from '../types';
import { playPronunciation, analyzePronunciation, transcribeAudio } from '../services/geminiService';
import { Mic, CheckCircle2, XCircle, Info, Bookmark, BookmarkCheck, Volume2, Sparkles, AlertCircle, Clock, Timer } from 'lucide-react';

interface ExerciseViewProps {
  exercise: Exercise;
  onNext: (isCorrect: boolean) => void;
  onSave: (phrase: Omit<SavedPhrase, 'id' | 'timestamp' | 'masteryLevel'>) => void;
  isSaved: boolean;
  isExpert?: boolean;
}

const ExerciseView: React.FC<ExerciseViewProps> = ({ exercise, onNext, onSave, isSaved, isExpert }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [isChecked, setIsChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  
  // Timer for Expert Mode
  const [timeLeft, setTimeLeft] = useState(20);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<PronunciationFeedback | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setSelectedOption(null);
    setAnswer('');
    setIsChecked(false);
    setIsCorrect(false);
    setFeedback(null);
    setIsRecording(false);
    setIsAnalyzing(false);
    setShowHelp(false);
    setTimeLeft(isExpert ? (exercise.type === 'ROLEPLAY' ? 30 : 20) : 0);
    
    if (exercise.type === 'LISTENING' || exercise.type === 'SPEAKING' || exercise.type === 'ROLEPLAY') {
      playPronunciation(exercise.audioText || exercise.question);
    }

    if (isExpert) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleTimeOut();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [exercise, isExpert]);

  const handleTimeOut = () => {
    if (isChecked) return;
    setIsCorrect(false);
    setIsChecked(true);
  };

  const handleSaveClick = () => {
    onSave({ original: exercise.question, translation: exercise.correctAnswer });
    if (!isSaved) {
      setShowSaveToast(true);
      setTimeout(() => setShowSaveToast(false), 2000);
    }
  };

  const handleCheck = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    let correct = false;
    if (exercise.type === 'MULTIPLE_CHOICE') {
      correct = selectedOption === exercise.correctAnswer;
    } else if (exercise.type === 'SPEAKING' || exercise.type === 'ROLEPLAY') {
      correct = feedback ? (feedback.score >= 70) : (answer.trim().length > 5);
    } else {
      const cleanInput = answer.toLowerCase().trim().replace(/[.,!?;:]/g, "");
      const cleanCorrect = exercise.correctAnswer.toLowerCase().trim().replace(/[.,!?;:]/g, "");
      correct = cleanInput === cleanCorrect;
    }
    
    setIsCorrect(correct);
    setIsChecked(true);
  };

  const startVoiceInput = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsAnalyzing(true);
          try {
            if (exercise.type === 'SPEAKING' || exercise.type === 'ROLEPLAY') {
              const result = await analyzePronunciation(base64Data, exercise.correctAnswer || exercise.question);
              setFeedback(result);
              const transcript = result.wordAnalysis.map(w => w.word).join(" ");
              setAnswer(transcript);
            } else {
              const transcription = await transcribeAudio(base64Data);
              setAnswer(transcription);
            }
          } catch (err) {
            console.error(err);
            alert("Error al procesar el audio.");
          } finally {
            setIsAnalyzing(false);
          }
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      alert("No se pudo acceder al micrófono.");
    }
  };

  const stopVoiceInput = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const getHelpText = () => {
    if (isExpert) return "En modo Experto las pistas están desactivadas.";
    if (exercise.explanation) return exercise.explanation;
    const genericTips: Record<string, string> = {
      'TRANSLATE': 'Lee la oración y traduce al inglés.',
      'MULTIPLE_CHOICE': 'Elige la respuesta más natural.',
      'LISTENING': 'Escribe exactamente lo que oigas.',
      'SPEAKING': 'Pulsa en las palabras para escucharlas por separado. Luego graba la frase completa.',
      'ROLEPLAY': 'Responde al personaje de la forma más natural posible. Usa el micrófono para mayor inmersión.',
    };
    return genericTips[exercise.type] || 'Sigue las instrucciones.';
  };

  const renderContent = () => {
    switch (exercise.type) {
      case 'MULTIPLE_CHOICE':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            {exercise.options?.map((option) => (
              <button
                key={option}
                onClick={() => !isChecked && setSelectedOption(option)}
                className={`p-6 border-2 rounded-[2rem] text-lg font-black transition-all ${
                  selectedOption === option 
                    ? 'border-blue-400 bg-blue-50 text-blue-500 shadow-[0_4px_0_0_#60a5fa]' 
                    : 'border-gray-200 hover:bg-gray-50 active:translate-y-1'
                } ${isChecked && option === exercise.correctAnswer ? 'border-green-500 bg-green-50 text-green-600' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        );
      case 'ROLEPLAY':
        return (
          <div className="mt-8 space-y-6 animate-in fade-in duration-700">
             <div className="flex items-start gap-4">
               <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl shrink-0 border-2 border-white shadow-sm">👤</div>
               <div className="bg-white p-6 rounded-[2rem] rounded-tl-none border-2 border-indigo-50 shadow-sm relative">
                 <div className="absolute -left-2 top-0 w-4 h-4 bg-white border-l-2 border-t-2 border-indigo-50 rotate-[-45deg]" />
                 <p className="font-bold text-gray-700 leading-relaxed italic">"{exercise.question}"</p>
                 <button onClick={() => playPronunciation(exercise.question)} className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform">
                   <Volume2 size={14} />
                 </button>
               </div>
             </div>

             <div className="relative mt-12">
                <textarea
                  className="w-full h-40 p-8 bg-emerald-50/30 border-2 border-dashed border-emerald-200 focus:border-emerald-500 rounded-[2.5rem] text-xl resize-none outline-none transition-all font-black text-emerald-800 placeholder:text-emerald-300 shadow-inner"
                  placeholder="Responde aquí..."
                  value={answer}
                  onChange={(e) => !isChecked && setAnswer(e.target.value)}
                  disabled={isChecked || isAnalyzing}
                />
                <div className="absolute bottom-6 right-6 flex gap-3">
                  <button
                    onMouseDown={startVoiceInput}
                    onMouseUp={stopVoiceInput}
                    onTouchStart={startVoiceInput}
                    onTouchEnd={stopVoiceInput}
                    disabled={isChecked || isAnalyzing}
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-white hover:bg-emerald-600'}`}
                  >
                    <Mic size={28} />
                  </button>
                </div>
             </div>
             <p className="text-center text-[10px] font-black text-emerald-400 uppercase tracking-widest">
               {isAnalyzing ? 'PARROT ESTÁ PROCESANDO...' : isRecording ? 'GRABANDO TU RESPUESTA...' : 'Usa el micrófono para practicar tu fluidez'}
             </p>
          </div>
        );
      case 'TRANSLATE':
      case 'LISTENING':
        return (
          <div className="mt-8 space-y-4">
            <div className="relative">
              <textarea
                className="w-full h-40 p-6 bg-gray-50 border-2 border-transparent focus:border-blue-400 rounded-[2.5rem] text-xl resize-none outline-none transition-all font-bold text-gray-700"
                placeholder={isAnalyzing ? "Analizando voz..." : "Escribe tu respuesta aquí..."}
                value={answer}
                onChange={(e) => !isChecked && setAnswer(e.target.value)}
                disabled={isChecked || isAnalyzing}
              />
              <div className="absolute bottom-6 right-6">
                <button
                  onMouseDown={startVoiceInput}
                  onMouseUp={stopVoiceInput}
                  onTouchStart={startVoiceInput}
                  onTouchEnd={stopVoiceInput}
                  disabled={isChecked || isAnalyzing}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-400 hover:bg-blue-500 hover:text-white'}`}
                >
                  <Mic size={24} />
                </button>
              </div>
            </div>
          </div>
        );
      case 'SPEAKING':
        const words = (exercise.question || exercise.correctAnswer || "").split(" ");
        return (
          <div className="flex flex-col items-center gap-8 mt-8 mb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="w-full bg-white p-10 rounded-[3rem] border-2 border-gray-50 shadow-sm text-center relative overflow-hidden group">
              <div className="absolute top-4 left-6 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">Referencia Nativa</div>
              <button 
                onClick={() => playPronunciation(exercise.question || exercise.correctAnswer)}
                className="mb-8 w-20 h-20 bg-blue-500 rounded-3xl flex items-center justify-center text-white shadow-[0_8px_0_0_#3b82f6] active:translate-y-1 active:shadow-none transition-all mx-auto group-hover:scale-105"
              >
                <Volume2 size={32} />
              </button>
              
              <div className="flex flex-wrap justify-center gap-x-2 gap-y-3 px-4">
                {words.map((word, i) => (
                  <button
                    key={i}
                    onClick={() => playPronunciation(word.replace(/[.,!?;:]/g, ""))}
                    className="text-2xl font-black text-gray-700 hover:text-blue-500 transition-all cursor-pointer px-1.5 py-1 rounded-xl hover:bg-blue-50"
                  >
                    {word}
                  </button>
                ))}
              </div>
              <p className="mt-6 text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                <Info size={12} /> Toca las palabras para escucharlas
              </p>
            </div>

            {feedback ? (
              <div className="w-full space-y-4 animate-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white border-2 border-gray-100 rounded-[3rem] p-8 shadow-md">
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${feedback.score >= 80 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                         {feedback.score >= 80 ? <Sparkles size={28} /> : <AlertCircle size={28} />}
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-lg">Puntuación de Voz</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{feedback.accuracy}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-4xl font-black ${feedback.score >= 80 ? 'text-green-500' : feedback.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`}>
                        {feedback.score}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-4 mb-8">
                    {feedback.wordAnalysis.map((item, idx) => (
                      <div key={idx} className="relative">
                        <button 
                          className={`text-xl font-black px-4 py-2.5 rounded-2xl transition-all ${
                            item.isCorrect 
                              ? 'text-green-600 bg-green-50 border-2 border-emerald-100' 
                              : 'text-red-500 bg-red-50 border-2 border-red-100 underline decoration-wavy underline-offset-8'
                          }`}
                        >
                          {item.word}
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-6 bg-gray-50 rounded-3xl border-2 border-gray-100 text-center italic font-bold text-gray-600 text-sm">
                    "{feedback.generalFeedback}"
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <button 
                  onMouseDown={startVoiceInput}
                  onMouseUp={stopVoiceInput}
                  onTouchStart={startVoiceInput}
                  onTouchEnd={stopVoiceInput}
                  disabled={isAnalyzing || isChecked}
                  className={`w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl transition-all relative z-10 ${
                    isRecording 
                      ? 'bg-red-500 scale-110 animate-pulse' 
                      : isAnalyzing 
                        ? 'bg-gray-100 text-gray-300' 
                        : 'bg-red-500 shadow-[0_12px_0_0_#ef4444] hover:bg-red-600 active:translate-y-1 active:shadow-none'
                  }`}
                >
                  {isAnalyzing ? (
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  ) : <Mic size={48} />}
                </button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col h-full pt-10 pb-32 px-4 md:px-0">
      {isExpert && !isChecked && (
        <div className="mb-8 flex items-center justify-center gap-3 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg border border-indigo-400">
            <Timer size={20} className={timeLeft <= 5 ? 'animate-ping text-red-300' : 'animate-pulse'} />
            <span className={`text-xl font-black tabular-nums ${timeLeft <= 5 ? 'text-red-200' : 'text-white'}`}>
              00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
            </span>
          </div>
          <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Reto Experto</div>
        </div>
      )}

      <div className="flex justify-between items-start mb-10">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">
            {exercise.type === 'TRANSLATE' ? 'Traduce esta oración' : 
             exercise.type === 'MULTIPLE_CHOICE' ? 'Selecciona la correcta' :
             exercise.type === 'LISTENING' ? '¿Qué escuchaste?' : 
             exercise.type === 'ROLEPLAY' ? 'Practica la conversación' : 'Práctica de Pronunciación'}
          </h2>
          {!isExpert && (
            <button 
              onClick={() => setShowHelp(!showHelp)}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${showHelp ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >
              <Info size={20} />
            </button>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={handleSaveClick}
            className={`w-12 h-12 rounded-2xl border-2 flex items-center justify-center transition-all ${isSaved ? 'bg-yellow-100 border-yellow-400 text-yellow-600' : 'bg-white border-gray-100 text-gray-300 hover:border-emerald-400 hover:text-emerald-400'}`}
          >
            {isSaved ? <BookmarkCheck size={24} /> : <Bookmark size={24} />}
          </button>
        </div>
      </div>

      {showHelp && !isExpert && (
        <div className="mb-10 p-6 bg-gray-800 text-white text-sm font-bold rounded-[2rem] animate-in fade-in slide-in-from-top-4 shadow-xl border-l-8 border-blue-500">
          <div className="flex gap-4">
            <Sparkles className="text-blue-400 shrink-0" size={24} />
            <p className="leading-relaxed opacity-90">{getHelpText()}</p>
          </div>
        </div>
      )}
      
      <div className={`bg-white border-2 p-10 rounded-[3rem] mb-10 shadow-sm relative overflow-hidden group ${isExpert ? 'border-indigo-100' : 'border-gray-50'}`}>
        <div className="absolute top-0 right-0 p-4 opacity-5">
          {isExpert ? <Sparkles size={120} className="text-indigo-500" /> : <Sparkles size={120} />}
        </div>
        <p className="text-2xl font-black text-gray-800 leading-relaxed relative z-10">{exercise.question}</p>
        {isExpert && (
           <div className="absolute bottom-4 left-6 text-[9px] font-black text-indigo-300 uppercase tracking-widest">
             Bonus Experto: +5 XP por respuesta
           </div>
        )}
      </div>

      <div className="flex-1">
        {renderContent()}
      </div>

      <div className={`fixed bottom-0 left-0 w-full p-8 transition-all duration-500 ${isChecked ? (isCorrect ? 'bg-green-100 border-t-4 border-green-500' : 'bg-red-100 border-t-4 border-red-500') : 'bg-white border-t-2 border-gray-100'} z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]`}>
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 w-full text-center md:text-left">
            {isChecked && (
              <div className="animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                  {isCorrect ? <CheckCircle2 className="text-green-600" /> : <XCircle className="text-red-600" />}
                  <span className={`text-2xl font-black ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                    {isCorrect ? '¡Excelente!' : timeLeft === 0 ? '¡Se acabó el tiempo!' : 'Casi...'}
                  </span>
                </div>
                {!isCorrect && exercise.type !== 'SPEAKING' && exercise.type !== 'ROLEPLAY' && (
                  <p className="text-red-800 font-bold text-sm bg-white/50 px-4 py-2 rounded-xl inline-block">
                    Respuesta correcta: <span className="font-black underline">{exercise.correctAnswer}</span>
                  </p>
                )}
              </div>
            )}
          </div>
          
          <button
            onClick={isChecked ? () => onNext(isCorrect) : handleCheck}
            disabled={
              (!isChecked && exercise.type === 'MULTIPLE_CHOICE' && !selectedOption) ||
              (!isChecked && (exercise.type === 'SPEAKING' || exercise.type === 'ROLEPLAY') && !answer && !feedback) ||
              (!isChecked && (exercise.type === 'TRANSLATE' || exercise.type === 'LISTENING') && !answer) ||
              isAnalyzing
            }
            className={`w-full md:w-auto px-16 py-5 rounded-3xl font-black text-xl text-white shadow-xl transition-all active:scale-95 ${
              isChecked 
                ? (isCorrect ? 'bg-green-500 shadow-[0_8px_0_0_#16a34a] hover:bg-green-600' : 'bg-red-500 shadow-[0_8px_0_0_#dc2626] hover:bg-red-600') 
                : (isAnalyzing || (!selectedOption && exercise.type === 'MULTIPLE_CHOICE') ? 'bg-gray-200 shadow-none' : 'bg-emerald-500 shadow-[0_8px_0_0_#059669] hover:bg-emerald-600 hover:shadow-[0_4px_0_0_#059669]')
            }`}
          >
            {isChecked ? 'CONTINUAR' : 'COMPROBAR'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExerciseView;
