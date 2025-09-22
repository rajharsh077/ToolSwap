import { Link, NavLink } from "react-router-dom";
import { useState } from "react";

const Navbar = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-xl font-bold">
              ToolSwap
            </Link>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex space-x-4 items-center">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 rounded-md text-sm font-medium ${
                  isActive ? "bg-blue-800" : "hover:bg-blue-700"
                }`
              }
            >
              Home
            </NavLink>

            {!user && (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? "bg-blue-800" : "hover:bg-blue-700"
                    }`
                  }
                >
                  Login
                </NavLink>

                <NavLink
                  to="/signup"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? "bg-blue-800" : "hover:bg-blue-700"
                    }`
                  }
                >
                  Signup
                </NavLink>
              </>
            )}

            {user && (
              <>
                <NavLink
                  to="/dashboard"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? "bg-blue-800" : "hover:bg-blue-700"
                    }`
                  }
                >
                  Dashboard
                </NavLink>

                <button
                  onClick={onLogout}
                  className="px-3 py-2 rounded-md text-sm font-medium bg-red-500 hover:bg-red-600"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-blue-600 focus:ring-white"
            >
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden px-2 pt-2 pb-3 space-y-1">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-base font-medium ${
                isActive ? "bg-blue-800" : "hover:bg-blue-700"
              }`
            }
          >
            Home
          </NavLink>

          {!user && (
            <>
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? "bg-blue-800" : "hover:bg-blue-700"
                  }`
                }
              >
                Login
              </NavLink>

              <NavLink
                to="/signup"
                className={({ isActive }) =>
                  `block px-3 py-2 rounded-md text-base font-medium ${
                    isActive ? "bg-blue-800" : "hover:bg-blue-700"
                  }`
                }
              >
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
                    isActive ? "bg-blue-800" : "hover:bg-blue-700"
                  }`
                }
              >
                Dashboard
              </NavLink>

              <button
                onClick={onLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-red-500 hover:bg-red-600"
              >
                Logout
              </button>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
