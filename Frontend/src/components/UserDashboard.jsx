import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Import Heroicons for a professional look ---
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
  HandRaisedIcon
} from "@heroicons/react/24/outline";

const UserDashboard = () => {
  const [tools, setTools] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [filteredTools, setFilteredTools] = useState([]);
  const [name, setName] = useState("");
  const [userId, setUserId] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);

  const navigate = useNavigate();
  const { name: routeName } = useParams();

  // --- No changes to the logic, it's already solid! ---
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first.");
      navigate("/login");
      return;
    }
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        toast.info("Session expired. Please log in again.");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      const tokenUsername = decoded.username || decoded.name;
      setName(tokenUsername);
      setUserId(decoded.id || decoded.userId || decoded._id);
      if (tokenUsername !== routeName) {
        navigate(`/${tokenUsername}`, { replace: true });
      }
    } catch {
      toast.error("Invalid token.");
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [navigate, routeName]);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://localhost:3000/tools", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const othersTools = res.data.filter(
          (tool) => tool.owner?._id !== userId
        );
        setTools(othersTools);
      } catch (err) {
        toast.error("Failed to fetch tools.");
      }
    };
    if (userId) fetchTools();
  }, [userId]);

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

  const handleLend = async (toolId) => {
    const confirmed = window.confirm(
      "Do you want to send a borrow request for this tool?"
    );
    if (!confirmed) return;
    try {
      const token = localStorage.getItem("token");
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

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <WrenchScrewdriverIcon className="h-8 w-8 text-[#06B6D4]" />
              <h1 className="text-2xl font-bold text-slate-900">ToolSwap</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/${name}/profile`)}
                className="flex items-center gap-2 text-slate-600 font-semibold px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <UserCircleIcon className="h-5 w-5" />
                Profile
              </button>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
            Welcome, {name}!
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Discover tools shared by your community. Ready to start a new project?
          </p>
        </header>

        <section className="mb-12 p-6 bg-[#1E3A8A] rounded-2xl shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold mb-1">Got a tool to share?</h3>
            <p className="text-gray-300">
              Help out a neighbor and list your tool on the platform.
            </p>
          </div>
          <button
            onClick={() => navigate(`/${name}/addTool`)}
            className="bg-white text-[#1E3A8A] font-bold px-6 py-3 rounded-lg shadow-md hover:scale-105 transition-transform flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add a New Tool
          </button>
        </section>

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

        {filteredTools.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-slate-700">
              No Tools Found
            </h3>
            <p className="text-slate-500 mt-2">
              Try adjusting your search or filter criteria.
            </p>
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
                  <h3 className="text-xl font-bold text-slate-900 mb-2 truncate">
                    {tool.title}
                  </h3>
                  <p className="text-slate-600 text-sm mb-4 flex-grow">
                    {tool.description.length > 80
                      ? `${tool.description.slice(0, 80)}...`
                      : tool.description}
                  </p>
                  <p className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <MapPinIcon className="h-5 w-5" />
                    <span>{tool.location}</span>
                  </p>
                  <div className="flex justify-between items-center mt-auto gap-2">
                    <button
                      onClick={() => setSelectedTool(tool)}
                      className="w-1/2 border border-slate-300 text-slate-800 px-4 py-2 rounded-lg font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                    >
                        <EyeIcon className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleLend(tool._id)}
                      className="w-1/2 bg-[#06B6D4] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#0598B5] transition-colors flex items-center justify-center gap-1"
                    >
                        <HandRaisedIcon className="h-4 w-4" />
                      Borrow
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg relative animate-slide-up-fade">
            <button
              onClick={() => setSelectedTool(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <XMarkIcon className="h-7 w-7" />
            </button>
            <h3 className="text-2xl font-bold mb-4 text-slate-900">
              {selectedTool.title}
            </h3>
            <img
              src={selectedTool.image}
              alt={selectedTool.title}
              className="w-full h-56 object-contain rounded-lg mb-4"
            />
            <p className="text-slate-600 mb-6">{selectedTool.description}</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <UserCircleIcon className="h-5 w-5 text-slate-500" />
                <strong>Owner:</strong>
                <span>{selectedTool.owner?.name || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3">
                <PhoneIcon className="h-5 w-5 text-slate-500" />
                <strong>Phone:</strong>
                <span>{selectedTool.owner?.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPinIcon className="h-5 w-5 text-slate-500" />
                <strong>Location:</strong>
                <span>{selectedTool.location}</span>
              </div>
              <div className="flex items-center gap-3">
                {selectedTool.available ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                ) : (
                  <NoSymbolIcon className="h-5 w-5 text-red-500" />
                )}
                <strong>Available:</strong>
                <span
                  className={`font-semibold ${
                    selectedTool.available
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {selectedTool.available ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StarIcon className="h-5 w-5 text-amber-500" />
                <strong>Rating:</strong>
                <span>
                  {selectedTool.owner?.rating || "Not Rated"} (
                  {selectedTool.owner?.numReviews || 0} reviews)
                </span>
              </div>
            </div>
            <button
              onClick={() => handleLend(selectedTool._id)}
              className="mt-6 bg-[#06B6D4] text-white px-4 py-3 rounded-xl w-full font-bold hover:bg-[#0598B5] transition-colors text-base"
            >
              Send Borrow Request
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">ToolSwap</h3>
              <p className="text-slate-400">
                Connecting communities, one tool at a time.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Quick Links</h4>
              <ul className="space-y-2">
                <li><a href="/" className="hover:text-cyan-400 transition-colors">Home</a></li>
                <li><a href="/login" className="hover:text-cyan-400 transition-colors">Login</a></li>
                <li><a href="/signup" className="hover:text-cyan-400 transition-colors">Sign Up</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-3">Contact</h4>
              <p className="text-slate-400">Email: support@toolswap.com</p>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-slate-500 text-sm">
            <p>© {new Date().getFullYear()} ToolSwap. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default UserDashboard;