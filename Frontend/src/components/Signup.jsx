import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlusIcon, EnvelopeIcon, LockClosedIcon, MapPinIcon, PhoneIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/solid";
import { apiBaseUrl } from "../config";

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    location: "",
    phone: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!formData.location || !formData.phone) {
        setError("Location and Phone are required.");
        return;
    }

    try {
      const { data } = await axios.post(`${apiBaseUrl}/signup`, formData);
      alert(data.message);
      navigate("/login");
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-white font-sans text-slate-800 antialiased relative overflow-hidden">
      {/* Ambient background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-teal-100/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-100/20 rounded-full blur-3xl pointer-events-none" />

      <div className="flex-grow grid lg:grid-cols-12 w-full relative z-10">
        {/* Left Panel: Branding & Narrative */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-tr from-indigo-700 via-indigo-600 to-teal-500 text-white p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)]" />
          <div className="absolute top-1/4 -right-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="relative z-10 flex items-center gap-2">
            <WrenchScrewdriverIcon className="h-7 w-7 text-white" />
            <span className="text-2xl font-black tracking-tight">ToolShare</span>
          </div>

          <div className="relative z-10 my-auto">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight mb-6">
              Connect. Share. <br /> Lend.
            </h1>
            <p className="text-indigo-100/90 text-sm leading-relaxed mb-8 max-w-sm font-medium">
              Join the neighborhood movement towards a sustainable and collaborative future. Borrow what you need, lend what you don't.
            </p>
            
            <div className="space-y-4 text-xs font-semibold text-indigo-50">
              <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                <span className="text-lg">🛠️</span>
                <p>Access hundreds of tools instantly.</p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                <span className="text-lg">🤝</span>
                <p>Lend securely to verified local community neighbors.</p>
              </div>
              <div className="flex items-center gap-3 bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
                <span className="text-lg">📈</span>
                <p>Earn reputation and top lender trust badges.</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-[10px] text-indigo-200 font-semibold tracking-wider uppercase">
            © {new Date().getFullYear()} ToolShare Community
          </div>
        </div>

        {/* Right Panel: Signup Form */}
        <div className="col-span-12 lg:col-span-7 flex flex-col justify-center items-center px-6 py-12 md:px-12 bg-slate-50/30">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] p-10 relative">
            <div className="mb-6 text-center lg:text-left">
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 mb-2">
                Get Started
              </h2>
              <p className="text-slate-400 text-xs font-semibold">
                Create a neighbor account to share tools.
              </p>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 p-4 mb-6 rounded-2xl text-xs">
                <p className="font-extrabold mb-0.5">Sign Up Failed:</p>
                <p className="font-semibold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold text-slate-655">
              {/* Name */}
              <div>
                <label className="block text-slate-500 mb-1.5" htmlFor="name">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                    <UserPlusIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="text" id="name" name="name" className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-semibold"
                    placeholder="John Doe"
                    value={formData.name} onChange={handleChange} required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-slate-500 mb-1.5" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                    <EnvelopeIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="email" id="email" name="email" className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-semibold"
                    placeholder="name@example.com"
                    value={formData.email} onChange={handleChange} required
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-slate-500 mb-1.5" htmlFor="location">Location</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                    <MapPinIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="text" id="location" name="location" className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-semibold"
                    placeholder="Connaught Place, New Delhi"
                    value={formData.location} onChange={handleChange} required
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-slate-500 mb-1.5" htmlFor="phone">Phone Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                    <PhoneIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="tel" id="phone" name="phone" className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-semibold"
                    placeholder="9876543210"
                    value={formData.phone} onChange={handleChange} required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-slate-500 mb-1.5" htmlFor="password">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-indigo-500">
                    <LockClosedIcon className="h-5 w-5" />
                  </span>
                  <input
                    type="password" id="password" name="password" className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm"
                    placeholder="••••••••"
                    value={formData.password} onChange={handleChange} required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md shadow-indigo-600/10 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 text-sm mt-6 cursor-pointer"
              >
                Sign Up
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-slate-500 font-semibold">
              Already have an account?{" "}
              <Link to="/login" className="text-indigo-600 font-extrabold hover:underline">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;