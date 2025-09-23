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
  ArrowRightOnRectangleIcon 
} from "@heroicons/react/24/solid";

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const baseNavLinkStyle = "px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 flex items-center gap-1";
  const activeNavLinkStyle = "bg-slate-100 text-sky-500 shadow-sm";
  const inactiveNavLinkStyle = "hover:bg-slate-50";

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
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${baseNavLinkStyle} ${
                  isActive ? activeNavLinkStyle : inactiveNavLinkStyle
                }`
              }
            >
              <HomeIcon className="h-4 w-4" />
              Home
            </NavLink>

            {!user && (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `${baseNavLinkStyle} ${
                      isActive ? activeNavLinkStyle : inactiveNavLinkStyle
                    }`
                  }
                >
                  {/* <ArrowLeftOnRectangleIcon className="h-4 w-4" /> */}
                  Login
                </NavLink>

                <NavLink
                  to="/signup"
                  className={`${baseNavLinkStyle} bg-sky-400 text-white hover:bg-sky-500 hover:scale-105 transform transition-transform duration-200`}
                >
                  {/* <UserPlusIcon className="h-4 w-4" /> */}
                  Signup
                </NavLink>
              </>
            )}

            {user && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `${baseNavLinkStyle} ${
                      isActive ? activeNavLinkStyle : inactiveNavLinkStyle
                    }`
                  }
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Dashboard
                </NavLink>

                <button
                  onClick={onLogout}
                  className={`${baseNavLinkStyle} bg-red-500 text-white hover:bg-red-600`}
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500"
            >
              {isOpen ? (
                <XMarkIcon className="block h-6 w-6" />
              ) : (
                <Bars3Icon className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-base font-medium ${
                isActive ? "bg-slate-100 text-sky-500" : "hover:bg-slate-50"
              }`
            }
          >
            <HomeIcon className="h-5 w-5 mr-2 inline-block" />
            Home
          </NavLink>

          {!user && (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? "bg-slate-100 text-sky-500" : "hover:bg-slate-50"
                  }`
                }
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 mr-2 inline-block" />
                Login
              </NavLink>

              <NavLink
                to="/signup"
                className="block w-full text-center px-3 py-2 rounded-md text-base font-medium bg-sky-400 text-white hover:bg-sky-500"
              >
                <UserPlusIcon className="h-5 w-5 mr-2 inline-block" />
                Signup
              </NavLink>
            </>
          )}

          {user && (
            <>
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? "bg-slate-100 text-sky-500" : "hover:bg-slate-50"
                  }`
                }
              >
                <Cog6ToothIcon className="h-5 w-5 mr-2 inline-block" />
                Dashboard
              </NavLink>

              <button
                onClick={onLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-red-500 text-white hover:bg-red-600"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 inline-block" />
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;