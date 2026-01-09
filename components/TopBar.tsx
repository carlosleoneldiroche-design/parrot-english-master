
import React, { useState } from 'react';
import { UserStats, SupportedLanguage } from '../types';
import { Flame, Coins, Gem, Heart, ShieldAlert, Sparkles } from 'lucide-react';

interface TopBarProps {
  stats: UserStats;
  onLanguageChange: (lang: SupportedLanguage) => void;
  onExpertToggle: (mode: boolean) => void;
}

const SUPPORTED_LANGUAGES: {code: SupportedLanguage, flag: string}[] = [
  { code: 'es', flag: '🇪🇸' },
  { code: 'zh', flag: '🇨🇳' },
  { code: 'hi', flag: '🇮🇳' },
  { code: 'ar', flag: '🇸🇦' },
  { code: 'ru', flag: '🇷🇺' },
  { code: 'pt', flag: '🇧🇷' },
  { code: 'ja', flag: '🇯🇵' },
  { code: 'de', flag: '🇩🇪' },
  { code: 'fr', flag: '🇫🇷' },
  { code: 'it', flag: '🇮🇹' },
  { code: 'ko', flag: '🇰🇷' },
  { code: 'id', flag: '🇮🇩' },
  { code: 'tr', flag: '🇹🇷' },
  { code: 'vi', flag: '🇻🇳' },
  { code: 'pl', flag: '🇵🇱' },
  { code: 'nl', flag: '🇳🇱' },
  { code: 'sv', flag: '🇸🇪' },
  { code: 'el', flag: '🇬🇷' },
  { code: 'he', flag: '🇮🇱' },
  { code: 'th', flag: '🇹🇭' },
];

const TOOLTIP_TRANSLATIONS: Record<string, any> = {
  es: { streak: "Racha: Días seguidos practicando", gems: "Gemas: Monedas para recompensas", hearts: "Vidas", dailyGoal: "Meta XP", gcd: "GCD COIN", expert: "Modo Experto: Sin pistas, tiempo limitado, +XP" },
};

const TopBar: React.FC<TopBarProps> = ({ stats, onLanguageChange, onExpertToggle }) => {
  const [showLangMenu, setShowLangMenu] = useState(false);
  const progress = Math.min((stats.dailyXP / stats.dailyGoal) * 100, 100);
  
  const currentFlag = SUPPORTED_LANGUAGES.find(l => l.code === stats.nativeLanguage)?.flag || '🌍';
  const tooltips = TOOLTIP_TRANSLATIONS[stats.nativeLanguage] || TOOLTIP_TRANSLATIONS.es;

  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 p-4 sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-100 mb-4">
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="relative">
          <button 
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="w-12 h-12 bg-white border-2 border-gray-100 rounded-2xl flex items-center justify-center text-2xl shadow-sm hover:border-emerald-400 transition-all"
          >
            {currentFlag}
          </button>
          
          {showLangMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white border-2 border-gray-100 rounded-[1.5rem] shadow-xl p-3 grid grid-cols-4 md:grid-cols-5 gap-2 z-50 animate-in fade-in zoom-in-95 duration-200 min-w-[200px]">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => { onLanguageChange(lang.code); setShowLangMenu(false); }}
                  className={`w-10 h-10 flex items-center justify-center text-xl rounded-xl hover:bg-emerald-50 transition-colors ${stats.nativeLanguage === lang.code ? 'bg-emerald-100 ring-2 ring-emerald-500' : ''}`}
                >
                  {lang.flag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col flex-1 md:w-48" title={tooltips.dailyGoal}>
          <div className="flex justify-between items-end mb-1">
            <span className="text-xs font-extrabold text-gray-400 tracking-wider uppercase">Meta Diaria</span>
            <span className="text-xs font-bold text-blue-500">{stats.dailyXP} / {stats.dailyGoal} XP</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div 
              className={`h-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6 justify-end w-full md:w-auto overflow-x-auto no-scrollbar py-1">
        {/* Expert Mode Toggle */}
        <button 
          onClick={() => onExpertToggle(!stats.expertMode)}
          title={tooltips.expert}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all shrink-0 ${
            stats.expertMode 
              ? 'bg-indigo-600 border-indigo-700 text-white shadow-lg' 
              : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-400 hover:text-indigo-400'
          }`}
        >
          {stats.expertMode ? <Sparkles size={16} className="animate-pulse" /> : <ShieldAlert size={16} />}
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Expert Mode</span>
        </button>

        <div className="flex items-center gap-2 group cursor-help bg-yellow-50 px-3 py-1.5 rounded-2xl border border-yellow-100 shrink-0" title={tooltips.gcd}>
          <div className="w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center border border-white shadow-sm">
            <Coins size={12} className="text-white" />
          </div>
          <span className="font-black text-yellow-700">{stats.gcdBalance.toFixed(2)}</span>
        </div>
        
        <div className="flex items-center gap-2 group cursor-help shrink-0" title={tooltips.streak}>
          <Flame size={22} className="text-orange-500 transition-transform group-hover:scale-125" />
          <span className="font-bold text-orange-500">{stats.streak}</span>
        </div>
        
        <div className="flex items-center gap-2 group cursor-help shrink-0" title={tooltips.gems}>
          <Gem size={22} className="text-blue-400 transition-transform group-hover:rotate-12" />
          <span className="font-bold text-blue-400">{stats.gems}</span>
        </div>
        
        <div className="flex items-center gap-2 group cursor-help shrink-0" title={tooltips.hearts}>
          <Heart size={22} className="text-red-500 transition-transform group-hover:scale-110" />
          <span className="font-bold text-red-500">{stats.hearts}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
