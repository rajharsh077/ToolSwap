import { Link, NavLink } from "react-router-dom";
import { useState } from "react";
import { 
  Bars3Icon, 
  XMarkIcon, 
  WrenchScrewdriverIcon, 
  HomeIcon, 
  ArrowLeftOnRectangleIcon, 
  UserPlusIcon, 
  Cog6ToothIcon, 
  ArrowRightOnRectangleIcon,
  ChatBubbleLeftRightIcon 
} from "@heroicons/react/24/solid";

import { useChat } from '../context/ChatContext'; // ⬅️ NEW: Import Context Hook

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { unreadCount } = useChat(); // ⬅️ NEW: Consume Unread Count

  const toggleMenu = () => setIsOpen(!isOpen);

  const userName = user?.name || ''; 

  const baseNavLinkStyle = "px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 flex items-center gap-1 relative"; // ⬅️ Added relative
  const activeNavLinkStyle = "bg-slate-100 text-sky-500 shadow-sm";
  const inactiveNavLinkStyle = "hover:bg-slate-50";

  // --- Badge Helper ---
  const renderBadge = (count) => (
    count > 0 && (
      <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10">
        {count > 9 ? '9+' : count}
      </span>
    )
  );

  return (
    <nav className="bg-white text-slate-900 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-7 w-7 text-sky-400" />
            <Link to="/" className="text-2xl font-bold tracking-tight">
              ToolSwap
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-2 items-center">
            <NavLink to="/" className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
              <HomeIcon className="h-4 w-4" /> Home
            </NavLink>

            {!user && (
              <>
                <NavLink to="/login" className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                  Login
                </NavLink>
                <NavLink to="/signup" className={`${baseNavLinkStyle} bg-sky-400 text-white hover:bg-sky-500 hover:scale-105 transform transition-transform duration-200`}>
                  Signup
                </NavLink>
              </>
            )}

            {user && (
              <>
                {/* Messages Link with Badge */}
                <NavLink
                  to={`/${userName}/messages`}
                  className={({ isActive }) =>
                    `${baseNavLinkStyle} ${
                      isActive ? activeNavLinkStyle : inactiveNavLinkStyle
                    }`
                  }
                >
                  <ChatBubbleLeftRightIcon className="h-4 w-4" /> Messages
                  {renderBadge(unreadCount)} {/* ⬅️ RENDER BADGE */}
                </NavLink>
                
                <NavLink to={`/${userName}`} className={({ isActive }) => `${baseNavLinkStyle} ${isActive ? activeNavLinkStyle : inactiveNavLinkStyle}`}>
                  <Cog6ToothIcon className="h-4 w-4" /> Dashboard
                </NavLink>
                
                <button onClick={onLogout} className={`${baseNavLinkStyle} bg-red-500 text-white hover:bg-red-600`}>
                  <ArrowRightOnRectangleIcon className="h-4 w-4" /> Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          {/* ... (Mobile menu remains the same, need to integrate badge here too) ... */}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;