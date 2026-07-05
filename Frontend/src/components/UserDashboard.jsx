import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate, useParams, NavLink } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css"; 

// --- Custom Chat Imports ---
import ChatModal from './ChatModal'; 
import NotificationMenu from './NotificationMenu';
import Navbar from './Navbar';
import { useChat } from '../context/ChatContext'; 

// --- Heroicons ---
import { apiBaseUrl } from "../config";
import {
  WrenchScrewdriverIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  CheckCircleIcon,
  NoSymbolIcon,
  EyeIcon,
  HandRaisedIcon,
  ChatBubbleBottomCenterTextIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";

const UserDashboard = () => {
  const [tools, setTools] = useState([]);
  const [filteredTools, setFilteredTools] = useState([]);
  const [locationLabels, setLocationLabels] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [name, setName] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetChat, setTargetChat] = useState({ user: null, tool: null });
  const [requestedToolIds, setRequestedToolIds] = useState([]);
  const [currentUserData, setCurrentUserData] = useState({ id: null, name: '' });
  const [isDataInitialized, setIsDataInitialized] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const unique = [...new Set(tools.map((t) => t.category).filter(Boolean))];
    return ["all", ...unique.sort()];
  }, [tools]);

  const navigate = useNavigate();
  const { name: routeName } = useParams();
  const { unreadCount, requestCount } = useChat();

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

    if (!isDataInitialized) {
      const fetchTools = async () => {
        try {
          const res = await axios.get(`${apiBaseUrl}/tools`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const othersTools = res.data.filter((tool) => {
            const ownerId = tool.owner?._id || tool.owner;
            if (!ownerId || !decodedUserId) return true;
            return ownerId.toString().toLowerCase() !== decodedUserId.toString().toLowerCase();
          });
          setTools(othersTools);
          setFilteredTools(othersTools);
          setName(tokenUsername);
          setCurrentUserData({ id: decodedUserId, name: tokenUsername });
          setIsDataInitialized(true);
        } catch {
          toast.error("Failed to fetch tools.");
        }
      };

      fetchTools();
    }

    if (isDataInitialized && tokenUsername !== routeName) {
      navigate(`/${tokenUsername}`, { replace: true });
    }

  }, [navigate, routeName, isDataInitialized]);

  useEffect(() => {
    const resolveLocationLabels = async () => {
      const labels = {};

      for (const tool of tools) {
        const location = tool.location;
        if (typeof location === "string") {
          labels[tool._id] = location;
          continue;
        }
        if (!location) {
          labels[tool._id] = "Location provided";
          continue;
        }
        if (location.address || location.placeName) {
          labels[tool._id] = location.address || location.placeName;
          continue;
        }
        if (location.lat != null && location.lng != null) {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}`
            );
            const data = await response.json();
            labels[tool._id] = data.display_name || "Location provided";
          } catch {
            labels[tool._id] = "Location provided";
          }
        }
      }
      setLocationLabels((prev) => ({ ...prev, ...labels }));
    };

    if (tools.length) {
      resolveLocationLabels();
    }
  }, [tools]);

  // --- Filtering & Sorting ---
  useEffect(() => {
    let result = [...tools];

    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    if (locationFilter.trim()) {
      const locTerm = locationFilter.toLowerCase();
      result = result.filter((t) => {
        const text = locationLabels[t._id] || "";
        return text.toLowerCase().includes(locTerm);
      });
    }

    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortBy === "oldest") {
      result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    setFilteredTools(result);
  }, [searchTerm, locationFilter, sortBy, tools, locationLabels, selectedCategory]);

  const resetFilters = () => {
    setSearchTerm("");
    setLocationFilter("");
    setSortBy("newest");
    setSelectedCategory("all");
  };

  const handleOpenChat = (tool) => {
    if (!currentUserData.id) {
      toast.error("User not verified.");
      return;
    }
    setTargetChat({
      user: { id: tool.owner?._id, name: tool.owner?.name },
      tool: { id: tool._id, title: tool.title },
    });
    setIsChatOpen(true);
  };

  const getLocationText = (location, toolId) => {
    if (typeof location === "string") return location;
    if (!location) return "Location provided";
    if (location.address || location.placeName) return location.address || location.placeName;
    return locationLabels[toolId] || "Location provided";
  };

  const handleLend = async (toolId) => {
    const confirmed = window.confirm(
      "Do you want to send a borrow request for this tool?"
    );
    if (!confirmed) return;
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${apiBaseUrl}/tools/request/${toolId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRequestedToolIds((prev) => [...prev, toolId]);
      toast.success("✅ Request Sent to the owner!");
    } catch (err) {
      const message = err.response?.data?.message || "❌ Failed to send request.";
      toast.error(message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const activeNavLinkStyle = "bg-indigo-50 text-indigo-600 border border-indigo-100/50 shadow-sm";

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 antialiased font-sans flex flex-col">
      <Navbar user={currentUserData} onLogout={handleLogout} />

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        
        {/* Welcome Header */}
        <header className="mb-8 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-teal-500 text-white shadow-sm">
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Hello, {name}!
          </h2>
          <p className="text-white/90 text-sm font-medium">
            Borrow tools from neighbors or list your own tools.
          </p>
        </header>

        {/* Share Callout */}
        <section className="mb-8 p-6 bg-white border border-slate-100 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-lg">
              🛠️
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Have a tool to share?</h3>
              <p className="text-slate-400 text-xs mt-0.5">List it here so neighbors can borrow it.</p>
            </div>
          </div>
          
          <button
            onClick={() => navigate(`/${name}/addTool`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <PlusIcon className="h-4.5 w-4.5 stroke-[2.5]" />
            Add Tool
          </button>
        </section>

        {/* Search & Location Filters */}
        <div className="mb-8 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-700"
              />
            </div>
            <div className="relative flex-1">
              <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Location..."
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full p-3 pl-10 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs text-slate-700"
              />
            </div>
            <div className="relative min-w-[150px]">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-650 text-xs appearance-none cursor-pointer font-medium"
              >
                <option value="newest">📅 Newest</option>
                <option value="oldest">📅 Oldest</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pt-2 border-t border-slate-50">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border flex-shrink-0 ${
                  selectedCategory === cat
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="capitalize">{cat === "all" ? "All" : cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="inline-block p-3 bg-slate-50 rounded-xl mb-3">
              <MagnifyingGlassIcon className="h-8 w-8 text-slate-400 mx-auto" />
            </div>
            <h3 className="text-base font-bold text-slate-700 mb-1">No Tools Found</h3>
            <p className="text-slate-450 mb-5 max-w-xs mx-auto text-xs leading-relaxed">Adjust your search filters to find available neighborhood tools.</p>
            <button
              onClick={resetFilters}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <div
                key={tool._id}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group transition-all duration-300 hover:shadow-md hover:border-slate-200"
              >
                <div className="relative h-48 bg-slate-50 p-4 flex items-center justify-center border-b border-slate-50">
                  <img
                    src={tool.image || 'https://via.placeholder.com/200'}
                    alt={tool.title}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute top-3 left-3">
                    {tool.category && (
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {tool.category}
                      </span>
                    )}
                  </div>
                  <div className="absolute top-3 right-3">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      tool.available 
                        ? 'bg-emerald-50 text-emerald-700' 
                        : 'bg-slate-150 bg-slate-200 text-slate-500'
                    }`}>
                      {tool.available ? 'Available' : 'Booked'}
                    </span>
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-1">{tool.title}</h3>
                  <p className="text-slate-550 text-xs mb-4 flex-grow line-clamp-2 leading-relaxed">
                    {tool.description}
                  </p>

                  <div className="space-y-1.5 mb-4 text-[11px] text-slate-500 border-b border-slate-50 pb-3">
                    <p className="flex items-center gap-1.5">
                      <MapPinIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="line-clamp-1">{getLocationText(tool.location, tool._id) || 'Location provided'}</span>
                    </p>
                    {tool.owner && (
                      <div className="flex items-center gap-1.5">
                        <UserCircleIcon className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span>Owner: {tool.owner.name}</span>
                        {tool.owner.rating > 0 && (
                          <div className="flex items-center gap-0.5 ml-auto text-amber-500 font-bold">
                            <StarIcon className="h-3.5 w-3.5 fill-current" />
                            <span>{tool.owner.rating}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    <button
                      onClick={() => navigate(`/tool/${tool._id}`)}
                      className="border border-slate-200 text-slate-600 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleOpenChat(tool)}
                      className="bg-indigo-50 text-indigo-650 py-2 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => handleLend(tool._id)}
                      disabled={requestedToolIds.includes(tool._id)}
                      className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                        requestedToolIds.includes(tool._id)
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-250'
                          : 'bg-teal-600 text-white hover:bg-teal-700'
                      }`}
                    >
                      {requestedToolIds.includes(tool._id) ? 'Pending' : 'Borrow'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* ChatModal & Toast */}
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
