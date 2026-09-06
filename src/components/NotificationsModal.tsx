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
        className="relative w-full max-w-sm bg-slate-50 border border-slate-200 rounded-3xl overflow-hidden shadow-2xl mt-12"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
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
              className="p-1 text-slate-500 hover:text-slate-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#10203a] max-h-96 overflow-y-auto">
          {notifications.map((item) => (
            <div 
              key={item.id}
              className={`p-3.5 hover:bg-slate-100 transition-colors flex gap-3 ${
                !item.read ? 'bg-slate-50/80' : ''
              }`}
            >
              <div className="p-2 rounded-xl bg-slate-50 shrink-0 h-fit">
                {getIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
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
