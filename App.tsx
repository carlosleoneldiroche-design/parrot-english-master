
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import LessonPath from './components/LessonPath';
import ExerciseView from './components/ExerciseView';
import VideoLab from './components/VideoLab';
import LiveChat from './components/LiveChat';
import TextChat from './components/TextChat';
import MascotHero from './components/MascotHero';
import ProfileView from './components/ProfileView';
import Leaderboard from './components/Leaderboard';
import ShopView from './components/ShopView';
import AuthScreen from './components/AuthScreen';
import LessonCompletionModal from './components/LessonCompletionModal';
import WalletView from './components/WalletView';
import ShareModal from './components/ShareModal';
import Logo from './components/Logo';
import NotificationSystem from './components/NotificationSystem';
import { Lesson, UserStats, Mission, SupportedLanguage, Achievement, SavedPhrase, AppNotification } from './types';
import { generateLessonExercises } from './services/geminiService';
import { Sparkles, ArrowRight } from 'lucide-react';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: '1', title: 'Madrugador', description: 'Completa una lección antes de las 8 AM.', icon: '🌅', isUnlocked: true, progress: 1, target: 1 },
  { id: '2', title: 'Cripto-Estudiante', description: 'Gana tus primeros 10 GCD COINS.', icon: '🪙', isUnlocked: true, progress: 10, target: 10 },
];

const INITIAL_STATS: UserStats = {
  hearts: 5,
  streak: 0,
  streakFreezes: 0,
  gems: 50,
  xp: 0,
  dailyXP: 0,
  dailyGoal: 50,
  completedLessons: [],
  savedPhrases: [],
  level: 'A1',
  nativeLanguage: 'es',
  missions: [],
  lastMissionUpdate: '',
  gcdBalance: 0,
  achievements: INITIAL_ACHIEVEMENTS,
  activityHistory: [{ date: new Date().toISOString().split('T')[0], xp: 0 }],
  currentOutfit: 'default',
  unlockedOutfits: ['default'],
  expertMode: false
};

