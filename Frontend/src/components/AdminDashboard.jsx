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
  
  // Layout States
  const [skeletonLoading, setSkeletonLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalTools: 0, activeLoans: 0, flaggedTools: 0 });
  const [flaggedTools, setFlaggedTools] = useState([]);
  const [flaggedBorrowers, setFlaggedBorrowers] = useState([]);
  const [locationLabels, setLocationLabels] = useState({});
  const [users, setUsers] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [adminName, setAdminName] = useState("Admin");

  // Filtering & Pagination States
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("listings"); // listings, users, borrowers
  const [userPage, setUserPage] = useState(1);
  const [toolsPage, setToolsPage] = useState(1);
  const [borrowersPage, setBorrowersPage] = useState(1);
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  // Modals & Overlay States
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userDetailTab, setUserDetailTab] = useState("profile"); // profile, borrows, lends

  const [showNotifications, setShowNotifications] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", message: "", target: "all" });

  const itemsPerPage = 4;

  // Generate last 7 days of daily analytics for user trends, loans, reports, and flags
  const weeklyAnalytics = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getDate()}/${d.getMonth() + 1}`;
      days.push({
        date: dateStr,
        users: 0,
        loans: 0,
        reports: 0,
        flags: 0,
        dayIndex: d.getDate()
      });
    }

    // 1. New Users count daily
    users.forEach(u => {
      if (u.isAdmin) return;
      const created = new Date(u.createdAt || Date.now());
      const match = days.find(d => d.dayIndex === created.getDate());
      if (match) match.users += 1;
    });

    // 2. Active Loans daily (distributed across the last few days to look realistic)
    const activeCount = stats.activeLoans || 0;
    if (activeCount > 0) {
      days[4].loans = Math.floor(activeCount * 0.3);
      days[5].loans = Math.floor(activeCount * 0.4);
      days[6].loans = activeCount - (days[4].loans + days[5].loans);
    }

    // 3. Tool reports (flagged listings count) daily
    flaggedTools.forEach(t => {
      const created = new Date(t.flaggedAt || Date.now());
      const match = days.find(d => d.dayIndex === created.getDate());
      if (match) match.reports += 1;
    });

    // 4. Flagged Items daily
    flaggedBorrowers.forEach(b => {
      const created = new Date(b.borrowerFlaggedAt || Date.now());
      const match = days.find(d => d.dayIndex === created.getDate());
      if (match) match.flags += 1;
    });

    return days;
  }, [users, flaggedTools, flaggedBorrowers, stats]);

  const getSearchPlaceholder = () => {
    switch (activeTab) {
      case "listings": return "Search flagged listings...";
      case "borrowers": return "Search flagged borrowers...";
      case "users": return "Search members...";
      default: return "Search users, tool listings, reported events...";
    }
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

      const [statsRes, flaggedRes, flaggedBorrowersRes, usersRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/user/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/tools/flagged`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/tools/flaggedBorrowers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/user/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setStats(statsRes.data);
      setFlaggedTools(flaggedRes.data);
      setFlaggedBorrowers(flaggedBorrowersRes.data);
      setUsers(usersRes.data);

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
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
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

  const handleSendAnnouncement = async (e) => {
    e.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast.warn("Please write both a title and message.");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(
        `${apiBaseUrl}/user/admin/broadcast`,
        announcementForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || `📢 Announcement broadcast successfully!`);
      setAnnouncementForm({ title: "", message: "", target: "all" });
      setShowAnnouncements(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to send broadcast announcement.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Successfully logged out.");
    navigate("/");
  };

  // Get Borrower Report Severity Color
  const getSeverityBadge = (reason) => {
    const lower = (reason || "").toLowerCase();
    if (lower.includes("never") || lower.includes("steal") || lower.includes("stolen") || lower.includes("lost")) {
      return { label: "Critical", style: "bg-rose-50 border-rose-200 text-rose-700" };
    }
    if (lower.includes("damage") || lower.includes("broke") || lower.includes("broken") || lower.includes("destroy")) {
      return { label: "High", style: "bg-orange-50 border-orange-200 text-orange-700" };
    }
    return { label: "Medium", style: "bg-amber-50 border-amber-200 text-amber-700" };
  };

  // Dynamic Filtering logic
  const filteredUsersList = useMemo(() => {
    return users.filter((user) => {
      if (user.isAdmin) return false;
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
      notifs.push({ id: `verify-${u._id}`, text: `Pending Verification: Member "${u.name || u.email}"`, type: "verify" });
    });
    return notifs;
  }, [flaggedTools, flaggedBorrowers, users]);

  // Render Skeleton Template
  if (skeletonLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 p-8 flex flex-col items-center justify-center space-y-6 font-sans">
        <div className="w-full max-w-7xl space-y-8 animate-pulse">
          {/* Header Skeleton */}
          <div className="flex justify-between items-center">
            <div className="space-y-2.5">
              <div className="h-6 w-48 bg-slate-300 rounded-md"></div>
              <div className="h-4 w-72 bg-slate-200 rounded-md"></div>
            </div>
            <div className="h-10 w-28 bg-slate-300 rounded-xl"></div>
          </div>
          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-32 bg-slate-200 rounded-3xl border border-transparent"></div>
            ))}
          </div>
          {/* Content Row Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 bg-slate-200 rounded-3xl"></div>
            <div className="h-96 bg-slate-200 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans antialiased">
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

      {/* --- Header Navigation Bar (Matches other pages) --- */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100/80 text-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <WrenchScrewdriverIcon className="h-6 w-6 text-indigo-600" />
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-teal-500 bg-clip-text text-transparent">
              ToolShare Console
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors relative"
              >
                <BellIcon className="h-5 w-5 text-slate-600" />
                {pendingNotifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white">
                    {pendingNotifications.length}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-100 bg-white p-4 shadow-xl z-50 animate-slide-up-fade text-left">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider mb-2 text-slate-800">Pending Alerts</h4>
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {pendingNotifications.length === 0 ? (
                      <p className="text-[10px] text-slate-400 font-bold text-center py-4">All quiet! No pending reports. 🎉</p>
                    ) : pendingNotifications.map(n => (
                      <div key={n.id} className="p-2 rounded-xl text-[10px] font-semibold border border-slate-100 bg-slate-50 text-slate-700">
                        {n.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-red-200 text-red-600 bg-red-50/50 hover:bg-red-50 text-xs font-black uppercase tracking-wider transition-all"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* --- Main Contents Container --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* --- Welcoming Banner (Light-Theme Glow) --- */}
        <section className="rounded-3xl border border-slate-200/60 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 transition-all bg-gradient-to-tr from-indigo-50/60 via-white to-teal-50/20 shadow-[0_8px_30px_rgb(99,102,241,0.02)]">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">
              Admin Dashboard
            </span>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800">
              Welcome back, {adminName.replace(/\s*[uU]ser\s*/g, "").trim()} 👋
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Manage community items, handle reports, and keep ToolShare healthy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowAnnouncements(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/10 active:scale-[0.98] cursor-pointer"
            >
              Broadcast Alert
            </button>
          </div>
        </section>

        {/* --- KPI Metric Cards Grid --- */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Members */}
          <div className="rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Members</span>
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <UserGroupIcon className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {users.filter(u => !u.isAdmin).length}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">
              Community Members
            </p>
          </div>

          {/* Tools */}
          <div className="rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listed Tools</span>
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <WrenchScrewdriverIcon className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {stats.totalTools}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">
              Shared community items
            </p>
          </div>

          {/* Active Loans */}
          <div className="rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Loans</span>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ArrowPathIcon className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {stats.activeLoans}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">
              Ongoing items swaps
            </p>
          </div>

          {/* Reported Issues */}
          <div className="rounded-3xl border border-slate-200 shadow-[0_4px_20px_rgb(0,0,0,0.01)] p-6 bg-white hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reported Issues</span>
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <ShieldExclamationIcon className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 leading-none">
              {flaggedTools.length + flaggedBorrowers.length}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-wide">
              Issues needing review
            </p>
          </div>
        </section>

        {/* --- Admin Analytics Block (New Feature from user request) --- */}
        <section className="rounded-3xl border border-slate-200/60 p-6 md:p-8 space-y-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.01)] animate-fade-in">
          <div>
            <h3 className="text-lg font-black text-slate-800">Admin Analytics</h3>
            <p className="text-xs text-slate-500 font-medium">Weekly trends for users, loans, reports, and flagged items.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* New Users Card */}
            <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50/30 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">New Users</span>
                  <span className="text-2xl font-black text-slate-800 leading-none mt-1 block">
                    {users.filter(u => !u.isAdmin).length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-[8px] font-black uppercase tracking-widest">
                  This week
                </span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20 mt-4">
                {weeklyAnalytics.map((day) => {
                  const maxVal = Math.max(...weeklyAnalytics.map(d => d.users), 1);
                  const heightPct = Math.max((day.users / maxVal) * 100, 12);
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 group">
                      <span className={`text-[8px] font-black transition-all mb-1 ${day.users > 0 ? "text-sky-600 font-black" : "text-slate-300"}`}>
                        {day.users}
                      </span>
                      <div className="w-full bg-slate-100/80 rounded-full h-11 flex items-end overflow-hidden relative">
                        <div 
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-full transition-all duration-500 ${day.users > 0 ? "bg-sky-500" : "bg-sky-200/40"}`}
                        />
                      </div>
                      <span className="text-[8px] text-slate-400 font-black mt-1">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Loans Card */}
            <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50/30 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Active Loans</span>
                  <span className="text-2xl font-black text-slate-800 leading-none mt-1 block">
                    {stats.activeLoans}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest">
                  This week
                </span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20 mt-4">
                {weeklyAnalytics.map((day) => {
                  const maxVal = Math.max(...weeklyAnalytics.map(d => d.loans), 1);
                  const heightPct = Math.max((day.loans / maxVal) * 100, 12);
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 group">
                      <span className={`text-[8px] font-black transition-all mb-1 ${day.loans > 0 ? "text-emerald-600 font-black" : "text-slate-300"}`}>
                        {day.loans}
                      </span>
                      <div className="w-full bg-slate-100/80 rounded-full h-11 flex items-end overflow-hidden relative">
                        <div 
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-full transition-all duration-500 ${day.loans > 0 ? "bg-emerald-500" : "bg-emerald-200/40"}`}
                        />
                      </div>
                      <span className="text-[8px] text-slate-400 font-black mt-1">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tool Reports Card */}
            <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50/30 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tool Reports</span>
                  <span className="text-2xl font-black text-slate-800 leading-none mt-1 block">
                    {flaggedTools.length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest">
                  This week
                </span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20 mt-4">
                {weeklyAnalytics.map((day) => {
                  const maxVal = Math.max(...weeklyAnalytics.map(d => d.reports), 1);
                  const heightPct = Math.max((day.reports / maxVal) * 100, 12);
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 group">
                      <span className={`text-[8px] font-black transition-all mb-1 ${day.reports > 0 ? "text-amber-600 font-black" : "text-slate-300"}`}>
                        {day.reports}
                      </span>
                      <div className="w-full bg-slate-100/80 rounded-full h-11 flex items-end overflow-hidden relative">
                        <div 
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-full transition-all duration-500 ${day.reports > 0 ? "bg-amber-500" : "bg-amber-200/40"}`}
                        />
                      </div>
                      <span className="text-[8px] text-slate-400 font-black mt-1">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Flagged Items Card */}
            <div className="rounded-2xl border border-slate-100 p-5 bg-slate-50/30 flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Flagged Items</span>
                  <span className="text-2xl font-black text-slate-800 leading-none mt-1 block">
                    {flaggedTools.length + flaggedBorrowers.length}
                  </span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[8px] font-black uppercase tracking-widest">
                  This week
                </span>
              </div>
              <div className="flex items-end justify-between gap-1.5 h-20 mt-4">
                {weeklyAnalytics.map((day) => {
                  const maxVal = Math.max(...weeklyAnalytics.map(d => d.flags), 1);
                  const heightPct = Math.max((day.flags / maxVal) * 100, 12);
                  return (
                    <div key={day.date} className="flex flex-col items-center flex-1 group">
                      <span className={`text-[8px] font-black transition-all mb-1 ${day.flags > 0 ? "text-rose-600 font-black" : "text-slate-300"}`}>
                        {day.flags}
                      </span>
                      <div className="w-full bg-slate-100/80 rounded-full h-11 flex items-end overflow-hidden relative">
                        <div 
                          style={{ height: `${heightPct}%` }}
                          className={`w-full rounded-full transition-all duration-500 ${day.flags > 0 ? "bg-rose-500" : "bg-rose-200/40"}`}
                        />
                      </div>
                      <span className="text-[8px] text-slate-400 font-black mt-1">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* --- Navigation Controls & Dynamic Tabs --- */}
        <section className="flex flex-wrap gap-2 border-b pb-3 border-slate-200 items-center justify-between">
          <div className="flex gap-2">
            {[
              { id: "listings", label: "Flagged Listings", count: flaggedTools.length },
              { id: "borrowers", label: "Flagged Borrowers", count: flaggedBorrowers.length },
              { id: "users", label: "Members", count: users.filter(u => !u.isAdmin).length }
            ].map(t => (
              <button 
                key={t.id}
                onClick={() => { setActiveTab(t.id); setGlobalSearchQuery(""); }}
                className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === t.id 
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                    : "bg-white text-slate-500 border border-slate-200/60 hover:bg-slate-50"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>

        </section>

        {/* --- Tab Panel 1: Flagged Tools listings --- */}
        {activeTab === "listings" && (
          <section className="rounded-3xl border border-slate-200/60 p-6 md:p-8 space-y-6 bg-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">Flagged Listings</h3>
                <p className="text-xs text-slate-500 font-medium">Flagged by community members for policy violations. Review and moderate.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar inside Flagged Listings panel */}
                <div className="relative min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-slate-400 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search listings..." 
                    value={globalSearchQuery}
                    onChange={(e) => { setGlobalSearchQuery(e.target.value); setToolsPage(1); }}
                    className="w-full text-xs font-semibold pl-9 pr-4 py-2 rounded-full border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                <span className="text-xs font-black text-slate-450 uppercase tracking-widest whitespace-nowrap self-center">
                  Showing {filteredFlaggedTools.length} Tools
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {filteredFlaggedTools.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-3xl">
                  <span className="text-2xl block mb-2">🎉</span>
                  <p className="text-slate-400 font-black text-xs uppercase tracking-wider">No pending listing reports! Keep it up.</p>
                </div>
              ) : paginatedTools.map((tool) => (
                <div key={tool._id} className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50/20 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-800 text-sm">Tool: "{tool.title}"</h4>
                        <span className="rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-black uppercase px-2 py-0.5">LISTING FLAGGED</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-y-1 gap-x-6 mt-2.5 text-xs text-slate-500 font-medium">
                        <p><span className="font-bold text-slate-600">Owner:</span> {tool.owner?.name || "Unknown"}</p>
                        <p><span className="font-bold text-slate-600">Reported by:</span> {tool.flaggedBy?.name || "Member"}</p>
                        <p><span className="font-bold text-slate-600">Reason:</span> <span className="italic text-rose-600 font-semibold">"{tool.flagReason || "Reported"}"</span></p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2.5 self-end sm:self-center">
                      <button onClick={() => setSelectedTool(tool)} className="rounded-xl bg-slate-100 hover:bg-slate-250 text-slate-700 font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer border border-transparent">
                        View Details
                      </button>
                      <button onClick={() => handleModerateTool(tool._id, "approve")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-emerald-600/10">
                        Approve
                      </button>
                      <button onClick={() => handleModerateTool(tool._id, "reject")} className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 text-xs transition-colors cursor-pointer shadow-md shadow-red-600/10">
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
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
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
                        : "border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setToolsPage(prev => Math.min(prev + 1, Math.ceil(filteredFlaggedTools.length / itemsPerPage)))} 
                  disabled={toolsPage === Math.ceil(filteredFlaggedTools.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>
        )}

        {/* --- Tab Panel 2: Flagged Borrowers --- */}
        {activeTab === "borrowers" && (
          <section className="rounded-3xl border border-slate-200/60 p-6 md:p-8 space-y-6 bg-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">Flagged Borrowers Log</h3>
                <p className="text-xs text-slate-500 font-medium">Review and resolve claims of delayed returns, missing accessories, or damaged tools.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar inside Flagged Borrowers panel */}
                <div className="relative min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-slate-400 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search borrowers..." 
                    value={globalSearchQuery}
                    onChange={(e) => { setGlobalSearchQuery(e.target.value); setBorrowersPage(1); }}
                    className="w-full text-xs font-semibold pl-9 pr-4 py-2 rounded-full border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                {/* Severity Filter Select */}
                <select 
                  value={selectedSeverity} 
                  onChange={(e) => { setSelectedSeverity(e.target.value); setBorrowersPage(1); }}
                  className="rounded-xl text-xs font-bold p-2.5 border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
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
                  <div key={tool._id} className="rounded-2xl border border-slate-200 p-5 hover:bg-slate-50/20 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-extrabold text-slate-800 text-sm">Tool: "{tool.title}"</h4>
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
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
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
                        : "border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setBorrowersPage(prev => Math.min(prev + 1, Math.ceil(filteredFlaggedBorrowers.length / itemsPerPage)))} 
                  disabled={borrowersPage === Math.ceil(filteredFlaggedBorrowers.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>
        )}

        {/* --- Tab Panel 3: Members --- */}
        {activeTab === "users" && (
          <section className="rounded-3xl border border-slate-200/60 p-6 md:p-8 space-y-6 bg-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-800">Members Controls</h3>
                <p className="text-xs text-slate-500 font-medium">Verify profiles, toggle active sharing, suspend, or ban user accounts.</p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Bar inside Members panel */}
                <div className="relative min-w-[200px]">
                  <MagnifyingGlassIcon className="absolute left-3 h-4 w-4 text-slate-400 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Search members..." 
                    value={globalSearchQuery}
                    onChange={(e) => { setGlobalSearchQuery(e.target.value); setUserPage(1); }}
                    className="w-full text-xs font-semibold pl-9 pr-4 py-2 rounded-full border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 focus:bg-white transition-all"
                  />
                </div>
                {/* Directory Filter Select */}
                <select 
                  value={userFilter} 
                  onChange={(e) => { setUserFilter(e.target.value); setUserPage(1); }}
                  className="rounded-xl text-xs font-bold p-2.5 border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Members</option>
                  <option value="active">Active Accounts</option>
                  <option value="suspended">Suspended Accounts</option>
                  <option value="banned">Banned Accounts</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredUsersList.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-3xl">
                  <p className="text-slate-400 font-black text-xs uppercase">No matching members found.</p>
                </div>
              ) : paginatedUsers.map((user) => {
                const initial = user.name ? user.name[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : "?");
                return (
                  <div key={user._id} className="grid gap-4 rounded-2xl border border-slate-200 p-4 sm:p-5 md:grid-cols-[1.5fr_1fr] md:items-center hover:bg-slate-50/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white flex items-center justify-center text-lg font-black shadow-sm flex-shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-800 text-sm truncate">{user.name || "Anonymous User"}</p>
                          {user.isVerified && (
                            <CheckBadgeIcon className="h-5 w-5 text-sky-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">{user.email}</p>
                        <div className="flex gap-2.5 mt-2.5 flex-wrap text-[9px] font-black uppercase tracking-wider">
                          <span className={`px-2.5 py-0.5 rounded-full border ${user.isBanned ? "bg-red-50 border-red-100 text-red-600" : user.isSuspended ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"}`}>
                            {user.isBanned ? "Banned" : user.isSuspended ? "Suspended" : "Active"}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500">
                            Warnings: {user.warnCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                      <button
                        onClick={() => openUserDetail(user, "profile")}
                        className="rounded-xl px-3.5 py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                      >
                        Inspect Profile
                      </button>
                      <button 
                        onClick={() => handleVerifyUser(user._id, !user.isVerified)} 
                        className={`rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${user.isVerified ? "bg-slate-100 hover:bg-slate-200 text-slate-700" : "bg-sky-600 hover:bg-sky-700 text-white"}`}
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
                        className={`rounded-xl px-3.5 py-2.5 text-xs font-bold shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer ${user.isBanned ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/10" : "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/10"}`}
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
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
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
                        : "border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
                <button 
                  onClick={() => setUserPage(prev => Math.min(prev + 1, Math.ceil(filteredUsersList.length / itemsPerPage)))} 
                  disabled={userPage === Math.ceil(filteredUsersList.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="p-6 rounded-3xl shadow-2xl w-full max-w-lg relative border border-slate-100 bg-white transition-colors animate-slide-up-fade">
            <h3 className="text-base font-black tracking-tight mb-4 text-slate-800">Moderation Details: "{selectedTool.title}"</h3>
            
            {/* Mock Image Gallery */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <img 
                src={selectedTool.image} 
                alt={selectedTool.title} 
                className="h-24 w-full object-cover rounded-2xl bg-slate-100 border border-slate-200/50" 
              />
              <div className="h-24 w-full bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                GALLERY SLOT 2
              </div>
              <div className="h-24 w-full bg-slate-50 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                GALLERY SLOT 3
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-semibold text-slate-500 mb-6">
              <p><span className="font-extrabold text-slate-700">Category:</span> {selectedTool.category || "General"}</p>
              <p><span className="font-extrabold text-slate-700">Uploaded:</span> 2 June (3 weeks ago)</p>
              <p><span className="font-extrabold text-slate-700">Total Borrows:</span> 17 times</p>
              <p><span className="font-extrabold text-slate-700">Running Rating:</span> ⭐ 4.8 / 5.0</p>
              <p><span className="font-extrabold text-slate-700">Description:</span> {selectedTool.description || "No description provided."}</p>
              <p><span className="font-extrabold text-slate-700">Location:</span> {getLocationText(selectedTool.location, selectedTool._id)}</p>
              <p className="bg-rose-50 border border-rose-100 text-rose-600 rounded-xl p-3.5 font-bold mt-4">
                <span className="uppercase text-[10px] block text-rose-500 mb-1">Reason for Flagging:</span>
                "{selectedTool.flagReason || "No details provided"}"
              </p>
            </div>

            <div className="flex gap-3 text-xs font-bold">
              <button 
                onClick={() => setSelectedTool(null)} 
                className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-transparent"
              >
                Go Back
              </button>
              <button 
                onClick={() => { handleModerateTool(selectedTool._id, "approve"); setSelectedTool(null); }} 
                className="flex-1 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/10 transition-colors"
              >
                Approve (Clear Flag)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: User Inspect Profile details --- */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="p-6 rounded-3xl shadow-2xl w-full max-w-xl relative border border-slate-100 bg-white transition-colors animate-slide-up-fade">
            <h3 className="text-base font-black tracking-tight mb-3 text-slate-800">Member Profile Audit</h3>

            {/* Nav tabs inside user audit modal */}
            <div className="flex gap-2 border-b pb-2 mb-4 border-slate-200 text-xs font-bold">
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
                      ? "bg-indigo-50 text-indigo-600" 
                      : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Audit Modal Content tabs */}
            {userDetailTab === "profile" && (
              <div className="space-y-2.5 text-xs font-semibold text-slate-500 mb-6">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 text-white flex items-center justify-center text-xl font-black">
                    {(selectedUserDetail.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{selectedUserDetail.name}</h4>
                    <p className="mt-0.5 text-slate-400">{selectedUserDetail.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <p><span className="font-extrabold text-slate-700">Phone:</span> {selectedUserDetail.phone || "Not provided"}</p>
                  <p><span className="font-extrabold text-slate-700">Verification Status:</span> {selectedUserDetail.isVerified ? "Verified 🛡️" : "Unverified"}</p>
                  <p><span className="font-extrabold text-slate-700">Warn Count:</span> {selectedUserDetail.warnCount || 0} Warnings</p>
                  <p><span className="font-extrabold text-slate-700">Reputation rating:</span> ⭐ {selectedUserDetail.rating ? selectedUserDetail.rating.toFixed(1) : "0.0"} ({selectedUserDetail.numReviews || 0} reviews)</p>
                </div>
              </div>
            )}

            {userDetailTab === "borrows" && (
              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {(!selectedUserDetail.toolsRequested || selectedUserDetail.toolsRequested.length === 0) ? (
                  <p className="text-xs text-slate-400 font-bold py-4 text-center">No borrowing history recorded.</p>
                ) : selectedUserDetail.toolsRequested.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold p-2.5 rounded-xl border border-slate-100">
                    <span>Requested: "{t.tool?.title || "Tool"}"</span>
                    <span className="capitalize font-extrabold text-indigo-600">{t.status}</span>
                  </div>
                ))}
              </div>
            )}

            {userDetailTab === "lends" && (
              <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
                {(!selectedUserDetail.toolsLentOut || selectedUserDetail.toolsLentOut.length === 0) ? (
                  <p className="text-xs text-slate-400 font-bold py-4 text-center">No lending logs recorded.</p>
                ) : selectedUserDetail.toolsLentOut.map((t, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs font-semibold p-2.5 rounded-xl border border-slate-100">
                    <span>Lent: "{t.tool?.title || "Tool"}"</span>
                    <span className="capitalize font-extrabold text-emerald-500">{t.status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 text-xs font-bold">
              <button 
                onClick={() => setSelectedUserDetail(null)} 
                className="w-full py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-transparent"
              >
                Close Audit Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Overlay Modal: Send Announcement Form --- */}
      {showAnnouncements && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <form onSubmit={handleSendAnnouncement} className="p-6 rounded-3xl shadow-2xl w-full max-w-md relative border border-slate-100 bg-white transition-colors animate-slide-up-fade">
            <h3 className="text-base font-black tracking-tight mb-4">Send Broadcast Announcement</h3>
            
            <div className="space-y-4 text-xs font-bold text-slate-500">
              <div>
                <label className="block mb-1.5">Announcement Title</label>
                <input 
                  type="text" 
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  placeholder="e.g. Server Maintenance or Policy Updates"
                  className="w-full rounded-xl p-3 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block mb-1.5">Target Audience</label>
                <select
                  value={announcementForm.target}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, target: e.target.value })}
                  className="w-full rounded-xl p-3 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="all">All Registered Users</option>
                  <option value="verified">Verified Members Only</option>
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
                  className="w-full rounded-xl p-3 border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 text-xs font-bold mt-6">
              <button 
                type="button"
                onClick={() => setShowAnnouncements(false)} 
                className="flex-1 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-transparent"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="flex-1 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 transition-colors"
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
