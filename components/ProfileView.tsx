
import React, { useEffect } from 'react';
import { UserStats, Mission } from '../types';
import { CheckCircle2, Target, Sparkles, Clock, Share2 } from 'lucide-react';

interface ProfileViewProps {
  stats: UserStats;
  onUpdateStats: (updates: Partial<UserStats> | ((prev: UserStats) => UserStats)) => void;
  onNotifyMissions?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ stats, onUpdateStats, onNotifyMissions }) => {
  const maxXP = Math.max(...stats.activityHistory.map(d => d.xp), 1);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Generate missions if they are outdated or empty
    if (stats.lastMissionUpdate !== today || stats.missions.length === 0) {
      generateDailyMissions();
      if (onNotifyMissions) onNotifyMissions();
    }
  }, [stats.lastMissionUpdate, today]);

  const generateDailyMissions = () => {
    const levelMultipliers: Record<string, number> = { 'A1': 1, 'A2': 1.2, 'B1': 1.5, 'B2': 2, 'C1': 2.5, 'C2': 3 };
    const mult = levelMultipliers[stats.level || 'A1'] || 1;

    const newMissions: Mission[] = [
      {
        id: 'xp-mission',
        title: `Gana ${Math.round(stats.dailyGoal * 0.8)} XP`,
        reward: 50,
        target: Math.round(stats.dailyGoal * 0.8),
        current: 0,
        completed: false,
        type: 'XP'
      },
      {
        id: 'words-mission',
        title: `Guarda ${Math.round(3 * mult)} nuevas frases`,
        reward: 30,
        target: Math.round(3 * mult),
        current: 0,
        completed: false,
        type: 'WORDS'
      },
      {
        id: 'lessons-mission',
        title: `Completa ${Math.round(2 * (mult > 2 ? 2 : 1))} lecciones`,
        reward: 40,
        target: Math.round(2 * (mult > 2 ? 2 : 1)),
        current: 0,
        completed: false,
        type: 'LESSONS'
      },
      {
        id: 'perfect-mission',
        title: `Logra una lección perfecta`,
        reward: 60,
        target: 1,
        current: 0,
        completed: false,
        type: 'PERFECT'
      }
    ];

    onUpdateStats({ 
      missions: newMissions, 
      lastMissionUpdate: today,
      dailyXP: 0 
    });
  };

  const handleShareMission = async (mission: Mission) => {
    const shareText = `¡He completado la misión "${mission.title}" en ParrotAI! 🦜💎 Gana XP y aprende inglés conmigo.`;
    const shareUrl = window.location.origin;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Misión Completada - ParrotAI',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error al compartir misión:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        alert("¡Logro copiado al portapapeles!");
      } catch (err) {
        console.error("Error al copiar al portapapeles:", err);
      }
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white p-8 rounded-[3rem] border-2 border-gray-50 shadow-sm flex flex-col items-center text-center">
          <div className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center text-6xl mb-4 border-4 border-white shadow-lg relative">
            🦜
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-[10px] font-black px-3 py-1 rounded-full border-2 border-white shadow-md">
              LVL {stats.level}
            </div>
          </div>
          <h2 className="text-2xl font-black text-gray-800">Master Learner</h2>
          <p className="text-sm font-bold text-gray-400">Objetivo: {stats.goal || 'General'}</p>
          <div className="mt-6 flex gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">{stats.streak} Días de Racha</span>
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-8 rounded-[3rem] border-2 border-gray-50 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Actividad Semanal</h3>
            <div className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
              {stats.xp.toLocaleString()} XP TOTAL
            </div>
          </div>
          <div className="flex items-end justify-between h-48 gap-2">
            {stats.activityHistory.slice(-7).map((day, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex flex-col justify-end h-full">
                   <div 
                    className="w-full bg-emerald-500 rounded-t-xl transition-all duration-1000 group-hover:bg-emerald-400"
                    style={{ height: `${(day.xp / maxXP) * 100}%` }}
                   >
                     <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                       {day.xp} XP
                     </div>
                   </div>
                </div>
                <span className="text-[10px] font-black text-gray-300 uppercase">{new Date(day.date).toLocaleDateString('es', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <section className="bg-white p-10 rounded-[3rem] border-2 border-gray-50 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
            <span className="text-blue-500 text-2xl"><Target size={28} /></span> Misiones Diarias
          </h3>
          <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
            <Clock size={14} /> RESETEA EN 14 HORAS
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.missions.map(mission => (
            <div 
              key={mission.id} 
              className={`flex items-center gap-6 p-6 rounded-[2.5rem] border-2 transition-all relative overflow-hidden group/mission 
                ${!mission.completed ? 'bg-gray-50 border-gray-100 hover:bg-white hover:shadow-md animate-card-shine' : 'bg-white border-emerald-50 opacity-70 cursor-default'}`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm bg-white transition-all 
                ${!mission.completed ? 'animate-heartbeat animate-mission-glow border-2 border-blue-100' : 'border-2 border-emerald-200'}`}>
                 {mission.completed ? (
                   <CheckCircle2 className="text-emerald-500" size={32} />
                 ) : (
                   <span className="drop-shadow-sm select-none">
                     {mission.type === 'WORDS' ? '📝' : mission.type === 'XP' ? '⚡' : mission.type === 'PERFECT' ? '💎' : '🎯'}
                   </span>
                 )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-2">
                  <h4 className={`font-black text-sm ${mission.completed ? 'text-gray-400' : 'text-gray-800'}`}>
                    {mission.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    {mission.completed && (
                      <button 
                        onClick={() => handleShareMission(mission)}
                        className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Compartir Logro"
                      >
                        <Share2 size={12} />
                      </button>
                    )}
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0 border border-emerald-100">
                      <Sparkles size={12} /> +{mission.reward} XP
                    </div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden border border-gray-100">
                  <div 
                    className={`h-full transition-all duration-1000 ${mission.completed ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                    style={{ width: `${(mission.current / mission.target) * 100}%` }} 
                  />
                </div>
                <div className="flex justify-between mt-2">
                   <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Progreso</span>
                   <span className="text-[9px] font-black text-gray-600">{mission.current} / {mission.target}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {stats.missions.every(m => m.completed) && stats.missions.length > 0 && (
          <div className="mt-8 p-6 bg-emerald-50 rounded-[2rem] border-2 border-emerald-100 text-center animate-in zoom-in duration-500">
            <p className="text-emerald-700 font-black flex items-center justify-center gap-3">
               <Sparkles className="animate-spin-slow" /> ¡Has completado todas las misiones de hoy! <Sparkles className="animate-spin-slow" />
            </p>
          </div>
        )}
      </section>

      <section className="bg-white p-10 rounded-[3rem] border-2 border-gray-50 shadow-sm">
        <h3 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3">
          <span className="text-yellow-500 text-2xl">🏆</span> Vitrina de Logros
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.achievements.map(ach => (
            <div 
              key={ach.id} 
              className={`p-6 rounded-[2.5rem] border-2 transition-all text-center flex flex-col items-center gap-3 relative overflow-hidden group ${
                ach.isUnlocked 
                ? 'bg-yellow-50 border-yellow-200 shadow-yellow-100 shadow-lg' 
                : 'bg-gray-50 border-gray-100 grayscale opacity-60'
              }`}
            >
              {ach.isUnlocked && (
                <div className="absolute -top-10 -right-10 w-20 h-20 bg-yellow-400 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
              )}
              <span className="text-5xl mb-2 group-hover:scale-125 transition-transform duration-500">{ach.icon}</span>
              <h4 className="text-sm font-black text-gray-800 leading-tight">{ach.title}</h4>
              <p className="text-[10px] text-gray-500 font-bold leading-tight">{ach.description}</p>
              
              {!ach.isUnlocked && (
                <div className="w-full mt-2">
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${(ach.progress/ach.target)*100}%` }} />
                  </div>
                  <span className="text-[9px] font-black text-gray-400 mt-1 block uppercase">{ach.progress}/{ach.target}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2">Resumen de Vocabulario</h3>
            <p className="text-indigo-100 text-sm font-bold opacity-80 mb-6">Has guardado {stats.savedPhrases.length} frases en total.</p>
            <div className="flex gap-4">
               <div className="text-center">
                 <span className="text-3xl font-black">84%</span>
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Retención</p>
               </div>
               <div className="w-px h-10 bg-white/20 self-center" />
               <div className="text-center">
                 <span className="text-3xl font-black">{stats.savedPhrases.length}</span>
                 <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Palabras Guardadas</p>
               </div>
            </div>
          </div>
          <span className="absolute -right-4 -bottom-4 text-[10rem] opacity-10 group-hover:rotate-12 transition-transform">📚</span>
        </div>

        <div className="bg-emerald-600 p-8 rounded-[3rem] text-white shadow-xl relative overflow-hidden group">
          <div className="relative z-10">
            <h3 className="text-2xl font-black mb-2">Fluidez Social</h3>
            <p className="text-emerald-100 text-sm font-bold opacity-80 mb-6">Tu nivel actual es {stats.level}. ¡Sigue así!</p>
            <button className="px-6 py-2 bg-white text-emerald-600 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors">Ver Detalles Fonéticos</button>
          </div>
          <span className="absolute -right-4 -bottom-4 text-[10rem] opacity-10 group-hover:rotate-12 transition-transform">🗣️</span>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
