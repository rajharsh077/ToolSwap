import { Link, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { apiBaseUrl } from "../config";
import { 
  Bars3Icon, 
  XMarkIcon, 
  WrenchScrewdriverIcon, 
  HomeIcon, 
  ArrowLeftOnRectangleIcon, 
  UserPlusIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  UserCircleIcon
} from "@heroicons/react/24/solid";

import { useChat } from '../context/ChatContext';
import NotificationMenu from './NotificationMenu';

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { unreadCount, notificationCount, requestCount } = useChat();

  const userName = user?.name || ''; 

  const baseNavLinkStyle = "px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 relative hover:scale-[1.03]";
  const activeNavLinkStyle = "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50";
  const inactiveNavLinkStyle = "text-slate-600 hover:text-slate-900 hover:bg-slate-50";

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem("token");
      if (!token || !user) return;
      try {
        const res = await axios.get(`${apiBaseUrl}/user/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchNotifications();
  }, [user]);

  const markNotificationsRead = async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;
    try {
      await axios.put(`${apiBaseUrl}/user/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // --- Badge Helper ---
  const renderBadge = (count, color = "bg-red-500") => (
    count > 0 && (
      <span className={`absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 ${color} text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 animate-pulse`}>
        {count > 9 ? '9+' : count}
      </span>
    )
  );

  return (
    <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100/80 text-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-600" />
            <Link to="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
              ToolShare
            </Link>
          </div>

          <div className="hidden md:flex space-x-2 items-center">
            <NavLink to="/" end className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
              <HomeIcon className="h-4 w-4" /> Home
            </NavLink>

            {!user && (
              <>
                <NavLink to="/login" className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                  Login
                </NavLink>
                <NavLink to="/signup" className={`${baseNavLinkStyle} bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10`}>
                  Signup
                </NavLink>
              </>
            )}

            {user && (
              <>
                {user.isAdmin ? (
                  <NavLink to="/admin" end className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                    <Cog6ToothIcon className="h-4 w-4" /> Admin Dashboard
                  </NavLink>
                ) : (
                  <NavLink to={`/${userName}`} end className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                    <WrenchScrewdriverIcon className="h-4 w-4" /> Dashboard
                  </NavLink>
                )}
                <NotificationMenu />
                <NavLink to={`/${userName}/messages`} className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                  <ChatBubbleLeftRightIcon className="h-4 w-4" /> Messages
                  {renderBadge(unreadCount)}
                </NavLink>
                <NavLink to={`/${userName}/leaderboard`} className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                  <TrophyIcon className="h-4 w-4" /> Leaderboard
                </NavLink>
                <NavLink to={`/${userName}/profile`} className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                  <UserCircleIcon className="h-4 w-4" /> Profile
                  {renderBadge(requestCount, "bg-amber-500")}
                </NavLink>
                <button onClick={onLogout} className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 flex items-center gap-1.5 hover:scale-[1.03] bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 border border-slate-200/50 hover:border-red-100">
                  <ArrowRightOnRectangleIcon className="h-4 w-4" /> Logout
                </button>
              </>
            )}
          </div>

          <button className="md:hidden rounded-full p-2 text-slate-700 hover:bg-slate-100 transition-colors" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle navigation">
            {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="border-t border-slate-100 bg-white/95 backdrop-blur-md py-3 md:hidden rounded-b-2xl shadow-xl transition-all">
            <div className="flex flex-col gap-2 px-2">
              <NavLink to="/" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                <HomeIcon className="h-4.5 w-4.5" /> Home
              </NavLink>

              {!user ? (
                <>
                  <NavLink to="/login" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all">Login</NavLink>
                  <NavLink to="/signup" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all">Signup</NavLink>
                </>
              ) : (
                <>
                  {user.isAdmin ? (
                    <NavLink to="/admin" onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                      <Cog6ToothIcon className="h-4.5 w-4.5" /> Admin Dashboard
                    </NavLink>
                  ) : (
                    <NavLink to={`/${userName}`} onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                      <WrenchScrewdriverIcon className="h-4.5 w-4.5" /> Dashboard
                    </NavLink>
                  )}
                  <NavLink to={`/${userName}/messages`} onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex justify-between items-center">
                    <span className="flex items-center gap-2"><ChatBubbleLeftRightIcon className="h-4.5 w-4.5" /> Messages</span>
                    {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
                  </NavLink>
                  <NavLink to={`/${userName}/leaderboard`} onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center gap-2">
                    <TrophyIcon className="h-4.5 w-4.5" /> Leaderboard
                  </NavLink>
                  <NavLink to={`/${userName}/profile`} onClick={() => setIsOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-all flex justify-between items-center">
                    <span className="flex items-center gap-2"><UserCircleIcon className="h-4.5 w-4.5" /> Profile</span>
                    {requestCount > 0 && <span className="bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{requestCount}</span>}
                  </NavLink>
                  <button onClick={() => { onLogout?.(); setIsOpen(false); }} className="rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 transition-all flex items-center gap-2">
                    <ArrowRightOnRectangleIcon className="h-4 w-4" /> Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
