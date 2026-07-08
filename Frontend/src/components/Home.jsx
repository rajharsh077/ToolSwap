import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "./ConfirmDialog";
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  HandRaisedIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  ClockIcon,
  FireIcon,
  TagIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ArrowPathIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/solid";
import { apiBaseUrl } from "../config";

const Home = () => {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReportInput, setShowReportInput] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [locationLabels, setLocationLabels] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("all");
  const [categories, setCategories] = useState([]);
  const [homeUser, setHomeUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: "", message: "", onConfirm: null });
  const navigate = useNavigate();

  // New States for upgraded features
  const [userCoords, setUserCoords] = useState(null);
  const [stats, setStats] = useState({ totalUsers: 0, availableTools: 0, totalCategories: 0, successfulBorrows: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [topLenders, setTopLenders] = useState([]);
  const [lendersLoading, setLendersLoading] = useState(true);
  const [latestReviews, setLatestReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [activeTab, setActiveTab] = useState("recent"); // 'recent' | 'popular' | 'near' | 'recommended'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);
  const searchSectionRef = useRef(null);

  // FAQ Data list
  const faqData = [
    {
      question: "How do I borrow a tool?",
      answer: "Create an account, browse available tools near you, and send a borrow request. Once approved, coordinate pickup details via our real-time messaging interface."
    },
    {
      question: "Can I lend my own tools?",
      answer: "Absolutely. Go to your dashboard or profile, click 'Add Tool', upload an image, and set availability. You choose who borrows your tools."
    },
    {
      question: "Is there any cost involved?",
      answer: "No, ToolShare is a community-driven neighborhood tool library. All lends and borrows are 100% free of charge."
    },
    {
      question: "What happens if a tool gets damaged?",
      answer: "We foster trust and accountability. If a tool is damaged, borrowers are expected to notify owners immediately to resolve repair or replacement costs."
    },
    {
      question: "How do ratings and verification badges work?",
      answer: "Lenders earn star ratings from completed lends. Trust badges like '✓ Verified Owner' or 'Trusted Lender' are awarded to top-rated community members."
    }
  ];

  // Geolocation trigger
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log("Geolocation prompt dismissed or errored:", error);
        }
      );
    }
  }, []);

  // Fetch stats, top lenders, and reviews from DB
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const res = await axios.get(`${apiBaseUrl}/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    const fetchTopLenders = async () => {
      try {
        setLendersLoading(true);
        const res = await axios.get(`${apiBaseUrl}/users/top-lenders`);
        setTopLenders(res.data);
      } catch (err) {
        console.error("Error fetching top lenders:", err);
      } finally {
        setLendersLoading(false);
      }
    };

    const fetchLatestReviews = async () => {
      try {
        setReviewsLoading(true);
        const res = await axios.get(`${apiBaseUrl}/tools/reviews/latest`);
        setLatestReviews(res.data);
      } catch (err) {
        console.error("Error fetching latest reviews:", err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchStats();
    fetchTopLenders();
    fetchLatestReviews();
  }, []);

  // Load recently viewed tools from local storage
  useEffect(() => {
    const stored = localStorage.getItem("recently_viewed_tools");
    if (stored) {
      try {
        setRecentlyViewed(JSON.parse(stored));
      } catch (e) {
        console.error("Error reading recently viewed tools:", e);
      }
    }
  }, []);

  // Track user login session but DO NOT auto-redirect to dashboard
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setHomeUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      if (decoded?.exp && decoded.exp < Date.now() / 1000) {
        localStorage.removeItem("token");
        setHomeUser(null);
        return;
      }
      const uName = decoded.username || decoded.name;
      setHomeUser({ id: decoded.id || decoded._id, name: uName, isAdmin: decoded.isAdmin });
    } catch {
      localStorage.removeItem("token");
      setHomeUser(null);
    }
  }, []);

  // Fetch tools list
  useEffect(() => {
    const fetchTools = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${apiBaseUrl}/tools`);
        setTools(res.data);
        
        const uniqueCategories = [...new Set(res.data.map(tool => tool.category).filter(Boolean))];
        setCategories(uniqueCategories.sort());
      } catch (err) {
        console.error("Error fetching tools:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  // Reverse geocoding for text locations
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

  // Haversine Distance helper
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  // Get distance from user location
  const getDistanceText = useCallback((tool) => {
    if (userCoords && tool.location?.lat && tool.location?.lng) {
      const dist = calculateDistance(userCoords.lat, userCoords.lng, tool.location.lat, tool.location.lng);
      if (dist) {
        return `${dist} km away`;
      }
    }
    return "";
  }, [userCoords]);

  const getLocationText = useCallback((location, toolId) => {
    if (typeof location === "string") return location;
    if (!location) return "Location provided";
    if (location.address || location.placeName) return location.address || location.placeName;
    if (toolId && locationLabels[toolId]) return locationLabels[toolId];
    return "Location provided";
  }, [locationLabels]);

  // Track click to modal and append to recently viewed
  const openModal = (tool) => {
    setSelectedTool(tool);
    setShowModal(true);
    
    // Add to recently viewed tools
    if (tool && tool._id) {
      setRecentlyViewed((prev) => {
        const filtered = prev.filter(t => t._id !== tool._id);
        const updated = [tool, ...filtered].slice(0, 4);
        localStorage.setItem("recently_viewed_tools", JSON.stringify(updated));
        return updated;
      });
    }
  };

  const closeModal = () => {
    setSelectedTool(null);
    setShowModal(false);
    setShowReportInput(false);
    setReportReason("");
    setReportStatus(null);
  };

  const handleGet = () => {
    navigate("/login");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setHomeUser(null);
    navigate("/");
  };

  const handleReportTool = async (tool) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (!reportReason.trim()) {
      setReportStatus({ type: "error", message: "Please add a reason for reporting." });
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: "Report This Listing?",
      message: "This listing will be flagged for review by our moderation team. Please ensure your concern is valid.",
      isDangerous: true,
      onConfirm: async () => {
        setReporting(true);
        setReportStatus(null);
        try {
          const res = await axios.post(
            `${apiBaseUrl}/tools/report/${tool._id}`,
            { reason: reportReason.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setReportStatus({ type: "success", message: res.data.message || "Report submitted. Thank you!" });
          setShowReportInput(false);
          setReportReason("");
          setConfirmDialog({ isOpen: false });
        } catch (err) {
          const message = err.response?.data?.message || "Could not submit the report.";
          setReportStatus({ type: "error", message });
        } finally {
          setReporting(false);
        }
      }
    });
  };

  // Upgraded tabs logic for featured section
  const featuredTools = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    // 1. Filter out user's own tools if logged in, plus apply search & category query
    const filtered = tools.filter((tool) => {
      if (homeUser) {
        const ownerId = tool.owner?._id || tool.owner;
        if (ownerId && ownerId.toString() === homeUser.id.toString()) {
          return false;
        }
      }

      const locText = typeof tool.location === "string" 
        ? tool.location 
        : (tool.location?.address || tool.location?.placeName || "");
        
      const searchableText = [
        tool.title,
        tool.description,
        locText,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesCategory = category === "all" || tool.category === category;

      return matchesSearch && matchesCategory;
    });

    // 2. Sort/order based on the active tab
    if (activeTab === "recent") {
      return [...filtered].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    if (activeTab === "popular") {
      return [...filtered].sort((a, b) => {
        const ratingB = b.owner?.rating || 0;
        const ratingA = a.owner?.rating || 0;
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b.borrowCount || 0) - (a.borrowCount || 0);
      });
    }
    if (activeTab === "near") {
      return [...filtered].sort((a, b) => {
        const distA = userCoords && a.location?.lat && a.location?.lng
          ? parseFloat(calculateDistance(userCoords.lat, userCoords.lng, a.location.lat, a.location.lng))
          : parseInt(a._id?.substring(18, 24) || "0", 16) % 8;
        const distB = userCoords && b.location?.lat && b.location?.lng
          ? parseFloat(calculateDistance(userCoords.lat, userCoords.lng, b.location.lat, b.location.lng))
          : parseInt(b._id?.substring(18, 24) || "0", 16) % 8;
        return distA - distB;
      });
    }
    if (activeTab === "recommended") {
      const viewedCategories = recentlyViewed.map(t => t.category).filter(Boolean);
      return [...filtered].sort((a, b) => {
        const aMatch = viewedCategories.includes(a.category) ? 1 : 0;
        const bMatch = viewedCategories.includes(b.category) ? 1 : 0;
        if (aMatch !== bMatch) return bMatch - aMatch;
        return (b.owner?.rating || 0) - (a.owner?.rating || 0);
      });
    }
    return filtered;
  }, [tools, searchTerm, category, activeTab, userCoords, recentlyViewed, homeUser]);

  // Trending section tools list
  const trendingTools = useMemo(() => {
    return tools
      .filter(tool => tool.available && !tool.isFlagged)
      .slice(0, 4);
  }, [tools]);

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-4.5 w-4.5 text-amber-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <StarIcon className="h-4.5 w-4.5 text-amber-400 opacity-50" />
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: "50%" }}
            >
              <StarIcon className="h-4.5 w-4.5 text-amber-400" />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-4.5 w-4.5 text-slate-200" />
        ))}
      </div>
    );
  };

  // Card Skeleton Loader Component
  const ToolCardSkeleton = () => (
    <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 p-5 space-y-4 animate-pulse shadow-sm">
      <div className="h-48 bg-slate-200 rounded-xl w-full"></div>
      <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      <div className="h-6 bg-slate-200 rounded w-3/4"></div>
      <div className="h-4 bg-slate-200 rounded w-full"></div>
      <div className="flex justify-between items-center pt-3 border-t border-slate-100">
        <div className="h-8 bg-slate-200 rounded-full w-24"></div>
        <div className="h-4 bg-slate-200 rounded w-16"></div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-800 font-sans antialiased">
      <Navbar user={homeUser} onLogout={handleLogout} />      {/* 1. Hero Section with Personalization (Light-Theme Upgrade) */}
      <section className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-teal-50/40 py-20 md:py-28 text-left relative overflow-hidden border-b border-slate-200/40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.06),_transparent_55%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.04),_transparent_45%)] pointer-events-none" />
        <div className="container mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
          
          <div className="md:order-1 text-center md:text-left">
            {homeUser ? (
              <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-xs font-bold text-indigo-600 tracking-wider uppercase shadow-sm">
                Welcome back to your sharing community, {homeUser.name}! 🌟
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 px-4 py-1.5 text-xs font-bold text-indigo-600 tracking-wider uppercase shadow-sm">
                The Neighborhood Tool Sharing Network
              </span>
            )}
            
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight tracking-tight mb-6 text-slate-900">
              {homeUser ? (
                <>Ready to <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent animate-pulse">borrow or lend</span> today, {homeUser.name}?</>
              ) : (
                <>Don't buy it. <br className="hidden md:block" /> Just <span className="bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">Share It</span>.</>
              )}
            </h1>
            
            <p className="text-base md:text-lg font-medium text-slate-500 mb-10 max-w-xl mx-auto md:mx-0 leading-relaxed">
              Welcome to ToolShare – your neighborhood's peer-to-peer tool library. Instantly borrow high-quality equipment from verified local owners, list your own unused gear to earn points, and build a collaborative community.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              {homeUser ? (
                <>
                  <button 
                    onClick={() => navigate(`/${homeUser.name}/profile`)}
                    className="inline-flex items-center justify-center bg-indigo-600 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-indigo-600/10 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 active:scale-98"
                  >
                    My Profile & Dashboard
                  </button>
                  <button 
                    onClick={() => {
                      searchSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="inline-flex items-center justify-center border border-slate-200 bg-white text-slate-700 font-bold px-8 py-4 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:scale-105 transition-all active:scale-98"
                  >
                    Browse Listings
                  </button>
                </>
              ) : (
                <>
                  <a href="/signup" className="inline-flex items-center justify-center bg-indigo-600 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-indigo-600/10 transition-all duration-300 hover:scale-105 hover:bg-indigo-700 active:scale-98">
                    Get Started
                  </a>
                  <a href="#featured" className="inline-flex items-center justify-center border border-slate-200 bg-white text-slate-700 font-bold px-8 py-4 rounded-full shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:scale-105 transition-all active:scale-98">
                    Explore Tools
                  </a>
                </>
              )}
            </div>
          </div>
          
          <div className="md:order-2 flex items-center justify-center p-4 md:p-8">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
              <div className="absolute inset-0 bg-indigo-500 rounded-[2.5rem] transform rotate-6 shadow-xl opacity-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-teal-600 rounded-[2.5rem] transform -rotate-6 shadow-2xl flex items-center justify-center border border-indigo-400/20">
                <div className="text-center p-8">
                  <h3 className="text-6xl font-black text-white drop-shadow-md">
                    {statsLoading ? "..." : `${stats.totalUsers}+`}
                  </h3>
                  <p className="mt-3 text-xs font-black text-indigo-100 uppercase tracking-wider">Neighbors sharing tools</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Statistics Section */}
      <section className="py-16 bg-slate-50/80 border-y border-slate-200/40 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.03),_transparent_50%)] pointer-events-none" />
        <div className="container mx-auto max-w-7xl px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            
            <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:-translate-y-1 hover:border-indigo-100 transition-all duration-300 flex flex-col justify-center items-center">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl mb-3.5 shadow-sm">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
              ) : (
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalUsers}</span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Registered Users</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:-translate-y-1 hover:border-teal-100 transition-all duration-300 flex flex-col justify-center items-center">
              <div className="p-3 bg-teal-50 text-teal-600 rounded-2xl mb-3.5 shadow-sm">
                <WrenchScrewdriverIcon className="h-6 w-6" />
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
              ) : (
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.availableTools}</span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Available Tools</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:-translate-y-1 hover:border-amber-100 transition-all duration-300 flex flex-col justify-center items-center">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl mb-3.5 shadow-sm">
                <TagIcon className="h-6 w-6" />
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
              ) : (
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalCategories}</span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Categories</span>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-md hover:-translate-y-1 hover:border-rose-100 transition-all duration-300 flex flex-col justify-center items-center">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl mb-3.5 shadow-sm">
                <ArrowPathIcon className="h-6 w-6" />
              </div>
              {statsLoading ? (
                <div className="h-8 w-16 bg-slate-200 rounded animate-pulse mb-1"></div>
              ) : (
                <span className="text-3xl font-black text-slate-900 tracking-tight">{stats.successfulBorrows}</span>
              )}
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5">Successful Borrows</span>
            </div>

          </div>
        </div>
      </section>

      {/* 3. Popular Categories Quick Filters */}
      <section className="py-12 bg-gradient-to-b from-slate-50/80 to-white/40">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 text-indigo-650 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase mb-2">
              🏷️ Category Explorer
            </span>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Popular Categories</h3>
            <p className="text-slate-500 mt-1 text-xs">Filter through community inventory instantly</p>
          </div>
          
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-3 justify-start md:justify-center">
            <button
              onClick={() => {
                setCategory("all");
                searchSectionRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className={`px-6 py-2.5 rounded-full text-xs font-bold border transition-all flex items-center gap-2 flex-shrink-0 ${
                category === "all"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm hover:border-slate-350"
              }`}
            >
              📂 All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  searchSectionRef.current?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`px-6 py-2.5 rounded-full text-xs font-bold border transition-all capitalize flex-shrink-0 flex items-center gap-2 ${
                  category === cat
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/10"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm hover:border-slate-350"
                }`}
              >
                🛠️ {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Trending Section */}
      <section className="py-16 bg-white relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-80 h-80 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container mx-auto max-w-7xl px-6 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex rounded-full bg-rose-50 border border-rose-100 text-rose-600 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase items-center gap-1 mb-2">
              <FireIcon className="h-3.5 w-3.5 text-rose-500 animate-pulse" /> Popular Picks
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trending Today</h2>
            <p className="text-slate-550 mt-1.5 text-sm">The most active listings requested by Delhi borrowers this week</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <ToolCardSkeleton key={i} />)}
            </div>
          ) : trendingTools.length === 0 ? (
            <p className="text-slate-500 italic text-center py-6">No trending tools right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {trendingTools.map((tool) => (
                <div
                  key={`trending-${tool._id}`}
                  onClick={() => openModal(tool)}
                  className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200/70 hover:border-indigo-200 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg cursor-pointer flex flex-col shadow-sm"
                >
                  <div className="relative h-44 overflow-hidden bg-slate-50 flex items-center justify-center p-3">
                    <div className="absolute inset-0 bg-slate-900/5 group-hover:bg-transparent transition-colors z-10" />
                    <img
                      src={tool.image}
                      alt={tool.title}
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
                        e.target.onerror = null;
                      }}
                      className="w-full h-full object-cover rounded-xl transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 bg-rose-500 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md z-20 flex items-center gap-1">
                      <FireIcon className="h-3 w-3" /> Trending
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest block mb-1">{tool.category}</span>
                      <h4 className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 line-clamp-1">{tool.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{tool.owner?.name}</span>
                      {getDistanceText(tool) && <span className="font-semibold text-indigo-600">{getDistanceText(tool)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. Sticky Search + Filters Section */}
      <section ref={searchSectionRef} className="sticky top-[64px] z-30 bg-slate-55/90 backdrop-blur-md py-4 border-y border-slate-200/60 shadow-sm transition-all">
        <div className="container mx-auto max-w-7xl px-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Sticky Search bar */}
          <div className="relative w-full md:max-w-xl">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, category, or location..."
              className="w-full rounded-full border border-slate-200 bg-white p-3.5 pl-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
            />
          </div>

          {/* Inline filters */}
          <div className="flex gap-3 w-full md:w-auto justify-end">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-550 shadow-sm appearance-none cursor-pointer"
            >
              <option value="all">📁 All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>📁 {cat}</option>
              ))}
            </select>

            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-550 shadow-sm appearance-none cursor-pointer"
            >
              <option value="recent">🆕 Recently Added</option>
              <option value="popular">⭐ Popular / High Rated</option>
              <option value="near">📍 Near You</option>
              <option value="recommended">💡 Recommended</option>
            </select>
          </div>

        </div>
      </section>

      {/* 6. Featured Tools Section with Category Tabs */}
      <section id="featured" className="py-20 px-6 bg-slate-50/45 flex-1 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container mx-auto max-w-7xl relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase mb-2">
              🔎 Community Listings
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">Explore Available Tools</h2>
            <p className="text-slate-500 mt-2 text-sm">Connect with neighbors and secure the items you need</p>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-slate-200 mb-10 overflow-x-auto scrollbar-none gap-8 justify-start md:justify-center">
            {[
              { id: "recent", label: "Recently Added", icon: "🆕" },
              { id: "popular", label: "Popular", icon: "⭐" },
              { id: "near", label: "Near You", icon: "📍" },
              { id: "recommended", label: "Recommended for you", icon: "💡" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 flex-shrink-0 ${
                  activeTab === tab.id
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tools display */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {[...Array(8)].map((_, i) => <ToolCardSkeleton key={i} />)}
            </div>
          ) : tools.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-slate-700 text-lg font-bold">No tools registered in database.</p>
              <p className="text-slate-450 mt-2 text-sm">Be the first to list a tool in your community!</p>
            </div>
          ) : featuredTools.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center shadow-sm max-w-lg mx-auto">
              <p className="text-slate-700 text-lg font-semibold">No listings match your filter preferences.</p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategory("all");
                  setActiveTab("recent");
                }}
                className="mt-6 px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/10"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 animate-fade-in">
              {featuredTools.map((tool) => {
                const isNew = (new Date() - new Date(tool.createdAt)) < 1000 * 60 * 60 * 48; // added in last 48 hrs
                const isTopRated = (tool.owner?.rating || 0) >= 4.7;

                return (
                  <div
                    key={tool._id}
                    onClick={() => openModal(tool)}
                    className="group relative bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.015)] border border-slate-200/70 hover:border-indigo-200 hover:shadow-md transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col"
                  >
                    {/* Cover Image inside soft background */}
                    <div className="relative h-52 overflow-hidden bg-slate-100">
                      <img
                        src={tool.image}
                        alt={tool.title}
                        onError={(e) => {
                          e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
                          e.target.onerror = null;
                        }}
                        className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                      />
                      
                      {/* Left Badge: Trending / Top Rated / New */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-20">
                        {isNew && (
                          <span className="bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            🆕 New
                          </span>
                        )}
                        {isTopRated && (
                          <span className="bg-teal-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                            ⭐ Top Rated
                          </span>
                        )}
                      </div>

                      {/* Right Badge: Availability */}
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-md z-20 ${tool.available ? "bg-emerald-500" : "bg-slate-400"}`}>
                        {tool.available ? "Available" : "Borrowed"}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between bg-white border-t border-slate-100">
                      <div>
                        {/* Category Tag */}
                        <div className="mb-2">
                          <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            {tool.category}
                          </span>
                        </div>

                        <h3 className="text-base font-bold mb-1 text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                          {tool.title}
                        </h3>
                        <p className="text-slate-500 text-xs mb-4 line-clamp-2 h-8 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>

                      {/* Owner Section with rating, verification badge and avatar */}
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-750 border border-indigo-100 flex items-center justify-center font-bold text-xs shadow-sm">
                            {tool.owner?.name ? tool.owner.name[0].toUpperCase() : "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-700 text-xs">{tool.owner?.name || "Unknown"}</span>
                              {tool.owner?.isVerified && (
                                <span className="text-[9px] text-teal-600 font-bold bg-teal-50/80 px-1.5 py-0.2 rounded border border-teal-100">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <StarIcon className="h-3.5 w-3.5 text-amber-400" />
                              <span className="text-[10px] font-bold text-slate-500">
                                {tool.owner?.rating ? tool.owner.rating.toFixed(1) : "0"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          {getDistanceText(tool) && <span className="text-[10px] font-bold text-indigo-600 block">{getDistanceText(tool)}</span>}
                          <span className="text-[9px] text-slate-400 block mt-0.5">{getLocationText(tool.location, tool._id)}</span>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 7. Top Rated Owners Section */}
      <section className="py-20 bg-white border-t border-slate-200/50 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container mx-auto max-w-7xl px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex rounded-full bg-teal-50 border border-teal-100 text-teal-650 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase mb-2">
              🌟 Verified Lenders
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">Top Rated Lenders</h2>
            <p className="text-slate-500 mt-2 text-sm">Delhi's active neighborhood legends making tool-sharing a reality</p>
          </div>
          
          {lendersLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 animate-pulse text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-slate-200 mx-auto"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2 mx-auto"></div>
                </div>
              ))}
            </div>
          ) : topLenders.length === 0 ? (
            <p className="text-center text-slate-400 italic">No lenders active yet.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {topLenders.map((lender) => (
                <div key={lender._id} className="bg-white p-5 rounded-2xl border border-slate-200/70 text-center hover:shadow-md hover:-translate-y-1 transition-all duration-300 shadow-sm flex flex-col justify-between items-center relative">
                  {lender.isVerified && (
                    <span className="absolute top-3 right-3 text-teal-600" title="Verified Owner">
                      <CheckBadgeIcon className="h-5 w-5" />
                    </span>
                  )}
                  
                  <div className="w-16 h-16 rounded-full bg-indigo-50 border border-slate-100 flex items-center justify-center font-extrabold text-xl text-indigo-600 shadow-inner mb-3">
                    {lender.name[0].toUpperCase()}
                  </div>
                  
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm line-clamp-1">{lender.name}</h4>
                    <div className="flex items-center justify-center gap-1 mt-1.5">
                      <StarIcon className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-700">{lender.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <span className="mt-4 block bg-indigo-50 text-indigo-700 font-bold text-[9px] px-3 py-1 rounded-full uppercase tracking-wider">
                    {lender.lendsCount} lends
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 8. How ToolShare Works Section */}
      <section className="py-20 bg-slate-50/50 border-t border-slate-200/50 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(99,102,241,0.02),_transparent_60%)] pointer-events-none" />
        <div className="container mx-auto max-w-7xl px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase mb-2">
              📖 Easy Process
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">Simple. Sustainable. Smart.</h2>
            <p className="text-slate-500 mt-2 text-sm">Lend and borrow in three steps</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-xl hover:-translate-y-1.5">
              <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-800">1. Create Profile</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Join the neighborhood tool share, tell us your general location, and list any tools you want to share.
              </p>
            </div>
            
            <div className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-xl hover:-translate-y-1.5">
              <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white group-hover:border-transparent">
                <MagnifyingGlassIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-800">2. Select a Tool</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Browse localized listings and send borrow requests. Search with filters like distance and categories.
              </p>
            </div>

            <div className="group flex flex-col items-center text-center p-8 rounded-3xl transition-all duration-300 bg-white border border-slate-200/60 shadow-[0_2px_12px_rgba(0,0,0,0.015)] hover:shadow-xl hover:-translate-y-1.5">
              <div className="w-16 h-16 mb-6 flex items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white group-hover:border-transparent">
                <HandRaisedIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-800">3. Exchange & Rate</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Meet up to exchange the tool, get your work done, confirm the return, and leave mutual reviews to build community trust.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 9. Dynamic Community Reviews Section */}
      <section className="py-20 bg-white border-t border-slate-200/50">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase mb-2">
              💬 True Stories
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">Community Reviews</h2>
            <p className="text-slate-500 mt-2 text-sm">Hear directly from the ToolShare community</p>
          </div>
          
          {reviewsLoading ? (
            <div className="grid md:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 animate-pulse space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-1/3"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  <div className="flex gap-4 pt-4">
                    <div className="w-12 h-12 rounded-full bg-slate-200"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-slate-200 rounded w-2/3"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : latestReviews.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200/60 p-6 shadow-sm w-full max-w-md mx-auto">
              <p className="text-slate-500 italic">No community reviews yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              {latestReviews.map((rev) => (
                <div key={rev._id} className="bg-slate-50/50 p-8 rounded-3xl border border-slate-200/60 flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <div>
                    <div className="flex mb-4">{renderStars(rev.rating)}</div>
                    <p className="italic text-slate-600 text-sm leading-relaxed mb-6">“{rev.comment}”</p>
                  </div>
                  <div className="flex items-center gap-4 pt-4 border-t border-slate-200/60">
                    <div className="w-12 h-12 bg-indigo-50 border border-slate-100 text-indigo-600 flex items-center justify-center rounded-full font-extrabold text-lg">
                      {rev.borrowerInitial}
                    </div>
                    <div>
                      <p className="font-extrabold text-slate-800 text-sm">{rev.borrowerName}</p>
                      <p className="text-[10px] font-bold text-indigo-600 mt-0.5">Borrowed: {rev.toolTitle} (from {rev.ownerName})</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 10. Accordion FAQ Section */}
      <section className="py-20 bg-slate-50/45 border-t border-slate-200/50 relative">
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="container mx-auto max-w-3xl px-6 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-flex rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 font-bold px-3.5 py-1 text-[10px] tracking-wider uppercase mb-2">
              💡 Questions
            </span>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent">Frequently Asked Questions</h2>
            <p className="text-slate-500 mt-2 text-sm">Everything you need to know about sharing</p>
          </div>
          
          <div className="space-y-4">
            {faqData.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div key={index} className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)] transition-all duration-300">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-slate-800 hover:bg-slate-50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUpIcon className="h-5 w-5 text-indigo-600 transition-transform duration-300" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400 transition-transform duration-300" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs text-slate-500 leading-relaxed border-t border-slate-100 bg-slate-50/20 animate-slide-up-fade">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 11. Modal Listing Detail popup */}
      {showModal && selectedTool && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in" onClick={closeModal}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl relative p-8 transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto border border-slate-100 animate-slide-up-fade" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-5 right-5 rounded-full p-2 bg-slate-100 text-slate-500 hover:text-slate-850 transition-colors shadow-sm">&times;</button>
            <div className="h-64 overflow-hidden rounded-2xl mb-6 bg-slate-50 flex items-center justify-center p-4">
              <img 
                src={selectedTool.image} 
                alt={selectedTool.title} 
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
                  e.target.onerror = null;
                }}
                className="w-full h-full object-cover rounded-xl" 
              />
            </div>
            
            <div className="flex justify-between items-start mb-4 gap-4 flex-wrap">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedTool.title}</h2>
                <span className="inline-block mt-1 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {selectedTool.category || "Other"}
                </span>
              </div>
              <div className={`text-xs font-extrabold px-3 py-1 rounded-full text-white shadow-sm ${selectedTool.available ? "bg-emerald-500" : "bg-slate-400"}`}>
                {selectedTool.available ? "Available" : "On Loan"}
              </div>
            </div>

            <p className="text-slate-600 text-sm mb-6 leading-relaxed border-b border-slate-100 pb-4">{selectedTool.description}</p>

            <div className="grid gap-3 sm:grid-cols-2 mb-6 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="text-indigo-500">📍</span>
                <div>
                  <p className="font-bold text-slate-700">Location</p>
                  <p>{getLocationText(selectedTool.location, selectedTool._id)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-500">🕒</span>
                <div>
                  <p className="font-bold text-slate-700">Pickup time</p>
                  <p>{selectedTool.pickupTime || "Flexible"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-indigo-600">⏳</span>
                <div>
                  <p className="font-bold text-slate-700">Return deadline</p>
                  <p>{selectedTool.returnDeadline || "Flexible"}</p>
                </div>
              </div>
            </div>

            <div className="mb-6 rounded-2xl border border-slate-150 bg-slate-50 p-4 text-xs">
              <p className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-200/50 pb-2">Lender Details</p>
              <div className="grid gap-2 grid-cols-2">
                <p className="text-slate-600"><span className="font-semibold text-slate-700">Name:</span> {selectedTool.owner?.name || "Unknown"}</p>
                <p className="text-slate-600 flex items-center gap-1">
                  <span className="font-semibold text-slate-700">Rating:</span> 
                  {selectedTool.owner?.rating != null ? selectedTool.owner.rating.toFixed(1) : "0"}
                  {selectedTool.owner?.isVerified && <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-1 rounded">✓ Verified</span>}
                </p>
                <p className="text-slate-600"><span className="font-semibold text-slate-700">Email:</span> {selectedTool.owner?.email || "Not available"}</p>
                <p className="text-slate-600"><span className="font-semibold text-slate-700">Phone:</span> {selectedTool.owner?.phone || "Not available"}</p>
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2">{renderStars(selectedTool.owner?.rating || 0)} <span className="text-xs text-slate-400">({selectedTool.reviews?.length || 0} reviews)</span></div>

            <div className="mt-6">
              <button
                onClick={() => {
                  if (homeUser) {
                    navigate(`/${homeUser.name}`);
                  } else {
                    handleGet();
                  }
                }}
                className="w-full bg-indigo-600 text-white py-4 rounded-full font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-600/15 hover:scale-[1.01] transition-all duration-200"
              >
                Borrow Now
              </button>
            </div>
            
            {!selectedTool.isFlagged ? (
              <button
                onClick={() => setShowReportInput((prev) => !prev)}
                className="mt-4 w-full border border-rose-200 text-rose-600 py-3 rounded-full font-bold text-sm hover:bg-rose-50/50 hover:text-rose-700 transition-colors"
              >
                Report listing
              </button>
            ) : (
              <div className="mt-4 text-center text-xs text-rose-600 font-bold bg-rose-50 border border-rose-100 p-2.5 rounded-full">
                ⚠️ Listing Flagged for Review
              </div>
            )}

            {showReportInput && !selectedTool.isFlagged && (
              <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/45 p-4 animate-slide-up-fade">
                <p className="text-xs font-bold text-rose-700 mb-2">Why are you reporting this listing?</p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-rose-200 p-3 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                  placeholder="Describe your concern in detail..."
                />
                {reportStatus && (
                  <p className={`mt-3 text-xs ${reportStatus.type === "success" ? "text-green-700" : "text-rose-700"}`}>
                     {reportStatus.message}
                  </p>
                )}
                <div className="mt-4 flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => handleReportTool(selectedTool)}
                    disabled={reporting}
                    className="w-1/2 rounded-full bg-rose-600 px-4 py-3 text-white font-semibold hover:bg-rose-700 transition-colors"
                  >
                    {reporting ? "Reporting..." : "Submit Report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReportInput(false); setReportReason(""); setReportStatus(null); }}
                    className="w-1/2 rounded-full border border-rose-200 bg-white px-4 py-3 text-rose-600 font-semibold hover:bg-rose-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 12. Footer Section */}
      <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
        <div className="container mx-auto px-6 max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4 tracking-tight flex items-center gap-2">
              <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-500" />
              ToolShare
            </h3>
            <p className="leading-relaxed text-sm text-slate-400 max-w-sm">
              Empowering communities to share useful resources, reduce material waste, and build deep local neighborhood trust.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-4">Quick Links</h4>
            <ul className="space-y-3 text-xs">
              <li><a href="#" className="hover:text-indigo-405 transition-colors">Home</a></li>
              <li><a href="#featured" className="hover:text-indigo-405 transition-colors">Browse Tools</a></li>
              <li><a href="/login" className="hover:text-indigo-405 transition-colors">Login</a></li>
              <li><a href="/signup" className="hover:text-indigo-405 transition-colors">Sign Up</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white text-sm mb-4">Contact Support</h4>
            <p className="text-xs text-slate-400">Email: support@toolshare.com</p>
            <p className="text-xs text-slate-400 mt-2">Location: Bihar, India</p>
          </div>
        </div>
        <p className="text-center text-slate-650 mt-12 text-xs">
          &copy; {new Date().getFullYear()} ToolShare. All rights reserved.
        </p>
      </footer>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDangerous={confirmDialog.isDangerous}
        confirmText="Report"
        cancelText="Cancel"
        isLoading={reporting}
        onConfirm={() => {
          confirmDialog.onConfirm?.();
        }}
        onCancel={() => setConfirmDialog({ isOpen: false })}
      />
    </div>
  );
};

export default Home;
