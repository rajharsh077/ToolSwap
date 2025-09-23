import { useEffect, useState } from "react";
import axios from "axios";
import Navbar from "./Navbar";
import { useNavigate } from "react-router-dom";
import {
  SparklesIcon,
  MagnifyingGlassIcon,
  HandRaisedIcon,
  StarIcon,
} from "@heroicons/react/24/solid";

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
    setSelectedTool(false);
  };

  const handleGet = () => {
    navigate("/login");
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-4 w-4 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <StarIcon className="h-4 w-4 text-yellow-400 opacity-50" />
            <div
              className="absolute top-0 left-0 overflow-hidden"
              style={{ width: "50%" }}
            >
              <StarIcon className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-100 text-slate-900 font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white py-24 md:py-48 text-left shadow-lg relative overflow-hidden">
        <div className="container mx-auto max-w-7xl px-6 grid md:grid-cols-2 gap-12 items-center">
          <div className="md:order-1 text-center md:text-left relative z-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4 drop-shadow-md">
              Borrow & Lend. <br className="hidden md:block" /> Your Community's Toolbox.
            </h1>
            <p className="text-lg md:text-xl font-light text-slate-600 mb-12">
              Access the tools you need from neighbors you trust. It's easy, fast, and free.
            </p>
            <a
              href="/signup"
              className="inline-block bg-sky-400 text-white font-bold px-10 py-5 rounded-full shadow-lg transition-transform duration-300 hover:scale-105 hover:bg-sky-500"
            >
              Get Started
            </a>
          </div>
          <div className="md:order-2 flex items-center justify-center relative z-10 p-8">
            <div className="relative w-80 h-80 md:w-96 md:h-96">
              <div className="absolute inset-0 bg-sky-200 rounded-3xl transform rotate-12 shadow-2xl"></div>
              <div className="absolute inset-0 bg-white rounded-3xl transform -rotate-12 shadow-2xl flex items-center justify-center">
                <div className="text-center p-8">
                  <h3 className="text-5xl font-extrabold text-sky-400">10k+</h3>
                  <p className="mt-2 text-xl font-semibold text-slate-600">Active Members</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Simple. Sustainable. Smart.
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl bg-white">
              <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-sky-100 text-sky-500 shadow-md transition-all duration-500 group-hover:scale-110">
                <SparklesIcon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">1. Join</h3>
              <p className="text-slate-600">
                Create a free account to join our growing community of sharers.
              </p>
            </div>
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl bg-white">
              <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-sky-100 text-sky-500 shadow-md transition-all duration-500 group-hover:scale-110">
                <MagnifyingGlassIcon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">2. Find</h3>
              <p className="text-slate-600">
                Easily search for tools available in your neighborhood.
              </p>
            </div>
            <div className="group flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl bg-white">
              <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-full bg-sky-100 text-sky-500 shadow-md transition-all duration-500 group-hover:scale-110">
                <HandRaisedIcon className="h-10 w-10" />
              </div>
              <h3 className="text-2xl font-bold mb-2">3. Share</h3>
              <p className="text-slate-600">
                Connect with the owner and make a real-world exchange.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Tools Section */}
      <section className="py-20 px-6 bg-white">
        <div className="container mx-auto max-w-7xl">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            Popular Tools Near You
          </h2>
          {tools.length === 0 ? (
            <p className="text-center text-slate-500">No tools available right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
              {tools.slice(0, 8).map((tool) => (
                <div
                  key={tool._id}
                  className="group relative bg-white rounded-2xl overflow-hidden shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer border border-zinc-200"
                  onClick={() => openModal(tool)}
                >
                  <img
                    src={tool.image}
                    alt={tool.title}
                    className="w-full h-56 object-contain object-center transition-all duration-300 group-hover:brightness-90"
                  />
                  <div className="p-5 relative">
                    <h3 className="text-lg font-semibold truncate mb-1">
                      {tool.title}
                    </h3>
                    <p className="text-slate-600 text-sm mb-3 h-10 overflow-hidden">
                      {tool.description.length > 70
                        ? `${tool.description.slice(0, 70)}...`
                        : tool.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-sky-400">
                          <path fillRule="evenodd" d="M9.69 18.933A10 10 0 0 1 10 18a9.993 9.993 0 0 0 7.892-3.555.5.5 0 0 0-.472-.888c-.777.291-1.571.522-2.39.702A8.452 8.452 0 0 1 10 16.5a8.45 8.45 0 0 1-5.185-1.802c-.819-.18-1.613-.411-2.39-.702a.5.5 0 0 0-.472.888A9.993 9.993 0 0 0 10 18c.112 0 .223-.006.31-.018l.266-.035c.074-.01.148-.02.22-.032a.5.5 0 0 0 .146-.169c.07-.11.127-.23.166-.358.04-.128.05-.262.03-.397A10 10 0 0 1 9.69 1.067l-.14.07-.075.04c-.01.006-.02.01-.03.016L9.69 1.067z" clipRule="evenodd" />
                        </svg>
                        {tool.location}
                      </p>
                      {renderStars(4.5)}
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
        <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center z-50 p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg relative p-8 transform scale-95 transition-all duration-300" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeModal} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-3xl font-light leading-none transition-all">&times;</button>
            <img src={selectedTool.image} alt={selectedTool.title} className="w-full h-64 object-contain rounded-2xl mb-6 shadow-md" />
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-3xl font-bold text-slate-900">{selectedTool.title}</h2>
              <div className="text-sm font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: selectedTool.available ? '#4ade80' : '#f87171' }}>
                {selectedTool.available ? "Available" : "Not Available"}
              </div>
            </div>
            <p className="text-slate-700 mb-4">{selectedTool.description}</p>
            <p className="text-sm text-slate-500 mb-2 font-semibold">📍 Location: {selectedTool.location}</p>
            <div className="mb-4">{renderStars(4.5)}</div>
            <button
              onClick={handleGet}
              className="w-full bg-sky-400 text-white py-3 rounded-full font-bold text-lg hover:bg-sky-500 transition-colors shadow-lg"
            >
              Get This Tool
            </button>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <section className="py-20 bg-slate-900 text-center text-white">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold mb-4">
            Have Tools to Lend?
          </h2>
          <p className="text-slate-300 text-lg mb-8">
            Help your community by sharing the tools you don't use every day.
          </p>
          <a
            href="/login"
            className="inline-block bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-zinc-200 transition-colors shadow-lg"
            >
              Lend Your Tools
            </a>
          </div>
        </section>

      {/* Reviews Section */}
      <section className="py-20 bg-white shadow-lg">
        <div className="container mx-auto max-w-7xl px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            What Our Users Say
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-zinc-100 p-8 rounded-2xl shadow-md transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl border border-zinc-200"
              >
                <div className="flex mb-4">
                  {renderStars(5)}
                </div>
                <p className="italic text-slate-700 leading-relaxed mb-6">
                  “ToolSwap is a lifesaver. I was able to find a power drill for a weekend project, saving me money and a trip to the store. The community is amazing!”
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-200 text-slate-600 flex items-center justify-center rounded-full font-bold text-xl uppercase ring-2 ring-sky-400 ring-offset-2">
                    {i === 0 ? 'A' : i === 1 ? 'M' : 'S'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {i === 0 ? 'Alex Rivera' : i === 1 ? 'Maria Sanchez' : 'Sam Chen'}
                    </p>
                    <p className="text-sm text-slate-500">
                      Member since 2024
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-zinc-400 py-16">
        <div className="container mx-auto px-6 max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="md:col-span-2">
            <h3 className="text-2xl font-bold text-white mb-4">ToolSwap</h3>
            <p className="leading-relaxed">
              Empowering communities to share resources, reduce waste, and build trust.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-sky-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-sky-400 transition-colors">
                  Browse Tools
                </a>
              </li>
              <li>
                <a href="/login" className="hover:text-sky-400 transition-colors">
                  Login
                </a>
              </li>
              <li>
                <a href="/signup" className="hover:text-sky-400 transition-colors">
                  Sign Up
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Contact</h4>
            <p>Email: support@toolswap.com</p>
            <div className="flex gap-4 mt-4 text-white">
              <a href="#" className="hover:text-sky-400 transition-colors">
                <i className="fab fa-facebook text-xl"></i>
              </a>
              <a href="#" className="hover:text-sky-400 transition-colors">
                <i className="fab fa-twitter text-xl"></i>
              </a>
              <a href="#" className="hover:text-sky-400 transition-colors">
                <i className="fab fa-linkedin text-xl"></i>
              </a>
            </div>
          </div>
        </div>
        <p className="text-center text-slate-500 mt-12 text-sm">
          &copy; {new Date().getFullYear()} ToolSwap. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Home;