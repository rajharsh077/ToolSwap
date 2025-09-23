import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import "react-toastify/dist/ReactToastify.css";

// --- Professional Icons from Heroicons ---
import {
  PlusCircleIcon,
  WrenchScrewdriverIcon,
  TagIcon,
  PhotoIcon,
  MapPinIcon,
  DocumentTextIcon,
  ArrowUpOnSquareIcon,
} from "@heroicons/react/24/outline";

const AddTool = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [image, setImage] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { name } = useParams();
  const token = localStorage.getItem("token");

  // --- No changes to the logic, it's already solid! ---
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
      if (tokenUsername !== name) {
        toast.info("Redirected to your profile.");
        navigate(`/${tokenUsername}/addTool`, { replace: true });
      }
    } catch (err) {
      console.error("Invalid token", err);
      toast.error("Invalid token.");
      localStorage.removeItem("token");
      navigate("/login");
    }
  }, [token, name, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !category || !image || !location) {
      toast.error("Please fill all the required fields.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `http://localhost:3000/${name}/addTool`,
        { title, description, category, image, location, available: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Replaced alert with a success toast for consistency
      toast.success("Tool added successfully! Redirecting...");
      setTimeout(() => navigate(`/${name}`), 1500); // Navigate after a short delay
    } catch (err) {
      console.error(err);
      toast.error("Failed to add tool. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- Helper component for a consistent input field style ---
  const FormInput = ({ id, label, icon, value, onChange, placeholder, type = "text" }) => (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 pt-7">
        {icon}
      </div>
      <input
        type={type}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100">
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

      {/* --- Header --- */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <PlusCircleIcon className="h-10 w-10 text-indigo-600" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Share a New Tool</h1>
              <p className="mt-1 text-slate-500">
                Add your tool's details below to make it available for others to borrow.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* --- Form Section --- */}
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            
            {/* --- Tool Title Input --- */}
            <div className="md:col-span-2">
              <FormInput
                id="title"
                label="Tool Title"
                icon={<WrenchScrewdriverIcon className="h-5 w-5 text-slate-400" />}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Bosch Cordless Drill"
              />
            </div>

            {/* --- Description Input --- */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <div className="relative">
                 <div className="pointer-events-none absolute top-0 left-0 flex items-center pl-3 pt-3.5">
                    <DocumentTextIcon className="h-5 w-5 text-slate-400"/>
                 </div>
                <textarea
                  id="description"
                  placeholder="Describe the tool, its condition, and any accessories included."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 py-3 pl-10 pr-4 text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  rows={4}
                />
              </div>
            </div>
            
            {/* --- Category Input --- */}
            <div>
              <FormInput
                id="category"
                label="Category"
                icon={<TagIcon className="h-5 w-5 text-slate-400" />}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., Power Tools"
              />
            </div>
            
            {/* --- Location Input --- */}
            <div>
              <FormInput
                id="location"
                label="Your Location"
                icon={<MapPinIcon className="h-5 w-5 text-slate-400" />}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Mumbai, India"
              />
            </div>
            
            {/* --- Image URL Input --- */}
            <div className="md:col-span-2">
              <FormInput
                id="image"
                label="Image URL"
                icon={<PhotoIcon className="h-5 w-5 text-slate-400" />}
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            
            {/* --- Action Buttons --- */}
            <div className="md:col-span-2 mt-4 flex flex-col sm:flex-row-reverse sm:items-center sm:justify-start gap-4">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Tool...
                  </>
                ) : (
                  <>
                    <ArrowUpOnSquareIcon className="h-5 w-5" />
                    Add Tool to Platform
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/${name}`)}
                className="inline-flex w-full justify-center rounded-lg bg-slate-100 px-5 py-3 font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition hover:bg-slate-200 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default AddTool;