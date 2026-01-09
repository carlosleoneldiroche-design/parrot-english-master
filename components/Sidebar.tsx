import React from 'react';
import Logo from './Logo';
import { 
  Home, 
  User, 
  ShoppingBag, 
  MessageSquare, 
  PlayCircle, 
  Wallet, 
  Trophy, 
  Gift, 
  LogOut 
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  walletAddress?: string;
  onConnectWallet: () => void;
  onOpenShare: () => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, walletAddress, onConnectWallet, onOpenShare, onLogout }) => {
  const navItems = [
    { id: 'learn', label: 'APRENDER', icon: <Home size={22} /> },
    { id: 'profile', label: 'MI PERFIL', icon: <User size={22} /> },
    { id: 'shop', label: 'TIENDA', icon: <ShoppingBag size={22} /> },
    { id: 'chat', label: 'CHATEAR', icon: <MessageSquare size={22} /> },
    { id: 'video-lab', label: 'VIDEO LAB', icon: <PlayCircle size={22} /> },
    { id: 'wallet', label: 'WALLET', icon: <Wallet size={22} /> },
    { id: 'leaderboard', label: 'RANKING', icon: <Trophy size={22} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-gray-200 md:relative md:w-64 md:h-screen md:border-t-0 md:border-r-2 flex md:flex-col p-2 md:p-6 z-50">
      <div className="hidden md:flex items-center gap-3 mb-10 px-2">
        <Logo size="sm" />
        <h1 className="text-2xl font-black text-gray-800 tracking-tight">PARROTAI</h1>
      </div>
      
      <nav className="flex md:flex-col flex-1 justify-around md:justify-start gap-2 overflow-x-auto md:overflow-x-visible no-scrollbar">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-black transition-all whitespace-nowrap ${
              activeTab === item.id 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 scale-105' 
              : 'hover:bg-gray-50 text-gray-500'
            }`}
          >
            <span>{item.icon}</span>
            <span className="hidden md:inline text-sm uppercase tracking-wider">{item.label}</span>
          </button>
        ))}

        <button
          onClick={onOpenShare}
          className="flex items-center gap-4 px-4 py-3 rounded-2xl font-black transition-all whitespace-nowrap text-purple-600 hover:bg-purple-50 group"
        >
          <span className="group-hover:scale-125 transition-transform"><Gift size={22} /></span>
          <span className="hidden md:inline text-sm uppercase tracking-wider">INVITAR</span>
        </button>
      </nav>

      <div className="hidden md:block mt-6">
        {walletAddress ? (
          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex flex-col gap-1 overflow-hidden">
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">POLYGON CONNECTED</span>
            <span className="text-[11px] font-bold text-indigo-700 truncate">{walletAddress}</span>
          </div>
        ) : (
          <button 
            onClick={onConnectWallet}
            className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-black rounded-2xl text-xs shadow-lg hover:scale-105 transition-all shadow-yellow-100"
          >
            CONECTAR WALLET
          </button>
        )}
      </div>
      
      <div className="hidden md:block mt-auto pt-6 border-t border-gray-100 space-y-4">
        <button 
          onClick={onLogout}
          className="w-full py-3 text-gray-400 hover:text-red-500 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut size={14} /> <span>SALIR DE LA CUENTA</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;