
import React, { useEffect } from 'react';
import { AppNotification } from '../types';
import { Flame, Target, BookOpen, Zap, X } from 'lucide-react';

interface NotificationSystemProps {
  notifications: AppNotification[];
  removeNotification: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, removeNotification }) => {
  return (
    <div className="fixed top-6 right-6 z-[200] flex flex-col gap-4 pointer-events-none w-full max-w-sm">
      {notifications.map((notif) => (
        <Toast key={notif.id} notification={notif} onRemove={() => removeNotification(notif.id)} />
      ))}
    </div>
  );
};

const Toast: React.FC<{ notification: AppNotification; onRemove: () => void }> = ({ notification, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(onRemove, 5000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const config = {
    STREAK: { bg: 'bg-orange-500', border: 'border-orange-600', icon: <Flame size={20} /> },
    MISSION: { bg: 'bg-blue-500', border: 'border-blue-600', icon: <Target size={20} /> },
    LESSON: { bg: 'bg-emerald-500', border: 'border-emerald-600', icon: <BookOpen size={20} /> },
    XP: { bg: 'bg-yellow-500', border: 'border-yellow-600', icon: <Zap size={20} /> },
  };

  const style = config[notification.type];

  return (
    <div className={`pointer-events-auto flex items-center gap-4 p-5 rounded-[2rem] border-b-4 text-white shadow-2xl animate-in slide-in-from-right-10 duration-500 ${style.bg} ${style.border}`}>
      <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0">
        {notification.icon || style.icon}
      </div>
      <div className="flex-1">
        <h4 className="font-black text-sm uppercase tracking-widest leading-none mb-1">{notification.title}</h4>
        <p className="text-xs font-bold opacity-90">{notification.message}</p>
      </div>
      <button onClick={onRemove} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationSystem;
