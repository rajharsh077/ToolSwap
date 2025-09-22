import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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
        toast.info("Redirected to your profile.");
        navigate(`/${tokenUsername}`, { replace: true });
      }
    } catch (err) {
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
        setFilteredTools(othersTools);
      } catch (err) {
        console.error("Error fetching tools:", err);
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
      toast.success("✅ Request Sent to the owner");
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to send request");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛠</span>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-pink-500 to-red-500 text-transparent bg-clip-text animate-pulse">
            ToolSwap
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/${name}/profile`)}
            className="bg-white text-indigo-700 font-semibold px-4 py-2 rounded-md shadow hover:bg-gray-100 transition"
          >
            👤 Profile
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white font-semibold px-4 py-2 rounded-md shadow hover:bg-red-700 transition"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Welcome */}
      <section className="text-center py-10 bg-blue-50">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Welcome to ToolSwap {name} 😊!
        </h2>
        <p className="text-gray-600 max-w-xl mx-auto">
          Find and borrow tools from your local community. Use search and
          filters to get started.
        </p>
      </section>

      {/* Add Tool Banner */}
      <section className="max-w-5xl mx-auto px-4 py-6 mb-6 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold mb-2">You can also help others!</h3>
          <p className="text-sm md:text-base">
            If you have tools to lend, add them here and help your community.
          </p>
        </div>
        <button
          onClick={() => navigate(`/${name}/addTool`)}
          className="bg-white text-green-600 font-semibold px-5 py-2 rounded-md shadow hover:bg-gray-100 transition"
        >
          ➕ Add Tool
        </button>
      </section>

      {/* Search & Filter */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <input
            type="text"
            placeholder="Search tools by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="p-3 rounded-md border border-gray-300 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Filter by location..."
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="p-3 rounded-md border border-gray-300 focus:outline-none"
          />
        </div>

        {/* Cards */}
        {filteredTools.length === 0 ? (
          <p className="text-center text-gray-500">No tools found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredTools.map((tool) => (
              <div
                key={tool._id}
                className="bg-white rounded-lg shadow-md overflow-hidden flex flex-col"
              >
                <img
                  src={tool.image}
                  alt={tool.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 flex flex-col flex-1 relative">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {tool.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-2">
                    {tool.description.length > 100
                      ? `${tool.description.slice(0, 100)}...`
                      : tool.description}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">📍 {tool.location}</p>
                  <div className="flex justify-between items-center mt-auto">
                    <button
                      onClick={() => handleLend(tool._id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md font-semibold hover:bg-blue-700 transition"
                    >
                      Lend
                    </button>
                    <button
                      onClick={() => setSelectedTool(tool)}
                      className="bg-gray-300 text-gray-800 px-4 py-2 rounded-md font-semibold hover:bg-gray-400 transition"
                    >
                      View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md relative">
            <button
              onClick={() => setSelectedTool(null)}
              className="absolute top-2 right-3 text-gray-600 hover:text-red-500 text-2xl"
            >
              &times;
            </button>
            <h3 className="text-xl font-bold mb-2">{selectedTool.title}</h3>
            <p>
              <strong>Owner:</strong> {selectedTool.owner?.name || "Not Provided"}
            </p>
            <img
              src={selectedTool.image}
              className="w-full h-40 object-cover rounded mb-3"
            />
            <p className="text-sm text-gray-600 mb-2">{selectedTool.description}</p>
            <p>
              <strong>Location:</strong> {selectedTool.location}
            </p>
            <p>
              <strong>Phone:</strong> {selectedTool.owner?.phone || "Not Provided"}
            </p>
            <p>
              <strong>Available:</strong> {selectedTool.available ? "Yes" : "No"}
            </p>
            <p>
              <strong>Rating:</strong> ⭐ {selectedTool.owner?.rating || "Not Rated"} (
              {selectedTool.owner?.numReviews || 0} reviews)
            </p>
            <p>
              <strong>Reviews:</strong>
            </p>
            <ul className="list-disc ml-6 text-sm text-gray-700 mb-4">
              <li>"Very useful and well-maintained tool!"</li>
              <li>"The owner was polite and responsive."</li>
              <li>"Highly recommend borrowing from here!"</li>
            </ul>
            <button
              onClick={() =>handleLend(selectedTool._id) }
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
            >
              Get This Tool
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ToolSwap</h3>
            <p>
              Helping communities share resources and build trust. Lend and borrow
              tools with ease.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="hover:underline">
                  Home
                </a>
              </li>
              <li>
                <a href="/login" className="hover:underline">
                  Login
                </a>
              </li>
              <li>
                <a href="/signup" className="hover:underline">
                  Sign Up
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <p>Email: support@toolswap.com</p>
            <div className="flex gap-4 mt-4">
              <a href="#">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-400 mt-8 text-sm">© 2025 ToolSwap. All rights reserved.</p>
      </footer>

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default UserDashboard;
