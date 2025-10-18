import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; 

// --- Custom Chat Imports ---
import ChatModal from './ChatModal'; 
import { useChat } from '../context/ChatContext'; 

// --- Heroicons ---
import {
  WrenchScrewdriverIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  XMarkIcon,
  PhoneIcon,
  StarIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  EyeIcon,
  HandRaisedIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";


const UserDashboard = () => {
  const [tools, setTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [name, setName] = useState("");
  const [userId, setUserId] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetChat, setTargetChat] = useState({ user: null, tool: null });
  const [currentUserData, setCurrentUserData] = useState({ id: null, name: '' });
  const [isDataInitialized, setIsDataInitialized] = useState(false);

  const navigate = useNavigate();
  const { name: routeName } = useParams();
  const { unreadCount } = useChat();

  // --- Authentication & Data Fetch ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first.");
      navigate("/login");
      return;
    }

    let decodedUserId;
    let tokenUsername;

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        toast.info("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      tokenUsername = decoded.username || decoded.name;
      decodedUserId = decoded.id || decoded.userId || decoded._id;
    } catch {
      toast.error("Invalid token.");
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }

    // Fetch tools only once
    if (!isDataInitialized) {
      const fetchTools = async () => {
        try {
          const res = await axios.get("http://localhost:3000/tools", {
            headers: { Authorization: `Bearer ${token}` },
          });
          const othersTools = res.data.filter(
            (tool) => tool.owner?._id !== decodedUserId
          );
          setTools(othersTools);
          setFilteredTools(othersTools);
          setUserId(decodedUserId);
          setName(tokenUsername);
          setCurrentUserData({ id: decodedUserId, name: tokenUsername });
          setIsDataInitialized(true);
        } catch {
          toast.error("Failed to fetch tools.");
        }
      };

      fetchTools();
    }

    // Navigate to correct route after initialization
    if (isDataInitialized && tokenUsername !== routeName) {
      navigate(`/${tokenUsername}`, { replace: true });
    }

  }, [navigate, routeName, isDataInitialized]);

  // --- Search & Location Filter ---
  useEffect(() => {
    let filtered = tools;
    if (searchTerm) {
      filtered = filtered.filter((tool) =>
        tool.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (locationFilter) {
      filtered = filtered.filter((tool) =>
        tool.location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }
    setFilteredTools(filtered);
  }, [searchTerm, locationFilter, tools]);

  // --- Handlers ---
  const handleOpenChat = (tool) => {
    setTargetChat({ 
      user: { id: tool.owner._id, name: tool.owner.name },
      tool: { id: tool._id, title: tool.title } 
    });
    setIsChatOpen(true);
  };

  const handleLend = async (toolId) => {
    const confirmed = window.confirm(
      "Do you want to send a borrow request for this tool?"
    );
    if (!confirmed) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `http://localhost:3000/tools/request/${toolId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Request Sent to the owner!");
    } catch {
      toast.error("❌ Failed to send request.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const navLinkStyle = "flex items-center gap-2 text-slate-600 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors relative";
  const activeNavLinkStyle = "bg-slate-100 text-slate-800";

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <WrenchScrewdriverIcon className="h-8 w-8 text-[#06B6D4]" />
              <h1 className="text-2xl font-bold text-slate-900">ToolSwap</h1>
            </div>
            <div className="flex items-center gap-4">
              <NavLink
                to={`/${name}/messages`}
                className={({ isActive }) =>
                  `${navLinkStyle} ${isActive ? activeNavLinkStyle : ''}`
                }
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                Messages
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full z-10 shadow-md">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
              <NavLink
                to={`/${name}/profile`}
                className={({ isActive }) =>
                  `${navLinkStyle} ${isActive ? activeNavLinkStyle : ''}`
                }
              >
                <UserCircleIcon className="h-5 w-5" />
                Profile
              </NavLink>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-[#1E3A8A] text-white font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-[#15275a] transition-all transform hover:scale-105"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
            Welcome, {name}!
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover tools shared by your community. Ready to start a new project?
          </p>
        </header>

        {/* Add Tool Section */}
        <section className="mb-12 p-6 bg-[#1E3A8A] rounded-2xl shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">Got a tool to share?</h3>
            <p className="text-gray-300">Help out a neighbor and list your tool on the platform.</p>
          </div>
          <button
            onClick={() => navigate(`/${name}/addTool`)}
            className="bg-white text-[#1E3A8A] font-bold px-6 py-3 rounded-lg shadow-md hover:scale-105 transition-transform flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add a New Tool
          </button>
        </section>

        {/* Search & Location Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search for a hammer, drill, etc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 pl-12 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition-shadow"
            />
          </div>
          <div className="relative">
            <MapPinIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by location..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full p-3 pl-12 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] transition-shadow"
            />
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-slate-700">No Tools Found</h3>
            <p className="text-slate-500 mt-2">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredTools.map((tool) => (
              <div
                key={tool._id}
                className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-xl hover:ring-2 hover:ring-[#06B6D4]"
              >
                <div className="overflow-hidden">
                  <img
                    src={tool.image}
                    alt={tool.title}
                    className="w-full h-56 object-contain group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">{tool.title}</h3>
                  <p className="text-slate-600 text-sm mb-4 flex-grow">
                    {tool.description.length > 80 ? `${tool.description.slice(0, 80)}...` : tool.description}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <MapPinIcon className="h-5 w-5" />
                    <span>{tool.location}</span>
                  </p>
                  <div className="flex justify-between items-center mt-auto gap-2">
                    <button
                      onClick={() => setSelectedTool(tool)}
                      className="w-1/3 border border-slate-300 text-slate-800 px-2 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <EyeIcon className="h-4 w-4" /> View
                    </button>
                    <button
                      onClick={() => handleOpenChat(tool)}
                      className="w-1/3 border border-slate-300 text-slate-800 px-2 py-2 rounded-lg text-sm font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                    >
                      <ChatBubbleBottomCenterTextIcon className="h-4 w-4" /> Chat
                    </button>
                    <button
                      onClick={() => handleLend(tool._id)}
                      className="w-1/3 bg-[#06B6D4] text-white px-2 py-2 rounded-lg text-sm font-semibold hover:bg-[#0598B5] transition-colors flex items-center justify-center gap-1"
                    >
                      <HandRaisedIcon className="h-4 w-4" /> Borrow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal & Footer remain the same as your previous code */}
      {/* ...ChatModal & Footer components */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={currentUserData}
        targetUser={targetChat.user}
        targetTool={targetChat.tool}
      />
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
    </div>
  );
};

export default UserDashboard;
