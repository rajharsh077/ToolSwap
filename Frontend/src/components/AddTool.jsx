import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import { 
  ArrowLeftIcon, 
  WrenchScrewdriverIcon, 
  TagIcon, 
  MapPinIcon, 
  CalendarDaysIcon, 
  ClockIcon, 
  PhotoIcon 
} from "@heroicons/react/24/outline";
import "react-toastify/dist/ReactToastify.css";
import { apiBaseUrl } from "../config";
import Navbar from "./Navbar";

const AddTool = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imageError, setImageError] = useState("");
  const [location, setLocation] = useState("");
  const [bookingStartDate, setBookingStartDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [returnDeadline, setReturnDeadline] = useState("");
  const [condition, setCondition] = useState("Good Condition");
  const [currentUserData, setCurrentUserData] = useState({ id: null, name: "" });

  const navigate = useNavigate();
  const { name } = useParams();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // ---------------- Token Authentication ----------------
  useEffect(() => {
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
      const decodedUserId = decoded.id || decoded.userId || decoded._id;
      setCurrentUserData({ id: decodedUserId, name: tokenUsername, isAdmin: decoded.isAdmin });

      if (tokenUsername !== name) {
        toast.info("Redirected to your profile.");
        navigate(`/${tokenUsername}/addTool`, { replace: true });
      }
    } catch {
      toast.error("Invalid token.");
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [token, name, navigate]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    setImageError("");

    if (!file) {
      setImage("");
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError("Please choose a valid image file.");
      setImage("");
      setImagePreview("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      setImage(result);
      setImagePreview(result);
    };
    reader.onerror = () => {
      setImageError("Unable to read the selected image.");
      setImage("");
      setImagePreview("");
    };
    reader.readAsDataURL(file);
  };

  // ---------------- Submit Tool ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !category.trim() || !image.trim() || !location.trim()) {
      toast.error("Please fill all required fields and upload a photo.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${apiBaseUrl}/${name}/addTool`,
        {
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          image: image.trim(),
          location: location.trim(),
          condition,
          available: true,
          bookingStartDate: bookingStartDate || null,
          bookingEndDate: bookingEndDate || null,
          pickupTime: pickupTime.trim(),
          returnDeadline: returnDeadline.trim(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success("Tool added successfully 🎉");
      navigate(`/${name}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add tool.");
    } finally {
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased">
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
      <Navbar user={currentUserData} onLogout={handleLogout} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Navigation & Title */}
        <div className="flex items-center justify-between mb-8 max-w-3xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(`/${name}`)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-indigo-600 font-bold text-xs transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to Dashboard
          </button>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full border border-slate-200/50">
            Step 1 of 1
          </span>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.015)] border border-slate-100/80 overflow-hidden max-w-3xl mx-auto">
          {/* Form Header */}
          <div className="p-8 bg-gradient-to-r from-indigo-600 to-teal-500 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_40%)]" />
            <h2 className="text-2xl font-black relative z-10">Add a New Tool</h2>
            <p className="text-indigo-100 text-xs mt-1 relative z-10 font-medium">List a tool for your neighbors to borrow and build community points.</p>
          </div>

          <div className="p-8 space-y-8">
            
            {/* Section 1: Tool Details */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 inline-block" />
                Tool Profile
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left side inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-slate-600 font-bold text-xs mb-1.5">Tool Title *</label>
                    <div className="relative">
                      <WrenchScrewdriverIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                      <input
                        type="text"
                        placeholder="e.g. Cordless Drill, Lawn Mower"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium shadow-sm hover:border-slate-350"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold text-xs mb-1.5">Category *</label>
                    <div className="relative">
                      <TagIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                      <input
                        type="text"
                        placeholder="e.g. Garden, Power Tools, Hand Tools"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium shadow-sm hover:border-slate-350"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold text-xs mb-1.5">Location *</label>
                    <div className="relative">
                      <MapPinIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                      <input
                        type="text"
                        placeholder="e.g. Sector 12, Noida"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium shadow-sm hover:border-slate-350"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold text-xs mb-1.5">Condition *</label>
                    <div className="relative">
                      <WrenchScrewdriverIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500" />
                      <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full border border-slate-200 bg-white rounded-xl p-3 pl-11 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium shadow-sm hover:border-slate-350"
                        required
                      >
                        <option value="New">New</option>
                        <option value="Like New">Like New</option>
                        <option value="Good Condition">Good Condition</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Right side Photo upload */}
                <div className="flex flex-col justify-between">
                  <div>
                    <label className="block text-slate-600 font-bold text-xs mb-1.5">Tool Photo *</label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 transition-colors flex flex-col items-center justify-center cursor-pointer bg-slate-50 relative group min-h-[170px] shadow-sm">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="flex flex-col items-center text-center">
                        <PhotoIcon className="h-8 w-8 text-slate-400 mb-2 group-hover:scale-105 transition-transform duration-200" />
                        <span className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Choose file</span>
                        <span className="text-[10px] text-slate-400 mt-1">PNG, JPG up to 5MB</span>
                      </div>
                    </div>
                    {imageError && <p className="mt-2 text-red-500 text-[11px] font-semibold">{imageError}</p>}
                  </div>

                  {imagePreview && (
                    <div className="mt-4 rounded-2xl border border-slate-100 p-3 bg-slate-50/50 flex flex-col items-center">
                      <span className="text-[10px] font-bold text-slate-450 uppercase tracking-wider mb-2 self-start">Image Preview</span>
                      <img 
                        src={imagePreview} 
                        alt="Tool preview" 
                        className="h-28 w-full object-contain rounded-xl bg-white p-1 border border-slate-200/50" 
                        onError={() => setImagePreview("")} 
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-slate-600 font-bold text-xs mb-1.5">Description *</label>
                <textarea
                  placeholder="Tell neighbors how to use it, what accessories are included, and any terms of borrowing..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 bg-white rounded-xl p-3.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 resize-none font-medium leading-relaxed shadow-sm hover:border-slate-300"
                  required
                />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Section 2: Sharing Details */}
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                Sharing Rules (Optional)
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="mb-1.5 block font-bold text-slate-500 text-[10px]">Start Date</label>
                  <input 
                    type="date" 
                    value={bookingStartDate} 
                    onChange={(e) => setBookingStartDate(e.target.value)} 
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-slate-500 text-[10px]">End Date</label>
                  <input 
                    type="date" 
                    value={bookingEndDate} 
                    onChange={(e) => setBookingEndDate(e.target.value)} 
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-slate-500 text-[10px]">Pickup Instructions</label>
                  <input 
                    type="text" 
                    value={pickupTime} 
                    onChange={(e) => setPickupTime(e.target.value)} 
                    placeholder="e.g. After 6 PM" 
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-slate-700 font-medium" 
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-slate-500 text-[10px]">Return Deadline</label>
                  <input 
                    type="text" 
                    value={returnDeadline} 
                    onChange={(e) => setReturnDeadline(e.target.value)} 
                    placeholder="e.g. Under 5 days" 
                    className="w-full border border-slate-200 bg-white rounded-xl p-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm text-slate-700 font-medium" 
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl disabled:opacity-70 font-bold shadow-md shadow-indigo-600/10 hover:scale-[1.002] transition-all text-xs uppercase tracking-wider"
            >
              {loading ? "Adding listing..." : "Publish Tool Listing"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddTool;
