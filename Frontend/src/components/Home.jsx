import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [tools, setTools] = useState([]);
  const [selectedTool, setSelectedTool] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const res = await axios.get("http://localhost:3000/tools");
        setTools(res.data);
      } catch (err) {
        console.error("Error fetching tools:", err);
      }
    };
    fetchTools();
  }, []);

  const openModal = (tool) => {
    setSelectedTool(tool);
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedTool(null);
    setShowModal(false);
  };

  const handleGet = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to ToolSwap</h1>
        <p className="text-lg md:text-xl mb-6">Borrow and lend tools in your community with ease.</p>
        <a
          href="/signup"
          className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-md shadow hover:bg-gray-100 transition"
        >
          Get Started
        </a>
      </section>

      {/* How It Works */}
      <section className="py-14 px-6 max-w-5xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-6 text-left">
          {[
            { title: "1. Sign Up", text: "Create an account to start lending or borrowing tools." },
            { title: "2. Browse or Lend", text: "Search available tools or list your own for others to use." },
            { title: "3. Connect & Share", text: "Contact tool owners and arrange pickups easily." },
          ].map((step, i) => (
            <div key={i} className="bg-white p-6 rounded-md shadow hover:shadow-lg transition">
              <h3 className="text-xl font-semibold text-blue-600 mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Tools */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Featured Tools</h2>

          {tools.length === 0 ? (
            <p className="text-center text-gray-500">No tools available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {tools.slice(0, 6).map((tool) => (
                <div
  key={tool._id}
  className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow hover:shadow-lg transition"
>
  <img
    src={tool.image}
    alt={tool.title}
    className="w-full h-48 object-cover"
  />
  <div className="p-4">
    <h3 className="text-xl font-semibold text-gray-800 mb-2">
      {tool.title}
    </h3>
    <p className="text-gray-600 text-sm mb-2">
      {tool.description.length > 100
        ? `${tool.description.slice(0, 100)}...`
        : tool.description}
    </p>
    <div className="flex items-center justify-between">
      <p className="text-sm text-gray-500">📍 {tool.location}</p>
      <button
        onClick={() => openModal(tool)}
        className="bg-blue-600 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-700"
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
      </section>

      {/* Modal */}
      {showModal && selectedTool && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md relative">
            <button onClick={closeModal} className="absolute top-3 right-4 text-gray-500 hover:text-gray-800 text-xl">
              &times;
            </button>
            <img src={selectedTool.image} alt={selectedTool.title} className="w-full h-48 object-cover rounded mb-4" />
            <h2 className="text-2xl font-bold mb-2">{selectedTool.title}</h2>
            <p className="text-gray-700 mb-2">{selectedTool.description}</p>
            <p className="text-sm text-gray-500 mb-1">📍 Location: {selectedTool.location}</p>
            <p className="text-sm text-gray-500 mb-1">
              {selectedTool.available ? "✅ Available" : "❌ Not Available"}
            </p>
            <p className="text-yellow-500 text-sm mb-3">⭐️⭐️⭐️⭐️☆ (4.0)</p>
            <button
              onClick={handleGet}
              className="bg-green-600 text-white w-full py-2 rounded-md font-semibold hover:bg-green-700"
            >
              Get
            </button>
          </div>
        </div>
      )}

      {/* CTA */}
      <section className="text-center py-14 px-6 bg-blue-50 mt-10">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Have Tools to Lend?</h2>
        <p className="text-gray-600 mb-6">Help your community by sharing your unused tools.</p>
        <a
          href="/login"
          className="bg-blue-600 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-700 transition"
        >
          Lend Your Tools
        </a>
      </section>

      {/* Reviews */}
      <section className="bg-white py-10">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-6">What Our Users Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-100 p-6 rounded-lg shadow">
                <p className="italic text-gray-700 mb-4">
                  “I found a ladder just when I needed one for painting my house. ToolSwap is brilliant!”
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-full font-bold">
                    A
                  </div>
                  <div>
                    <p className="font-semibold">Amit Kumar</p>
                    <p className="text-sm text-gray-500">Member since 2024</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10 mt-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">ToolSwap</h3>
            <p>Helping communities share resources and build trust. Lend and borrow tools with ease.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="/" className="hover:underline">Home</a></li>
              <li><a href="/login" className="hover:underline">Login</a></li>
              <li><a href="/signup" className="hover:underline">Sign Up</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-3">Contact</h4>
            <p>Email: support@toolswap.com</p>
            <div className="flex gap-4 mt-4">
              <a href="#"><i className="fab fa-facebook text-xl"></i></a>
              <a href="#"><i className="fab fa-twitter text-xl"></i></a>
              <a href="#"><i className="fab fa-linkedin text-xl"></i></a>
            </div>
          </div>
        </div>
        <p className="text-center text-gray-400 mt-8 text-sm">© 2025 ToolSwap. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Home;
