import { useEffect, useState } from "react";
import { BellIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useChat } from "../context/ChatContext";

const NotificationMenu = ({ className = "" }) => {
  const { notifications, notificationCount, refreshNotifications, markNotificationsRead } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const unreadLabel = notificationCount > 9 ? "9+" : notificationCount;

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const handleToggle = async () => {
    const nextOpen = !isOpen;
    if (nextOpen) {
      await refreshNotifications();
    }
    setIsOpen(nextOpen);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "request":
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-sm">📋</span>;
      case "approved":
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 text-sm">✓</span>;
      case "rejected":
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100 text-rose-600 text-sm">✕</span>;
      case "return":
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-600 text-sm">↩️</span>;
      case "warning":
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm">⚠️</span>;
      case "danger":
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 text-sm">🚨</span>;
      case "info":
      default:
        return <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm">ℹ️</span>;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "request":
        return "bg-blue-50/40 border-blue-100/50 hover:bg-blue-50/70";
      case "approved":
        return "bg-emerald-50/40 border-emerald-100/50 hover:bg-emerald-50/70";
      case "rejected":
        return "bg-rose-50/40 border-rose-100/50 hover:bg-rose-50/70";
      case "return":
        return "bg-amber-50/40 border-amber-100/50 hover:bg-amber-50/70";
      case "warning":
        return "bg-amber-50/40 border-amber-100/50 hover:bg-amber-50/70";
      case "danger":
        return "bg-red-50/40 border-red-100/50 hover:bg-red-50/70";
      case "info":
      default:
        return "bg-indigo-50/40 border-indigo-100/50 hover:bg-indigo-50/70";
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative p-2.5 rounded-full border border-slate-200/60 bg-white text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-800 hover:scale-[1.03] flex items-center justify-center"
      >
        <BellIcon className="h-5 w-5 text-slate-550" />
        {notificationCount > 0 && (
          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-md animate-pulse">
            {unreadLabel}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-96 min-w-[22rem] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl animate-slide-up-fade">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-cyan-50/30 px-6 py-4">
            <div>
              <p className="text-base font-bold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {notificationCount > 0 ? (
                  <span>You have <span className="font-semibold text-indigo-600">{notificationCount}</span> unread notifications</span>
                ) : (
                  <span>All caught up!</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {notificationCount > 0 && (
                <button
                  onClick={async () => {
                    await markNotificationsRead();
                    await refreshNotifications();
                  }}
                  className="flex items-center gap-1 rounded-full bg-indigo-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all"
                >
                  <CheckIcon className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 space-y-2 overflow-y-auto p-4 bg-slate-50/50">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 font-medium text-sm">No notifications yet</p>
                <p className="text-xs text-slate-300 mt-0.5">Check back soon for updates</p>
              </div>
            ) : (
              notifications.map((notification, index) => (
                <div
                  key={`${notification.title}-${index}`}
                  className={`rounded-2xl border border-slate-100 p-4 bg-white transition-all hover:shadow-sm ${
                    notification.isRead
                      ? "opacity-60"
                      : `${getNotificationColor(notification.type)}`
                  }`}
                >
                  {/* Notification Header */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-slate-800 ${notification.isRead ? "text-slate-500 font-semibold" : ""}`}>
                        {notification.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="mt-2 text-[10px] text-slate-400">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="flex-shrink-0 h-2 w-2 rounded-full bg-indigo-600 mt-2"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationMenu;
