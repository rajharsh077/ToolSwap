import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { apiBaseUrl } from "../config";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { reportId } = useParams();
  const [stats, setStats] = useState({ totalUsers: 0, totalTools: 0, activeLoans: 0, flaggedTools: 0 });
  const [flaggedTools, setFlaggedTools] = useState([]);
  const [flaggedBorrowers, setFlaggedBorrowers] = useState([]);
  const [locationLabels, setLocationLabels] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [adminId, setAdminId] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);

  const getLocationText = (location, toolId) => {
    if (typeof location === "string") return location;
    if (!location) return "Not provided";
    return location.address || location.placeName || locationLabels[toolId] || (location.lat != null && location.lng != null ? `${location.lat}, ${location.lng}` : "Not provided");
  };
  const [showToolDetails, setShowToolDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 8;

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      const [statsRes, flaggedRes, flaggedBorrowersRes, analyticsRes, usersRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/user/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/tools/flagged`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/tools/flaggedBorrowers`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/user/admin/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${apiBaseUrl}/user/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setStats(statsRes.data);
      setFlaggedTools(flaggedRes.data || []);
      setFlaggedBorrowers(flaggedBorrowersRes.data || []);
      setAnalytics(analyticsRes.data || null);
      setUsers(usersRes.data || []);
    } catch {
      toast.error("Unable to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const decoded = jwtDecode(token);
      setAdminId(decoded.id || decoded._id || decoded.userId);
    } catch {
      setAdminId(null);
    }

    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (reportId && flaggedTools.length > 0) {
      const tool = flaggedTools.find((item) => item._id === reportId);
      if (tool) {
        setSelectedTool(tool);
        setShowToolDetails(true);
      }
    }
  }, [reportId, flaggedTools]);

  useEffect(() => {
    const resolveLocationLabels = async () => {
      const labels = {};
      const allTools = [...flaggedTools, ...flaggedBorrowers];

      for (const tool of allTools) {
        const location = tool.location;
        if (typeof location === "string") {
          labels[tool._id] = location;
          continue;
        }

        if (!location) {
          labels[tool._id] = "Not provided";
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
            labels[tool._id] = data.display_name || "Not provided";
          } catch {
            labels[tool._id] = "Not provided";
          }
        }
      }

      setLocationLabels((prev) => ({ ...prev, ...labels }));
    };

    if (flaggedTools.length || flaggedBorrowers.length) {
      resolveLocationLabels();
    }
  }, [flaggedTools, flaggedBorrowers]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const handleModerateTool = async (toolId, action) => {
    const token = localStorage.getItem("token");
    const confirmMessage = action === "reject"
      ? "This will remove the tool from the platform. Continue?"
      : "This will clear the flag and keep the tool live. Continue?";

    if (action === "reject" && !window.confirm(confirmMessage)) return;

    try {
      await axios.put(`${apiBaseUrl}/tools/moderate/${toolId}`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(action === "approve" ? "Tool approved" : "Tool removed from the platform");
      fetchData();
      setShowToolDetails(false);
    } catch {
      toast.error("Unable to update tool status");
    }
  };

  const handleModerateBorrowerReport = async (toolId, action) => {
    const token = localStorage.getItem("token");
    const confirmMessage = action === "warn"
      ? "This will warn the borrower for this report. Continue?"
      : "This will clear the borrower report and keep the tool live. Continue?";

    if (action === "warn" && !window.confirm(confirmMessage)) return;

    try {
      await axios.put(`${apiBaseUrl}/tools/borrower/moderate/${toolId}`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      if (action === "approve") {
        toast.success("Borrower report cleared");
        setFlaggedBorrowers((prev) => prev.filter((tool) => tool._id !== toolId));
      } else if (action === "warn") {
        toast.success("Borrower warned successfully");
      }
      fetchData();
    } catch {
      toast.error("Unable to update borrower report status");
    }
  };

  const handleVerifyUser = async (userId, isVerified) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${apiBaseUrl}/user/admin/verify/${userId}`, { isVerified }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(isVerified ? "User verified" : "Verification removed");
      fetchData();
    } catch {
      toast.error("Unable to update user verification");
    }
  };

  const handleUserStatus = async (userId, action) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${apiBaseUrl}/user/admin/user/${userId}`, { action }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("User status updated");
      fetchData();
    } catch {
      toast.error("Unable to update user status");
    }
  };

  const openToolDetails = (tool) => {
    setSelectedTool(tool);
    setShowToolDetails(true);
    navigate(`/admin/report/${tool._id}`);
  };

  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => user._id !== adminId)
      .filter((user) => {
        const term = userSearch.trim().toLowerCase();
        const matchesSearch =
          !term ||
          user.name?.toLowerCase().includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.location?.toLowerCase().includes(term) ||
          user.phone?.toLowerCase().includes(term);

        if (!matchesSearch) return false;

      if (userStatusFilter === "active") {
        return !user.isSuspended && !user.isBanned;
      }
      if (userStatusFilter === "suspended") {
        return user.isSuspended && !user.isBanned;
      }
      if (userStatusFilter === "banned") {
        return user.isBanned;
      }
      return true;
    });
  }, [users, userSearch, userStatusFilter]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch, userStatusFilter, users]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = useMemo(() => {
    const start = (userPage - 1) * usersPerPage;
    return filteredUsers.slice(start, start + usersPerPage);
  }, [filteredUsers, userPage]);

  const closeToolDetails = () => {
    setSelectedTool(null);
    setShowToolDetails(false);
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="mt-2 text-slate-600">Monitor platform health and moderation needs.</p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        {loading ? (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow">Loading...</div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Total Users</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalUsers}</p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Total Tools</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.totalTools}</p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Active Loans</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.activeLoans}</p>
              </div>
              <div className="rounded-2xl bg-white p-6 shadow">
                <p className="text-sm text-slate-500">Flagged Tools</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stats.flaggedTools}</p>
              </div>
            </div>

            <div className="mt-10 rounded-2xl bg-white p-6 shadow">
              <div className="flex items-center justify-between gap-4 flex-col sm:flex-row">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Admin Analytics</h2>
                  <p className="text-sm text-slate-500">Weekly trends for users, loans, reports, and flagged items.</p>
                </div>
              </div>
              {analytics ? (
                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  {[
                    { title: "New Users", values: analytics.newUsers, color: "bg-sky-500" },
                    { title: "Active Loans", values: analytics.loans, color: "bg-emerald-500" },
                    { title: "Tool Reports", values: analytics.reports, color: "bg-amber-500" },
                    { title: "Flagged Items", values: analytics.flaggedItems, color: "bg-rose-500" },
                  ].map((chart) => {
                    const maxValue = Math.max(...chart.values, 1);
                    const total = chart.values.reduce((sum, item) => sum + item, 0);
                    return (
                      <div key={chart.title} className="rounded-2xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm text-slate-500">{chart.title}</p>
                            <p className="text-2xl font-bold text-slate-900">{total}</p>
                          </div>
                          <span className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold text-white ${chart.color}`}>This week</span>
                        </div>
                        <div className="mt-5 grid grid-cols-7 items-end gap-2 h-36">
                          {chart.values.map((value, index) => (
                            <div key={index} className="flex flex-col items-center justify-end gap-2">
                              <span className="text-xs font-semibold text-slate-700">{value}</span>
                              <div className="w-full rounded-t-full" style={{ height: `${Math.max((value / maxValue) * 100, 12)}%`, backgroundColor: chart.color === "bg-sky-500" ? "#0ea5e9" : chart.color === "bg-emerald-500" ? "#22c55e" : chart.color === "bg-amber-500" ? "#f59e0b" : "#f43f5e" }} />
                              <span className="mt-2 text-[10px] text-slate-500 text-center">{analytics.labels[index]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-slate-500">Loading analytics...</p>
              )}
            </div>

            <div className="mt-10 rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-slate-900">Flagged Tools</h2>
              <div className="mt-4 space-y-3">
                {flaggedTools.length === 0 ? (
                  <p className="text-slate-500">No flagged tools right now.</p>
                ) : flaggedTools.map((tool) => (
                  <div key={tool._id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">{tool.title}</p>
                        <p className="text-sm text-slate-500">Owner: {tool.owner?.name || "Unknown"}</p>
                        <p className="text-sm text-slate-500">Reason: {tool.flagReason || "Reported"}</p>
                        <p className="text-sm text-slate-500">Reported by: {tool.flaggedBy?.name || "User"}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => openToolDetails(tool)} className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">View details</button>
                        <button onClick={() => handleModerateTool(tool._id, "approve")} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">Approve</button>
                        <button onClick={() => handleModerateTool(tool._id, "reject")} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>              {totalUserPages > 1 && (
                <div className="mt-4 flex items-center justify-between rounded-b-2xl border-t border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-600">Page {userPage} of {totalUserPages}</p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={userPage === 1}
                      onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Prev
                    </button>
                    <button
                      disabled={userPage === totalUserPages}
                      onClick={() => setUserPage((prev) => Math.min(totalUserPages, prev + 1))}
                      className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}            </div>

            <div className="mt-10 rounded-2xl bg-white p-6 shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">User Management</h2>
                  <p className="text-sm text-slate-500">Search and filter users before taking moderation action.</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search by name, email, location, phone"
                    className="w-full min-w-[220px] rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#06B6D4] focus:ring-2 focus:ring-[#06B6D4]"
                  />
                  <select
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                    className="w-full min-w-[180px] rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#06B6D4] focus:ring-2 focus:ring-[#06B6D4]"
                  >
                    <option value="all">All users</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-500">Showing {filteredUsers.length} of {users.length} users.</p>
              <div className="mt-4 max-h-[36rem] overflow-y-auto pr-2 space-y-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-slate-500">No users available.</p>
                ) : paginatedUsers.map((user) => (
                  <div key={user._id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1.5fr_1fr] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-800">{user.name || user.email}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      <p className="text-sm text-slate-500">Status: {user.isBanned ? "Banned" : user.isSuspended ? "Suspended" : "Active"}</p>
                      <p className="text-sm text-slate-500">Verified: {user.isVerified ? "Yes" : "No"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-start md:justify-end">
                      <button onClick={() => handleVerifyUser(user._id, !user.isVerified)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${user.isVerified ? "bg-slate-100 text-slate-700" : "bg-sky-600 text-white"}`}>
                        {user.isVerified ? "Unverify" : "Verify"}
                      </button>
                      <button onClick={() => handleUserStatus(user._id, user.isSuspended ? "unsuspend" : "suspend")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${user.isSuspended ? "bg-emerald-100 text-emerald-700" : "bg-amber-500 text-white"}`}>
                        {user.isSuspended ? "Unsuspend" : "Suspend"}
                      </button>
                      <button onClick={() => handleUserStatus(user._id, user.isBanned ? "unban" : "ban")} className={`rounded-lg px-3 py-2 text-sm font-semibold ${user.isBanned ? "bg-emerald-100 text-emerald-700" : "bg-red-600 text-white"}`}>
                        {user.isBanned ? "Unban" : "Ban"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-2xl bg-white p-6 shadow">
              <h2 className="text-xl font-bold text-slate-900">Flagged Borrowers</h2>
              <div className="mt-4 space-y-3">
                {flaggedBorrowers.length === 0 ? (
                  <p className="text-slate-500">No borrower reports at the moment.</p>
                ) : flaggedBorrowers.map((tool) => (
                  <div key={tool._id} className="rounded-xl border border-slate-200 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                      <div>
                        <p className="font-semibold text-slate-800">Tool: {tool.title}</p>
                        <p className="text-sm text-slate-500">Borrower: {tool.borrowedBy?.name || "Unknown"} ({tool.borrowedBy?.email || "n/a"})</p>
                        <p className="text-sm text-slate-500">Reported by owner: {tool.borrowerFlaggedBy?.name || "Owner"}</p>
                        <p className="text-sm text-slate-500">Borrower warnings: {tool.borrowedBy?.warnCount || 0}</p>
                        <p className="text-sm text-slate-500">Borrower status: {tool.borrowedBy?.isBanned ? "Banned" : "Active"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Reason: {tool.borrowerFlagReason || "No reason provided"}</p>
                        <p className="text-sm text-slate-500">Reported at: {tool.borrowerFlaggedAt ? new Date(tool.borrowerFlaggedAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap justify-end gap-2">
                      <button
                        onClick={() => handleModerateBorrowerReport(tool._id, "approve")}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                      >
                        Resolve report
                      </button>
                      <button
                        onClick={() => handleModerateBorrowerReport(tool._id, "warn")}
                        className="rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600"
                      >
                        Warn borrower
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {showToolDetails && selectedTool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Tool details</h3>
                <p className="text-sm text-slate-500">Review this flagged tool before moderating.</p>
              </div>
              <button onClick={closeToolDetails} className="text-slate-500 hover:text-slate-900">Close</button>
            </div>
            <div className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                <img src={selectedTool.image || "https://via.placeholder.com/200"} alt={selectedTool.title} className="h-48 w-full rounded-3xl object-cover md:h-full" />
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-2">{selectedTool.category || "No category"}</p>
                  <h2 className="text-3xl font-bold text-slate-900">{selectedTool.title}</h2>
                  <p className="mt-3 text-slate-600">{selectedTool.description}</p>
                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">Owner:</span> {selectedTool.owner?.name || "Unknown"} ({selectedTool.owner?.email || "n/a"})</p>
                    <p><span className="font-semibold text-slate-800">Reported by:</span> {selectedTool.flaggedBy?.name || "User"}</p>
                    <p><span className="font-semibold text-slate-800">Reason:</span> {selectedTool.flagReason || "Reported listing"}</p>
                    <p><span className="font-semibold text-slate-800">Location:</span> {getLocationText(selectedTool.location)}</p>
                    <p><span className="font-semibold text-slate-800">Reported at:</span> {new Date(selectedTool.flaggedAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 justify-end border-t border-slate-200 pt-4">
                <button onClick={() => handleModerateTool(selectedTool._id, "approve")} className="rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors">Approve</button>
                <button onClick={() => handleModerateTool(selectedTool._id, "reject")} className="rounded-full bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors">Remove</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
