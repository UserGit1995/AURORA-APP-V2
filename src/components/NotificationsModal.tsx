import React from 'react';
import { X, Bell, Tag, Package, Info, Check } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
}) => {
  if (!isOpen) return null;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'promo':
        return <Tag className="w-4 h-4 text-amber-400" />;
      case 'order':
        return <Package className="w-4 h-4 text-emerald-400" />;
      default:
        return <Info className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
      <div 
        className="relative w-full max-w-sm bg-[#071124] border border-[#162a4c] rounded-3xl overflow-hidden shadow-2xl mt-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-[#122442] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-sky-400" />
            <h3 className="text-white font-bold text-sm">Notifiche Aurora B2B</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllAsRead}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-medium"
            >
              Segna lette
            </button>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#10203a] max-h-96 overflow-y-auto">
          {notifications.map((item) => (
            <div 
              key={item.id}
              className={`p-3.5 hover:bg-[#0a152b] transition-colors flex gap-3 ${
                !item.read ? 'bg-[#09152b]/80' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-[#0e1d38] shrink-0 h-fit">
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <span className="text-[10px] text-slate-500">{item.time}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