const INITIAL_LESSONS: Lesson[] = [
  { id: '1', title: 'Check-in y Seguridad', description: 'Vocabulario esencial para el aeropuerto.', exercises: [], status: 'available', type: 'regular' },
  { id: '2', title: 'Check-in en el Hotel', description: 'Habla con el recepcionista para conseguir tu habitación.', exercises: [], status: 'locked', type: 'roleplay' },
  { id: '3', title: 'Reservas en el Hotel', description: 'Cómo solicitar servicios.', exercises: [], status: 'locked', type: 'regular' },
  { id: '4', title: 'Restaurantes del Mundo', description: 'Dominar el arte de pedir comida.', exercises: [], status: 'locked', type: 'regular' },
  { id: '5', title: 'Superviviente Turístico', description: 'Demuestra que puedes moverte solo.', exercises: [], status: 'locked', type: 'boss' },
];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(localStorage.getItem('parrot_session'));
  const [activeTab, setActiveTab] = useState(localStorage.getItem('parrot_active_tab') || 'learn');
  const [stats, setStats] = useState<UserStats>(INITIAL_STATS);
  const [lessons, setLessons] = useState<Lesson[]>(INITIAL_LESSONS);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [lessonResults, setLessonResults] = useState<any | null>(null);
  const [setupStep, setSetupStep] = useState<'language' | 'goal' | 'complete'>('complete');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((title: string, message: string, type: AppNotification['type'], icon?: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, title, message, type, icon: icon || '' }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    if (currentUser) {
      const savedData = localStorage.getItem(`parrot_stats_${currentUser}`);
      if (savedData) {
        const loadedStats = JSON.parse(savedData);
        setStats(prev => ({ ...INITIAL_STATS, ...loadedStats }));
      } else {
        setSetupStep('language');
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`parrot_stats_${currentUser}`, JSON.stringify(stats));
    }
  }, [stats, currentUser]);

  useEffect(() => {
    localStorage.setItem('parrot_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (stats.hearts < 5) {
        setStats(prev => ({ ...prev, hearts: Math.min(5, prev.hearts + 1) }));
      }
    }, 2 * 60 * 60 * 1000); 
    return () => clearInterval(timer);
  }, [stats.hearts]);

  const updateStats = useCallback((updates: Partial<UserStats> | ((prev: UserStats) => UserStats)) => {
    setStats(prev => {
      const newStats = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      
      // Check for newly completed missions to notify
      newStats.missions.forEach((mission, idx) => {
        const prevMission = prev.missions[idx];
        if (mission.completed && prevMission && !prevMission.completed) {
          addNotification("Misión Completada", `¡Has completado: ${mission.title}!`, 'MISSION');
        }
      });

      return newStats;
    });
  }, [addNotification]);

  const handleAuthComplete = (username: string) => {
    setCurrentUser(username);
    localStorage.setItem('parrot_session', username);
    addNotification("Bienvenido", `¡Hola, ${username}! Es hora de aprender.`, 'LESSON', '🦜');
  };

  const handleLogout = () => { 
    localStorage.removeItem('parrot_session'); 
    localStorage.removeItem('parrot_active_tab');
    setCurrentUser(null); 
    setActiveTab('learn');
  };

  const startLesson = async (lesson: Lesson) => {
    if (stats.hearts <= 0) return alert("¡No tienes corazones! Espera a que se recarguen.");
    setIsLoading(true);
    try {
      const exercises = await generateLessonExercises(lesson.title, stats.goal, stats.nativeLanguage);
      setCurrentLesson({ ...lesson, exercises });
      setExerciseIndex(0);
      setCorrectCount(0);
    } catch (error) {
      alert("Error cargando lección. Por favor, revisa tu conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextExercise = (isCorrect: boolean) => {
    const newCorrectCount = isCorrect ? correctCount + 1 : correctCount;
    if (!isCorrect) setStats(prev => ({ ...prev, hearts: Math.max(0, prev.hearts - 1) }));
    else setCorrectCount(newCorrectCount);

    if (currentLesson && exerciseIndex < currentLesson.exercises.length - 1) {
      setExerciseIndex(prev => prev + 1);
    } else {
      finishLesson(newCorrectCount);
    }
  };

  const finishLesson = (finalCorrectCount: number) => {
    if (!currentLesson) return;
    const totalXP = finalCorrectCount * 15 + (stats.expertMode ? finalCorrectCount * 5 : 0);
    const accuracy = finalCorrectCount / currentLesson.exercises.length;
    const totalGems = 20 + (accuracy === 1 ? 30 : 0);
    const gcdReward = accuracy >= 0.8 ? 2.5 : 0;
    const isPerfect = accuracy === 1;

    setLessonResults({ total: currentLesson.exercises.length, correct: finalCorrectCount, xp: totalXP, gems: totalGems, gcd: gcdReward });
    
    updateStats(prev => {
      const updatedMissions = prev.missions.map(m => {
        let newCurrent = m.current;
        if (m.type === 'XP') newCurrent = Math.min(m.target, m.current + totalXP);
        if (m.type === 'LESSONS') newCurrent = Math.min(m.target, m.current + 1);
        if (m.type === 'PERFECT' && isPerfect) newCurrent = Math.min(m.target, m.current + 1);
        
        return { 
          ...m, 
          current: newCurrent, 
          completed: newCurrent >= m.target
        };
      });

      // Notification for streak increase
      const newStreak = prev.streak + 1;
      addNotification("¡Racha en Fuego!", `¡Has alcanzado ${newStreak} días seguidos!`, 'STREAK');

      return {
        ...prev,
        streak: newStreak,
        gems: prev.gems + totalGems,
        xp: prev.xp + totalXP,
        dailyXP: prev.dailyXP + totalXP,
        gcdBalance: prev.gcdBalance + gcdReward,
        missions: updatedMissions
      };
    });

    setLessons(prev => {
      const updated = prev.map((l, i) => {
        if (l.id === currentLesson.id) return { ...l, status: 'completed' as const };
        const currentIdx = prev.findIndex(item => item.id === currentLesson.id);
        if (i === currentIdx + 1 && l.status === 'locked') {
          addNotification("Lección Desbloqueada", `¡Ya puedes empezar: ${l.title}!`, 'LESSON');
          return { ...l, status: 'available' as const };
        }
        return l;
      });
      return updated;
    });
    setCurrentLesson(null);
  };

  const onSavePhrase = (p: Omit<SavedPhrase, 'id' | 'timestamp' | 'masteryLevel'>) => {
    updateStats(s => {
      const updatedMissions = s.missions.map(m => {
        if (m.type === 'WORDS') {
          const newCurrent = Math.min(m.target, m.current + 1);
          return { ...m, current: newCurrent, completed: newCurrent >= m.target };
        }
        return m;
      });

      return {
        ...s,
        savedPhrases: [{...p, id: Date.now().toString(), timestamp: Date.now(), masteryLevel: 0}, ...s.savedPhrases],
        missions: updatedMissions
      };
    });
  };

  if (!currentUser) return <AuthScreen onAuthComplete={handleAuthComplete} />;

  if (setupStep !== 'complete') {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex items-center justify-center p-6 md:p-10 overflow-y-auto">
        <div className="max-w-xl w-full text-center space-y-12 animate-in fade-in duration-700">
          <div className="flex justify-center"><Logo size="lg" /></div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">Bienvenido a ParrotAI</h1>
            <p className="text-gray-400 font-bold">Configura tu perfil de aprendizaje en segundos.</p>
          </div>
          
          {setupStep === 'language' ? (
            <div className="space-y-6">
              <h2 className="text-xs font-black text-emerald-500 uppercase tracking-widest">¿Cuál es tu idioma nativo?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { code: 'es', label: 'Español', flag: '🇪🇸' },
                  { code: 'pt', label: 'Português', flag: '🇧🇷' },
                  { code: 'fr', label: 'Français', flag: '🇫🇷' },
                  { code: 'de', label: 'Deutsch', flag: '🇩🇪' }
                ].map(lang => (
                  <button 
                    key={lang.code} 
                    onClick={() => { updateStats({ nativeLanguage: lang.code as any }); setSetupStep('goal'); }} 
                    className="group p-8 border-2 border-gray-100 rounded-[2.5rem] hover:border-emerald-500 hover:bg-emerald-50 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl group-hover:scale-110 transition-transform">{lang.flag}</span>
                      <span className="font-black text-gray-700 uppercase tracking-widest text-sm">{lang.label}</span>
                    </div>
                    <ArrowRight className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <h2 className="text-xs font-black text-blue-500 uppercase tracking-widest">¿Cuál es tu meta principal?</h2>
              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'TRAVEL', label: 'Viajar por el mundo', icon: '✈️', color: 'bg-yellow-50 text-yellow-600' },
                  { id: 'WORK', label: 'Negocios y Carrera', icon: '💼', color: 'bg-blue-50 text-blue-600' },
                  { id: 'CONVERSATION', label: 'Fluidez Social', icon: '🗣️', color: 'bg-emerald-50 text-emerald-600' }
                ].map(goal => (
                  <button 
                    key={goal.id} 
                    onClick={() => { updateStats({ goal: goal.id as any }); setSetupStep('complete'); }} 
                    className="group p-8 border-2 border-gray-100 rounded-[2.5rem] hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-between"
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 ${goal.color} rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform`}>{goal.icon}</div>
                      <span className="font-black text-gray-700 uppercase tracking-widest text-sm">{goal.label}</span>
                    </div>
                    <Sparkles className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-[10px] text-gray-300 font-black uppercase tracking-[0.2em]">Learning Mining Pool v2.5</p>
        </div>
      </div>
    );
  }

  if (currentLesson) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {isLoading && (
          <div className="fixed inset-0 bg-white/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center gap-8">
            <div className="flex flex-col items-center gap-4">
              <Logo size="lg" />
              <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[shimmer_2s_infinite] w-full" />
              </div>
            </div>
            <p className="font-black text-emerald-600 animate-pulse tracking-widest text-xs uppercase">Generando tu sesión personalizada...</p>
          </div>
        )}
        <div className="max-w-4xl mx-auto w-full p-6 flex items-center gap-6">
          <button onClick={() => setCurrentLesson(null)} className="p-3 text-gray-300 hover:text-gray-500 transition-colors">✕</button>
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-100 shadow-inner">
            <div className="h-full bg-emerald-500 transition-all duration-700 ease-out" style={{ width: `${((exerciseIndex + 1) / (currentLesson.exercises.length || 5)) * 100}%` }} />
          </div>
          <div className="flex items-center gap-2 text-red-500 font-black text-xl bg-red-50 px-4 py-2 rounded-2xl border border-red-100">
            ❤️ {stats.hearts}
          </div>
        </div>
        <div className="flex-1 p-4 md:p-10">
          <ExerciseView 
            exercise={currentLesson.exercises[exerciseIndex]} 
            onNext={handleNextExercise} 
            onSave={onSavePhrase} 
            isSaved={stats.savedPhrases.some(p => p.original === currentLesson.exercises[exerciseIndex]?.question)}
            isExpert={stats.expertMode}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#fcfcfc]">
      <NotificationSystem notifications={notifications} removeNotification={removeNotification} />
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        walletAddress={stats.walletAddress} 
        onConnectWallet={() => updateStats({ walletAddress: "0x74...f4" })} 
        onOpenShare={() => setIsShareModalOpen(true)} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 overflow-y-auto pb-24 md:pb-0 h-screen no-scrollbar">
        <TopBar stats={stats} onLanguageChange={(l) => updateStats({ nativeLanguage: l })} onExpertToggle={(m) => updateStats({ expertMode: m })} />
        <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
          {activeTab === 'learn' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[3rem] p-10 text-white shadow-2xl flex flex-col justify-center min-h-[300px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-10 scale-150 group-hover:rotate-12 transition-transform duration-1000">🦜</div>
                <div className="relative z-10">
                  <h2 className="text-4xl font-black mb-4 tracking-tight">¡Hola de nuevo, {currentUser}!</h2>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Racha Actual</p>
                      <p className="text-xl font-black">{stats.streak} días</p>
                    </div>
                    <div className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Balance GCD</p>
                      <p className="text-xl font-black">{stats.gcdBalance.toFixed(1)} COINS</p>
                    </div>
                    {stats.expertMode && (
                      <div className="px-5 py-2 bg-indigo-500/20 backdrop-blur-md rounded-2xl border border-indigo-400/50 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-200" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">MODO EXPERTO ACTIVO</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4"><MascotHero outfitId={stats.currentOutfit} /></div>
              <div className="lg:col-span-12"><LessonPath lessons={lessons} onSelectLesson={startLesson} /></div>
            </div>
          )}
          {activeTab === 'chat' && <TextChat userGoal={stats.goal} />}
          {activeTab === 'video-lab' && <VideoLab />}
          {activeTab === 'profile' && <ProfileView stats={stats} onUpdateStats={updateStats} onNotifyMissions={() => addNotification("Misiones Diarias", "¡Nuevos desafíos disponibles para hoy!", "MISSION")} />}
          {activeTab === 'shop' && <ShopView stats={stats} onBuyItem={(id, p, cur, type) => {
            if (type === 'outfit') updateStats(s => ({...s, currentOutfit: id, unlockedOutfits: Array.from(new Set([...s.unlockedOutfits, id])), gems: cur === 'gems' ? s.gems - p : s.gems, gcdBalance: cur === 'gcd' ? s.gcdBalance - p : s.gcdBalance }));
          }} />}
          {activeTab === 'wallet' && <WalletView stats={stats} onConnect={() => updateStats({ walletAddress: "0x74...f4" })} />}
          {activeTab === 'leaderboard' && <Leaderboard />}
        </div>
      </main>
      {lessonResults && <LessonCompletionModal results={lessonResults} stats={stats} onClose={() => setLessonResults(null)} />}
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </div>
  );
};

export default App;
