import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { apiBaseUrl } from "../config";
import { 
  UserGroupIcon, 
  WrenchScrewdriverIcon, 
  ArrowPathIcon, 
  ShieldExclamationIcon, 
  CheckBadgeIcon, 
  NoSymbolIcon, 
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  DocumentDuplicateIcon,
  ShareIcon,
  InboxIcon,
  DocumentTextIcon,
  CheckIcon,
  StarIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  
  // Theme & Layout States
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("adminTheme") === "dark";
  });
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalTools: 0, activeLoans: 0, flaggedTools: 0 });
  const [flaggedTools, setFlaggedTools] = useState([]);
  const [flaggedBorrowers, setFlaggedBorrowers] = useState([]);
  const [locationLabels, setLocationLabels] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [adminName, setAdminName] = useState("Admin");

  // Filtering & Pagination States
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [activeTimeFilter, setActiveTimeFilter] = useState("week");
  const [userFilter, setUserFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("listings"); // listings, users, borrowers, health
  const [userPage, setUserPage] = useState(1);
  const [toolsPage, setToolsPage] = useState(1);
  const [borrowersPage, setBorrowersPage] = useState(1);
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  // Modals & Overlay States
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userDetailTab, setUserDetailTab] = useState("profile"); // profile, borrows, lends, tools
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "", target: "all" });
  const [adminNotes, setAdminNotes] = useState(() => {
    return localStorage.getItem("adminPrivateNotes") || "User warned twice\nKeep monitoring\nPossible scam\nOnly admin can see.";
  });

  const itemsPerPage = 4;

  const toggleTheme = () => {
    setDarkMode(prev => {
      const nextTheme = !prev;
      localStorage.setItem("adminTheme", nextTheme ? "dark" : "light");
      return nextTheme;
    });
  };

  const handleNotesChange = (e) => {
    setAdminNotes(e.target.value);
    localStorage.setItem("adminPrivateNotes", e.target.value);
  };

  const getLocationText = (location, toolId) => {
    if (typeof location === "string") return location;
    if (!location) return "Not provided";
    return location.address || location.placeName || locationLabels[toolId] || (location.lat != null && location.lng != null ? `${location.lat}, ${location.lng}` : "Not provided");
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      // Decode admin details
      const decoded = jwtDecode(token);
      if (!decoded.isAdmin) {
        toast.error("Access denied. Admin role required.");
        navigate("/");
        return;
      }
      setAdminId(decoded.id || decoded.userId);
      setAdminName(decoded.name || decoded.username || "Admin");

      const [statsRes, flaggedRes, flaggedBorrowersRes, usersRes, analyticsRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/user/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/tools/flagged`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/tools/flaggedBorrowers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/user/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/user/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setStats(statsRes.data);
      setFlaggedTools(flaggedRes.data);
      setFlaggedBorrowers(flaggedBorrowersRes.data);
      setUsers(usersRes.data);
      setAnalytics(analyticsRes.data);

      // Resolve locations
      const toolsToResolve = [...flaggedRes.data, ...flaggedBorrowersRes.data];
      const labels = {};
      await Promise.all(
        toolsToResolve.map(async (tool) => {
          if (tool.location && tool.location.lat != null && tool.location.lng != null) {
            try {
              const geoRes = await axios.get(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${tool.location.lat}&lon=${tool.location.lng}`
              );
              labels[tool._id] = geoRes.data.display_name || `${tool.location.lat}, ${tool.location.lng}`;
            } catch {
              labels[tool._id] = `${tool.location.lat}, ${tool.location.lng}`;
            }
          }
        })
      );
      setLocationLabels(labels);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load administration stats.");
    } finally {
      setSkeletonLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [navigate]);

  // Moderation Handlers
  const handleModerateTool = async (toolId, action) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${apiBaseUrl}/tools/moderate/${toolId}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === "approve" ? "Tool listing approved!" : "Tool listing removed.");
      setFlaggedTools((prev) => prev.filter((t) => t._id !== toolId));
      fetchStats();
    } catch {
      toast.error("Failed to moderate tool listing.");
    }
  };

  const handleModerateBorrowerReport = async (toolId, action) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${apiBaseUrl}/tools/borrower/moderate/${toolId}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(action === "warn" ? "Borrower warned successfully!" : "Report resolved.");
      setFlaggedBorrowers((prev) => prev.filter((t) => t._id !== toolId));
      fetchStats();
    } catch {
      toast.error("Failed to moderate borrower report.");
    }
  };

  const handleVerifyUser = async (userId, isVerified) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${apiBaseUrl}/user/admin/verify/${userId}`,
        { isVerified },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(isVerified ? "User verified! 🛡️" : "Verification removed.");
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, isVerified } : u)));
    } catch {
      toast.error("Failed to update verification status.");
    }
  };

  const handleUserStatus = async (userId, action) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(
        `${apiBaseUrl}/user/admin/user/${userId}`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`User successfully ${action}ed.`);
      setUsers((prev) =>
        prev.map((u) => {
          if (u._id === userId) {
            if (action === "ban") return { ...u, isBanned: true };
            if (action === "unban") return { ...u, isBanned: false };
            if (action === "suspend") return { ...u, isSuspended: true };
            if (action === "unsuspend") return { ...u, isSuspended: false };
          }
          return u;
        })
      );
    } catch {
      toast.error("Failed to update user status.");
    }
  };

  const handleSendAnnouncement = (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast.warn("Please write both a title and message.");
      return;
    }
    toast.success(`📢 Announcement broadcast to ${announcementForm.target} users successfully!`);
    setAnnouncementForm({ title: "", message: "", target: "all" });
    setShowAnnouncements(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Successfully logged out.");
    navigate("/");
  };

  // CSV Data Export
  const handleExportUsers = () => {
    const headers = ["Name", "Email", "Status", "Warnings", "Verified"];
    const rows = users.map(u => [
      u.name || "Anonymous",
      u.email,
      u.isBanned ? "Banned" : u.isSuspended ? "Suspended" : "Active",
      u.warnCount || 0,
      u.isVerified ? "Yes" : "No"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "toolswap_neighbors_directory.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Neighbors list exported as CSV 📄");
  };

  // Get Borrower Report Severity Color
  const getSeverityBadge = (reason) => {
    const lower = (reason || "").toLowerCase();
    if (lower.includes("never") || lower.includes("steal") || lower.includes("stolen") || lower.includes("lost")) {
      return { label: "Critical", style: "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400" };
    }
    if (lower.includes("damage") || lower.includes("broke") || lower.includes("broken") || lower.includes("destroy")) {
      return { label: "High", style: "bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950/20 dark:border-orange-900/50 dark:text-orange-400" };
    }
    return { label: "Medium", style: "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-900/50 dark:text-amber-400" };
  };

  // Dynamic Filtering logic
  const filteredUsersList = useMemo(() => {
    return users.filter((user) => {
      const matchSearch = 
        user.name?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        (user.phone && user.phone.includes(globalSearchQuery));
      
      const matchFilter = 
        userFilter === "all" ||
        (userFilter === "suspended" && user.isSuspended) ||
        (userFilter === "banned" && user.isBanned) ||
        (userFilter === "active" && !user.isSuspended && !user.isBanned);

      return matchSearch && matchFilter;
    });
  }, [users, globalSearchQuery, userFilter]);

  const filteredFlaggedTools = useMemo(() => {
    return flaggedTools.filter((t) => {
      return t.title?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
             t.category?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
             t.flagReason?.toLowerCase().includes(globalSearchQuery.toLowerCase());
    });
  }, [flaggedTools, globalSearchQuery]);

  const filteredFlaggedBorrowers = useMemo(() => {
    return flaggedBorrowers.filter((b) => {
      const severity = getSeverityBadge(b.borrowerFlagReason).label.toLowerCase();
      const matchesSeverity = selectedSeverity === "all" || severity === selectedSeverity.toLowerCase();
      const matchesSearch = 
        b.title?.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        b.borrowerFlagReason?.toLowerCase().includes(globalSearchQuery.toLowerCase());
      return matchesSearch && matchesSeverity;
    });
  }, [flaggedBorrowers, globalSearchQuery, selectedSeverity]);

  // Paginated Results
  const paginatedUsers = useMemo(() => {
    const offset = (userPage - 1) * itemsPerPage;
    return filteredUsersList.slice(offset, offset + itemsPerPage);
  }, [filteredUsersList, userPage]);

  const paginatedTools = useMemo(() => {
    const offset = (toolsPage - 1) * itemsPerPage;
    return filteredFlaggedTools.slice(offset, offset + itemsPerPage);
  }, [filteredFlaggedTools, toolsPage]);

  const paginatedBorrowers = useMemo(() => {
    const offset = (borrowersPage - 1) * itemsPerPage;
    return filteredFlaggedBorrowers.slice(offset, offset + itemsPerPage);
  }, [filteredFlaggedBorrowers, borrowersPage]);

  // Open User Info Modal
  const openUserDetail = (user, tab = "profile") => {
    setSelectedUserDetail(user);
    setUserDetailTab(tab);
  };

  // Compile Dynamic Notifications
  const pendingNotifications = useMemo(() => {
    const notifs = [];
    flaggedTools.forEach(t => {
      notifs.push({ id: `tool-${t._id}`, text: `Listing Flagged: "${t.title}" for "${t.flagReason}"`, type: "tool" });
    });
    flaggedBorrowers.forEach(b => {
      notifs.push({ id: `borrow-${b._id}`, text: `Borrower reported on "${b.title}" for "${b.borrowerFlagReason}"`, type: "borrower" });
    });
    users.filter(u => !u.isVerified).slice(0, 3).forEach(u => {
      notifs.push({ id: `verify-${u._id}`, text: `Pending Verification: Neighbor "${u.name || u.email}"`, type: "verify" });
    });
    return notifs;
  }, [flaggedTools, flaggedBorrowers, users]);

  // Render Skeleton Template
  if (skeletonLoading) {
    return (
      <div className={`min-h-screen ${darkMode ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-800"} p-8 flex flex-col items-center justify-center space-y-6 font-sans`}>
        <div className="w-full max-w-7xl space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2.5">
              <div className="h-6 w-48 bg-slate-300 dark:bg-slate-750 rounded-md"></div>
              <div className="h-4 w-72 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            </div>
            <div className="h-10 w-28 bg-slate-300 dark:bg-slate-750 rounded-xl"></div>
          </div>
          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl border border-transparent"></div>
            ))}
          </div>
          {/* Content Row Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans antialiased ${
      darkMode ? "bg-slate-950 text-slate-100" : "bg-slate-50/50 text-slate-800"
    }`}>
      <ToastContainer position="bottom-right" autoClose={3000} theme={darkMode ? "dark" : "light"} />

      {/* --- Header Navigation Bar --- */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        darkMode ? "bg-slate-950/80 border-slate-900" : "bg-white/80 border-slate-100"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white font-black text-sm">
              TS
            </div>
            <span className="font-black text-sm uppercase tracking-widest bg-gradient-to-r from-indigo-500 to-teal-500 bg-clip-text text-transparent">
              ToolSwap Console
            </span>
          </div>

          {/* Center search input */}
          <div className="hidden md:flex items-center flex-1 max-w-md relative">
            <MagnifyingGlassIcon className="absolute left-3.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search users, tool listings, reported events..." 
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              className={`w-full text-xs font-medium pl-10 pr-4 py-2 rounded-full border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${
                darkMode 
                  ? "bg-slate-900 border-slate-800 text-slate-100 focus:border-indigo-500" 
                  : "bg-slate-100/50 border-slate-200 text-slate-800 focus:border-indigo-500"
              }`}
            />
          </div>

          <div className="flex items-center gap-3.5">
            {/* Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2 rounded-full border relative transition-colors ${
                  darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-850" : "bg-slate-100/80 border-slate-200 hover:bg-slate-200/50"
                }`}
              >
                <BellIcon className="h-4.5 w-4.5" />
                {pendingNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white">
                    {pendingNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-3.5 w-80 rounded-2xl border p-4 shadow-xl z-50 animate-slide-up-fade text-left ${
                  darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
                }`}>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider mb-2">Pending Alerts</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {pendingNotifications.length === 0 ? (
                      <p className="text-[10px] text-slate-450 font-bold text-center py-4">All quiet! No pending reports. 🎉</p>
                    ) : pendingNotifications.map(n => (
                      <div key={n.id} className={`p-2 rounded-xl text-[10px] font-semibold border ${
                        darkMode ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"
                      }`}>
                        {n.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={`p-2 rounded-full border transition-colors ${
                darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-850" : "bg-slate-100/80 border-slate-200 hover:bg-slate-200/50"
              }`}
            >
              {darkMode ? <SunIcon className="h-4.5 w-4.5 text-amber-400" /> : <MoonIcon className="h-4.5 w-4.5 text-slate-650" />}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold hover:bg-red-500/25 transition-all"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Contents Container --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* --- Hero Banner Section --- */}
        <section className={`rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 relative overflow-hidden transition-all ${
          darkMode 
            ? "bg-slate-900/40 border-slate-900 bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.05),_transparent)]" 
            : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 mb-1.5">
              <BoltIcon className="h-4.5 w-4.5 animate-pulse" />
              <span>OVERVIEW CONTROL PANEL</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">Good Morning, {adminName} 👋</h2>
            <p className="text-xs text-slate-450 mt-1 font-semibold">
              Platform Health: <span className="text-emerald-500 font-extrabold">98% (Excellent)</span> 
              &nbsp;•&nbsp; Pending Reports: <span className="text-rose-500 font-extrabold">{flaggedTools.length + flaggedBorrowers.length}</span> 
              &nbsp;•&nbsp; Last updated 2 mins ago.
            </p>

            <div className="flex flex-wrap gap-2.5 mt-5">
              <button 
                onClick={() => { setActiveTab("users"); setUserFilter("all"); }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Manage Neighbors
              </button>
              <button 
                onClick={() => setShowAnnouncements(true)}
                className={`px-4 py-2 rounded-xl border font-extrabold text-xs transition-all cursor-pointer ${
                  darkMode ? "bg-slate-900 border-slate-800 hover:bg-slate-850" : "bg-slate-100 border-slate-200 hover:bg-slate-200"
                }`}
              >
                Send Broadcast Announcement
              </button>
              <button 
                onClick={handleExportUsers}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
              >
                Export Neighbors (CSV)
              </button>
            </div>
          </div>

          {/* Right side System Status checklist */}
          <div className={`p-4.5 rounded-2xl border text-xs font-semibold flex flex-col justify-center space-y-2 min-w-[200px] ${
            darkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/50 border-slate-100"
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">🟢 Platform Health Status</span>
            <div className="flex items-center justify-between gap-4">
              <span>Database</span> <span className="text-emerald-500 font-black">Healthy</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>API Gateway</span> <span className="text-emerald-500 font-black">Online</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>File Storage</span> <span className="text-emerald-500 font-black">Online</span>
            </div>
          </div>
        </section>

        {/* --- KPI Metric Cards Grid --- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* KPI 1 */}
          <div className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Neighbors</span>
              <UserGroupIcon className="h-5 w-5 text-indigo-500" />
            </div>
            <h3 className="text-2xl font-black">{stats.totalUsers || users.length}</h3>
            <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              ↑ 12% from last week
            </span>
          </div>

          {/* KPI 2 */}
          <div className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Listed Tools</span>
              <WrenchScrewdriverIcon className="h-5 w-5 text-teal-500" />
            </div>
            <h3 className="text-2xl font-black">{stats.totalTools}</h3>
            <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              ↑ +5 added this week
            </span>
          </div>

          {/* KPI 3 */}
          <div className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Active Loans</span>
              <ArrowPathIcon className="h-5 w-5 text-sky-500" />
            </div>
            <h3 className="text-2xl font-black">{stats.activeLoans}</h3>
            <span className="text-[9px] font-extrabold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              ↑ 8 active now
            </span>
          </div>

          {/* KPI 4 */}
          <div className={`rounded-3xl border p-5 transition-all hover:scale-[1.01] ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex justify-between items-center mb-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Unresolved Flags</span>
              <ShieldExclamationIcon className="h-5 w-5 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black">{flaggedTools.length + flaggedBorrowers.length}</h3>
            <span className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1.5 inline-block">
              ↓ 2 resolved today
            </span>
          </div>
        </section>

        {/* --- Two Column Layout (Analytics & Side Widgets) --- */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Block (8 columns): Multi-Chart Analytics */}
          <div className={`lg:col-span-8 rounded-3xl border p-6 md:p-8 space-y-8 ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-4 border-slate-100 dark:border-slate-850">
              <div>
                <h3 className="text-lg font-black">Interactive Performance Analytics</h3>
                <p className="text-xs text-slate-500 font-medium">Verify transaction trends, tool category share, and borrow heatmaps.</p>
              </div>
              <div className="flex items-center gap-2">
                {["today", "week", "month", "year"].map(time => (
                  <button 
                    key={time}
                    onClick={() => setActiveTimeFilter(time)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase transition-all ${
                      activeTimeFilter === time 
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                        : (darkMode ? "bg-slate-950 hover:bg-slate-850" : "bg-slate-100 hover:bg-slate-200")
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Chart & Categories Donut Chart Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Line Chart Component */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📈 Loans Over Last 30 Days</span>
                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-500/15 px-2 py-0.5 rounded-full">Average: 24/day</span>
                </div>
                <div className={`p-4 rounded-2xl border flex flex-col justify-between h-44 ${
                  darkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/50 border-slate-100"
                }`}>
                  {/* SVG line representation */}
                  <svg viewBox="0 0 500 150" className="w-full h-32 text-indigo-500">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path d="M 0 130 Q 100 70 200 110 T 350 40 T 500 20 L 500 150 L 0 150 Z" fill="url(#chartGradient)"/>
                    <path d="M 0 130 Q 100 70 200 110 T 350 40 T 500 20" fill="none" stroke="currentColor" strokeWidth="3" className="stroke-indigo-550"/>
                  </svg>
                  <div className="flex justify-between text-[8px] font-black text-slate-400 px-1">
                    <span>DAY 1</span>
                    <span>DAY 10</span>
                    <span>DAY 20</span>
                    <span>DAY 30</span>
                  </div>
                </div>
              </div>

              {/* Pie/Donut Chart Component */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">⚙️ Category Distribution</span>
                <div className={`p-4 rounded-2xl border flex items-center gap-6 h-44 ${
                  darkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50/50 border-slate-100"
                }`}>
                  {/* Circular Pie/Donut Representation */}
                  <div className="relative h-24 w-24 flex-shrink-0 flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <circle cx="18" cy="18" r="15.91" fill="none" stroke={darkMode ? "#1e293b" : "#f1f5f9"} strokeWidth="4" />
                      {/* Donut slices */}
                      <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgb(99, 102, 241)" strokeWidth="4.2" strokeDasharray="45 100" strokeDashoffset="0" />
                      <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgb(20, 184, 166)" strokeWidth="4.2" strokeDasharray="25 100" strokeDashoffset="-45" />
                      <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgb(14, 165, 233)" strokeWidth="4.2" strokeDasharray="15 100" strokeDashoffset="-70" />
                      <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgb(245, 158, 11)" strokeWidth="4.2" strokeDasharray="10 100" strokeDashoffset="-85" />
                      <circle cx="18" cy="18" r="15.91" fill="none" stroke="rgb(100, 116, 139)" strokeWidth="4.2" strokeDasharray="5 100" strokeDashoffset="-95" />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black leading-none">100%</span>
                      <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5">Share</span>
                    </div>
                  </div>
                  <div className="text-[9px] font-bold text-slate-550 space-y-1 w-full">
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500"></span>Power Tools</div> <span className="font-extrabold">45%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500"></span>Garden</div> <span className="font-extrabold">25%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500"></span>Electronics</div> <span className="font-extrabold">15%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span>Sports</div> <span className="font-extrabold">10%</span></div>
                    <div className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500"></span>Others</div> <span className="font-extrabold">5%</span></div>
                  </div>
                </div>
              </div>

            </div>

            {/* Heatmap Grid Row */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">🔥 Active Borrowing Days Heatmap</span>
              <div className="grid grid-cols-5 gap-3.5 text-center">
                {[
                  { day: "Monday", count: "12 loans", opacity: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400" },
                  { day: "Tuesday", count: "18 loans", opacity: "bg-indigo-500/40 text-indigo-800 dark:text-indigo-300" },
                  { day: "Wednesday", count: "34 loans", opacity: "bg-indigo-500/80 text-white font-extrabold" },
                  { day: "Thursday", count: "21 loans", opacity: "bg-indigo-500/50 text-indigo-900 dark:text-indigo-200" },
                  { day: "Friday", count: "28 loans", opacity: "bg-indigo-500/60 text-indigo-950 dark:text-indigo-100" }
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-2xl border flex flex-col justify-between h-20 transition-all ${item.opacity} border-indigo-500/10`}>
                    <span className="text-[9px] font-black uppercase tracking-wider">{item.day}</span>
                    <span className="text-xs font-black">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Block (4 columns): Health Check, Sticky Note, Activities */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Stats Summary Sticky Card */}
            <div className={`rounded-3xl border p-5 shadow-sm space-y-3.5 ${
              darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100"
            }`}>
              <div className="flex justify-between items-center border-b pb-2 border-slate-100 dark:border-slate-850">
                <span className="text-xs font-black">Today's Activity Summary</span>
                <span className="text-[8px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase">LIVE</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center text-xs font-bold">
                <div className={`p-2.5 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
                  <p className="text-[9px] text-slate-400 mb-0.5">New Users</p>
                  <p className="text-lg font-black text-indigo-500">+12</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
                  <p className="text-[9px] text-slate-400 mb-0.5">Lend Loans</p>
                  <p className="text-lg font-black text-teal-500">+34</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
                  <p className="text-[9px] text-slate-400 mb-0.5">Flags Logged</p>
                  <p className="text-lg font-black text-rose-500">+2</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${darkMode ? "bg-slate-950 border-slate-850" : "bg-slate-50 border-slate-100"}`}>
                  <p className="text-[9px] text-slate-400 mb-0.5">Earned Points</p>
                  <p className="text-lg font-black text-sky-500">1.2K XP</p>
                </div>
              </div>
            </div>

            {/* Platform Services Status List */}
            <div className={`rounded-3xl border p-5 shadow-sm space-y-3.5 ${
              darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100"
            }`}>
              <span className="text-xs font-black block border-b pb-2 border-slate-100 dark:border-slate-850">Platform Services Monitor</span>
              <div className="space-y-2.5 text-xs font-semibold text-slate-550 dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">🟢 API Gateway</span>
                  <span className="text-[10px] text-emerald-500 font-extrabold uppercase">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">🟢 Database Cluster</span>
                  <span className="text-[10px] text-emerald-500 font-extrabold uppercase">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">🟢 Media CDN</span>
                  <span className="text-[10px] text-emerald-500 font-extrabold uppercase">Healthy</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">🟡 Email Dispatcher</span>
                  <span className="text-[10px] text-amber-500 font-extrabold uppercase">Lagging (50ms)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">🟢 Geo Maps Resolver</span>
                  <span className="text-[10px] text-emerald-500 font-extrabold uppercase">Healthy</span>
                </div>
              </div>
            </div>

            {/* Interactive Admin Sticky Notes Pad */}
            <div className={`rounded-3xl border p-5 shadow-sm space-y-3 ${
              darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100"
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-xs font-black">Private Admin Scratchpad</span>
                <span className="text-[9px] text-indigo-500 font-black">AUTO-SAVE</span>
              </div>
              <textarea 
                rows="4"
                value={adminNotes}
                onChange={handleNotesChange}
                placeholder="Write private warnings details, review notes..."
                className={`w-full rounded-2xl p-3 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-semibold leading-relaxed transition-all resize-none ${
                  darkMode ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-700"
                }`}
              />
            </div>

          </div>

        </section>

        {/* --- Navigation Controls & Dynamic Tabs --- */}
        <section className="flex flex-wrap gap-2.5 border-b pb-1.5 border-slate-100 dark:border-slate-900 justify-between items-center">
          <div className="flex gap-2">
            {[
              { id: "listings", label: "Flagged Listings", count: flaggedTools.length },
              { id: "borrowers", label: "Flagged Borrowers", count: flaggedBorrowers.length },
              { id: "users", label: "Neighbors Directory", count: users.length }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === t.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-650/15" 
                    : (darkMode ? "bg-slate-900 text-slate-400 hover:bg-slate-850" : "bg-white text-slate-500 border border-slate-200/50 hover:bg-slate-50")
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          
          {/* Quick Info status chip */}
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            System Operational 🛡️
          </span>
        </section>

        {/* --- Tab Panel 1: Flagged Tools listings --- */}
        {activeTab === "listings" && (
          <section className={`rounded-3xl border p-6 md:p-8 space-y-6 ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100 dark:border-slate-850">
              <div>
                <h3 className="text-lg font-black">Flagged Listings Directory</h3>
                <p className="text-xs text-slate-500 font-medium">Flagged by community members for policy violations. Review and moderate.</p>
              </div>
              <span className="text-xs font-black text-slate-450 uppercase tracking-widest">
                Showing {filteredFlaggedTools.length} Flagged Tools
              </span>
            </div>

            <div className="space-y-4">
              {filteredFlaggedTools.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl">
                  <span className="text-2xl block mb-2">🎉</span>
                  <p className="text-slate-400 font-black text-xs uppercase tracking-wider">No pending listing reports! Keep it up.</p>
                </div>
              ) : paginatedTools.map((tool) => (
                <div key={tool._id} className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50/20 dark:hover:bg-slate-900/25 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm">Tool: "{tool.title}"</h4>
                        <span className="rounded-full bg-rose-50 border border-rose-150 text-rose-600 text-[9px] font-black uppercase px-2 py-0.5">LISTING FLAGGED</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-1 gap-x-6 mt-2.5 text-xs text-slate-500 font-medium">
                        <p><span className="font-bold text-slate-600">Owner:</span> {tool.owner?.name || "Unknown"}</p>
                        <p><span className="font-bold text-slate-600">Reported by:</span> {tool.flaggedBy?.name || "Neighbor"}</p>
                        <p><span className="font-bold text-slate-600">Reason:</span> <span className="italic text-rose-600 font-semibold">"{tool.flagReason || "Reported"}"</span></p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5 self-end sm:self-center">
                      <button onClick={() => setSelectedTool(tool)} className="rounded-xl bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer border border-transparent dark:border-slate-800">
                        View Details
                      </button>
                      <button onClick={() => handleModerateTool(tool._id, "approve")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/10">
                        Approve
                      </button>
                      <button onClick={() => handleModerateTool(tool._id, "reject")} className="rounded-xl bg-red-655 hover:bg-red-700 text-white font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-red-600/10">
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {filteredFlaggedTools.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-1.5 mt-6 text-xs font-bold">
                <button 
                  onClick={() => setToolsPage(prev => Math.max(prev - 1, 1))} 
                  disabled={toolsPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  &lt;
                </button>
                {Array.from({ length: Math.ceil(filteredFlaggedTools.length / itemsPerPage) }, (_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setToolsPage(idx + 1)}
                    className={`px-3.5 py-1.5 rounded-xl transition-all ${
                      toolsPage === idx + 1 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setToolsPage(prev => Math.min(prev + 1, Math.ceil(filteredFlaggedTools.length / itemsPerPage)))} 
                  disabled={toolsPage === Math.ceil(filteredFlaggedTools.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>
        )}

        {/* --- Tab Panel 2: Flagged Borrowers --- */}
        {activeTab === "borrowers" && (
          <section className={`rounded-3xl border p-6 md:p-8 space-y-6 ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100 dark:border-slate-850">
              <div>
                <h3 className="text-lg font-black">Flagged Borrowers Log</h3>
                <p className="text-xs text-slate-500 font-medium">Review and resolve claims of delayed returns, missing accessories, or damaged tools.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-400 uppercase">Severity Filter</span>
                <select 
                  value={selectedSeverity} 
                  onChange={(e) => { setSelectedSeverity(e.target.value); setBorrowersPage(1); }}
                  className={`rounded-xl text-xs font-bold p-2 border focus:outline-none ${
                    darkMode ? "bg-slate-950 border-slate-850 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="all">All Severities</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredFlaggedBorrowers.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl">
                  <span className="text-2xl block mb-2">🎉</span>
                  <p className="text-slate-400 font-black text-xs uppercase tracking-wider">No borrower complaints active! Community is healthy.</p>
                </div>
              ) : paginatedBorrowers.map((tool) => {
                const borrower = tool.reportedBorrower || tool.borrowedBy;
                const severity = getSeverityBadge(tool.borrowerFlagReason);
                return (
                  <div key={tool._id} className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50/20 dark:hover:bg-slate-900/25 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">Tool: "{tool.title}"</h4>
                          <span className={`rounded-full border text-[9px] font-black uppercase px-2.5 py-0.5 ${severity.style}`}>
                            {severity.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-6 mt-3 text-xs text-slate-500 font-medium">
                          <p><span className="font-bold text-slate-600">Borrower:</span> {borrower?.name || "Unknown"} ({borrower?.email || ""})</p>
                          <p><span className="font-bold text-slate-600">Lender:</span> {tool.borrowerFlaggedBy?.name || "Owner"}</p>
                          <p><span className="font-bold text-slate-600">Borrower Status:</span> {borrower?.isBanned ? "Banned" : (borrower?.isSuspended ? "Suspended" : "Active")} (Warnings: {borrower?.warnCount || 0})</p>
                          <p><span className="font-bold text-slate-600">Reason:</span> <span className="italic text-amber-600 font-semibold">"{tool.borrowerFlagReason || "No details"}"</span></p>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-start md:justify-end gap-2.5">
                        <button
                          onClick={() => handleModerateBorrowerReport(tool._id, "approve")}
                          className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/10"
                        >
                          Resolve report
                        </button>
                        <button
                          onClick={() => handleModerateBorrowerReport(tool._id, "warn")}
                          className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-amber-600/10"
                        >
                          Warn Borrower
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredFlaggedBorrowers.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-1.5 mt-6 text-xs font-bold">
                <button 
                  onClick={() => setBorrowersPage(prev => Math.max(prev - 1, 1))} 
                  disabled={borrowersPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  &lt;
                </button>
                {Array.from({ length: Math.ceil(filteredFlaggedBorrowers.length / itemsPerPage) }, (_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBorrowersPage(idx + 1)}
                    className={`px-3.5 py-1.5 rounded-xl transition-all ${
                      borrowersPage === idx + 1 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setBorrowersPage(prev => Math.min(prev + 1, Math.ceil(filteredFlaggedBorrowers.length / itemsPerPage)))} 
                  disabled={borrowersPage === Math.ceil(filteredFlaggedBorrowers.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>
        )}

        {/* --- Tab Panel 3: Neighbors Directory --- */}
        {activeTab === "users" && (
          <section className={`rounded-3xl border p-6 md:p-8 space-y-6 ${
            darkMode ? "bg-slate-900/40 border-slate-900" : "bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.01)]"
          }`}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between border-b pb-4 border-slate-100 dark:border-slate-850">
              <div>
                <h3 className="text-lg font-black">Neighbors Controls Directory</h3>
                <p className="text-xs text-slate-500 font-medium">Verify profiles, toggle active sharing, suspend, or ban user accounts.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <span className="text-xs font-black text-slate-400 uppercase">Directory Filter</span>
                <select 
                  value={userFilter} 
                  onChange={(e) => { setUserFilter(e.target.value); setUserPage(1); }}
                  className={`rounded-xl text-xs font-bold p-2 border focus:outline-none ${
                    darkMode ? "bg-slate-950 border-slate-850 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="all">All Neighbors</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                  <option value="banned">Banned Accounts</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredUsersList.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-400 font-black text-xs uppercase">No matching neighbors found.</p>
                </div>
              ) : paginatedUsers.map((user) => {
                const initial = user.name ? user.name[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : "?");
                return (
                  <div key={user._id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:p-5 md:grid-cols-[1.5fr_1fr] md:items-center hover:bg-slate-50/20 dark:hover:bg-slate-900/25 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white flex items-center justify-center text-lg font-black shadow-sm flex-shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-850 dark:text-slate-100 text-sm truncate">{user.name || "Anonymous User"}</p>
                          {user.isVerified && (
                            <CheckBadgeIcon className="h-5 w-5 text-sky-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-550 font-medium truncate mt-0.5">{user.email}</p>
                        <div className="flex gap-2.5 mt-2.5 flex-wrap text-[9px] font-black uppercase tracking-wider">
                          <span className={`px-2.5 py-0.5 rounded-full border ${user.isBanned ? "bg-red-50 border-red-150 text-red-600" : user.isSuspended ? "bg-amber-50 border-amber-150 text-amber-600" : "bg-emerald-50 border-emerald-150 text-emerald-600"}`}>
                            {user.isBanned ? "Banned" : user.isSuspended ? "Suspended" : "Active"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                            Warnings: {user.warnCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                      <button
                        onClick={() => openUserDetail(user, "profile")}
                        className="rounded-xl px-3.5 py-2.5 text-xs font-bold bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-800 cursor-pointer"
                      >
                        Inspect Profile
                      </button>
                      <button 
                        onClick={() => handleVerifyUser(user._id, !user.isVerified)} 
                        className={`rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${user.isVerified ? "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800" : "bg-sky-600 hover:bg-sky-750 text-white"}`}
                      >
                        {user.isVerified ? "Unverify" : "Verify"}
                      </button>
                      <button 
                        onClick={() => handleUserStatus(user._id, user.isSuspended ? "unsuspend" : "suspend")} 
                        className={`rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${user.isSuspended ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10" : "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-600/10"}`}
                      >
                        {user.isSuspended ? "Unsuspend" : "Suspend"}
                      </button>
                      <button 
                        onClick={() => handleUserStatus(user._id, user.isBanned ? "unban" : "ban")} 
                        className={`rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${user.isBanned ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10" : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-650/10"}`}
                      >
                        {user.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredUsersList.length > itemsPerPage && (
              <div className="flex items-center justify-center gap-1.5 mt-6 text-xs font-bold">
                <button 
                  onClick={() => setUserPage(prev => Math.max(prev - 1, 1))} 
                  disabled={userPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  &lt;
                </button>
                {Array.from({ length: Math.ceil(filteredUsersList.length / itemsPerPage) }, (_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setUserPage(idx + 1)}
                    className={`px-3.5 py-1.5 rounded-xl transition-all ${
                      userPage === idx + 1 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setUserPage(prev => Math.min(prev + 1, Math.ceil(filteredUsersList.length / itemsPerPage)))} 
                  disabled={userPage === Math.ceil(filteredUsersList.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>
        )}

      </main>

      {/* --- Overlay Modal: Flagged Tool Details --- */}
      {selectedTool && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`p-6 rounded-3xl shadow-2xl w-full max-w-lg relative border transition-colors animate-slide-up-fade ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h3 className="text-lg font-black tracking-tight mb-4">Moderation Details: "{selectedTool.title}"</h3>
            
            {/* Mock Image Gallery */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <img 
                src={selectedTool.image} 
                alt={selectedTool.title} 
                className="h-24 w-full object-cover rounded-2xl bg-slate-100 border border-slate-200/50" 
              />
              <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">
                GALLERY SLOT 2
              </div>
              <div className="h-24 w-full bg-slate-100 dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-[10px] font-black text-slate-400">
                GALLERY SLOT 3
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-semibold text-slate-550 dark:text-slate-300 mb-6">
              <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Category:</span> {selectedTool.category || "General"}</p>
              <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Uploaded:</span> 2 June (3 weeks ago)</p>
              <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Total Borrows:</span> 17 times</p>
              <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Running Rating:</span> ⭐ 4.8 / 5.0</p>
              <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Description:</span> {selectedTool.description || "No description provided."}</p>
              <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Location:</span> {getLocationText(selectedTool.location, selectedTool._id)}</p>
              <p className="bg-rose-50 border border-rose-100 text-rose-650 rounded-xl p-3.5 font-bold mt-4 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400">
                <span className="uppercase text-[10px] block text-rose-500 mb-1">Reason for Flagging:</span>
                "{selectedTool.flagReason || "No details provided"}"
              </p>
            </div>

            <div className="flex gap-3 text-xs font-bold">
              <button 
                onClick={() => setSelectedTool(null)} 
                className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-800 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => { handleModerateTool(selectedTool._id, "approve"); setSelectedTool(null); }} 
                className="flex-1 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-650/10 transition-colors"
              >
                Approve (Clear Flag)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: User Inspect Profile details --- */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className={`p-6 rounded-3xl shadow-2xl w-full max-w-xl relative border transition-colors animate-slide-up-fade ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h3 className="text-lg font-black tracking-tight mb-3">Neighbor Profile Audit</h3>

            {/* Nav tabs inside user audit modal */}
            <div className="flex gap-2 border-b pb-2 mb-4 border-slate-200 dark:border-slate-800 text-xs font-bold">
              {[
                { id: "profile", label: "Overview" },
                { id: "borrows", label: "Borrow History" },
                { id: "lends", label: "Lending Logs" }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setUserDetailTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all ${
                    userDetailTab === tab.id 
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400" 
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Audit Modal Content tabs */}
            {userDetailTab === "profile" && (
              <div className="space-y-2.5 text-xs font-semibold text-slate-550 dark:text-slate-350 mb-6">
                <div className="flex items-center gap-4.5 bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white flex items-center justify-center text-xl font-black">
                    {(selectedUserDetail.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 leading-tight">{selectedUserDetail.name}</h4>
                    <p className="mt-0.5 text-slate-500">{selectedUserDetail.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Phone:</span> {selectedUserDetail.phone || "Not provided"}</p>
                  <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Verification Status:</span> {selectedUserDetail.isVerified ? "Verified 🛡️" : "Unverified"}</p>
                  <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Warn Count:</span> {selectedUserDetail.warnCount || 0} Warnings</p>
                  <p><span className="font-extrabold text-slate-700 dark:text-slate-200">Reputation rating:</span> ⭐ {selectedUserDetail.rating ? selectedUserDetail.rating.toFixed(1) : "0.0"} ({selectedUserDetail.numReviews || 0} reviews)</p>
                </div>
              </div>
            )}

            {userDetailTab === "borrows" && (
              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {(!selectedUserDetail.toolsRequested || selectedUserDetail.toolsRequested.length === 0) ? (
                  <p className="text-xs text-slate-400 font-bold py-4 text-center">No borrowing history recorded.</p>
                ) : selectedUserDetail.toolsRequested.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                    <span>Requested: "{t.tool?.title || "Tool"}"</span>
                    <span className="capitalize font-extrabold text-indigo-500">{t.status}</span>
                  </div>
                ))}
              </div>
            )}

            {userDetailTab === "lends" && (
              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {(!selectedUserDetail.toolsLentOut || selectedUserDetail.toolsLentOut.length === 0) ? (
                  <p className="text-xs text-slate-400 font-bold py-4 text-center">No lending logs recorded.</p>
                ) : selectedUserDetail.toolsLentOut.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold p-2.5 rounded-xl border border-slate-100 dark:border-slate-850">
                    <span>Lent: "{t.tool?.title || "Tool"}"</span>
                    <span className="capitalize font-extrabold text-emerald-500">{t.status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 text-xs font-bold">
              <button 
                onClick={() => setSelectedUserDetail(null)} 
                className="w-full py-2.5 rounded-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-800 transition-colors"
              >
                Close Audit Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: Send Announcement Form --- */}
      {showAnnouncements && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleSendAnnouncement} className={`p-6 rounded-3xl shadow-2xl w-full max-w-md relative border transition-colors animate-slide-up-fade ${
            darkMode ? "bg-slate-900 border-slate-800" : "bg-white border-slate-100"
          }`}>
            <h3 className="text-lg font-black tracking-tight mb-4">Send Broadcast Announcement</h3>
            
            <div className="space-y-4 text-xs font-bold text-slate-600 dark:text-slate-400">
              <div>
                <label className="block mb-1.5">Announcement Title</label>
                <input 
                  type="text" 
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g. Server Maintenance or Policy Updates"
                  className={`w-full rounded-xl p-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold ${
                    darkMode ? "bg-slate-950 border-slate-850 text-slate-100 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5">Target Audience</label>
                <select
                  value={announcementForm.target}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, target: e.target.value })}
                  className={`w-full rounded-xl p-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold ${
                    darkMode ? "bg-slate-950 border-slate-850 text-slate-100" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="all">All Registered Users</option>
                  <option value="verified">Verified Neighbors Only</option>
                  <option value="suspended">Suspended Accounts Only</option>
                </select>
              </div>

              <div>
                <label className="block mb-1.5">Broadcast Message</label>
                <textarea 
                  rows="4"
                  value={announcementForm.message}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, message: e.target.value })}
                  placeholder="Write details of the broadcast message..."
                  className={`w-full rounded-xl p-3 border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold leading-relaxed ${
                    darkMode ? "bg-slate-950 border-slate-850 text-slate-100 focus:border-indigo-500" : "bg-white border-slate-200 text-slate-800 focus:border-indigo-500"
                  }`}
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 text-xs font-bold mt-6">
              <button 
                type="button"
                onClick={() => setShowAnnouncements(false)} 
                className="flex-1 py-2.5 rounded-full bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-transparent dark:border-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-750 text-white shadow-md shadow-indigo-650/10 transition-colors"
              >
                Send Broadcast
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
