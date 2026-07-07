import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import Navbar from "./Navbar";
import { apiBaseUrl } from "../config";

const EditProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    phone: "",
    profileImage: "",
  });

  // Get current user from token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      const decoded = jwtDecode(token);
      if (decoded?.exp && decoded.exp < Date.now() / 1000) {
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }
      setCurrentUser({ id: decoded.id || decoded._id, name: decoded.name, isAdmin: decoded.isAdmin });
    } catch {
      navigate("/login");
    }
  }, [navigate]);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const res = await axios.get(`${apiBaseUrl}/users/edit/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data);
        setFormData({
          name: res.data.name || "",
          location: res.data.location || "",
          phone: res.data.phone || "",
          profileImage: res.data.profileImage || "",
        });
        setError("");
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchProfile();
    }
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData((prev) => ({
          ...prev,
          profileImage: event.target?.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (formData.name.trim().length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (formData.location.trim().length < 2) {
      setError("Location must be valid");
      return;
    }

    if (!/^\d{10,}$/.test(formData.phone.replace(/[-\s]/g, ""))) {
      setError("Phone number must be at least 10 digits");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(
        `${apiBaseUrl}/users/edit/profile`,
        {
          name: formData.name.trim(),
          location: formData.location.trim(),
          phone: formData.phone.trim(),
          profileImage: formData.profileImage,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Profile updated successfully!");
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      setUser(res.data.user);
      setTimeout(() => {
        navigate(`/${res.data.user.name}`);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar user={null} />
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-sm font-semibold text-slate-500">Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar user={currentUser} />
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-1.5 bg-indigo-200 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="absolute inset-3.5 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
            <p className="text-xs font-bold text-slate-500">Loading profile data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 bg-gradient-to-br from-indigo-50/40 via-slate-50 to-teal-50/20 font-sans antialiased flex flex-col relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-200/10 rounded-full blur-3xl" />
      <Navbar user={currentUser} />

      <div className="container mx-auto max-w-2xl px-6 py-16 relative z-10 flex-1 flex items-center justify-center">
        <div className="bg-white rounded-3xl shadow-2xl w-full border border-slate-100/80 overflow-hidden">
          {/* Header Banner */}
          <div className="p-8 bg-gradient-to-r from-indigo-600 via-purple-650 to-teal-505 bg-indigo-600 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.1),_transparent_40%)]" />
            <h1 className="text-2xl font-black relative z-10">Edit Profile Details</h1>
            <p className="text-indigo-100 text-xs mt-1 relative z-10 font-medium">Update your public credentials and personal photo.</p>
          </div>

          <div className="p-8">
            {error && (
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-xl mb-6 text-xs font-semibold">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-xs font-semibold">
                {success}
              </div>
            )}

          <form onSubmit={handleSubmit} className="space-y-5 text-xs font-semibold text-slate-600">
            {/* Profile Image */}
            <div>
              <label className="block text-slate-550 mb-3">
                Profile Avatar Picture
              </label>
              <div className="flex items-center gap-6">
                {formData.profileImage ? (
                  <img
                    src={formData.profileImage}
                    alt="Profile"
                    className="w-20 h-20 rounded-2xl object-cover border border-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-400">
                    <span className="text-[10px]">No image</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-slate-550 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your full name"
                className="w-full border border-slate-200 bg-white rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Minimum 2 characters required</p>
            </div>

            {/* Location */}
            <div>
              <label className="block text-slate-550 mb-1.5">
                Location / Neighborhood *
              </label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="Your city or neighborhood"
                className="w-full border border-slate-200 bg-white rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">City or neighborhood name e.g. Sector 12, Delhi</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-slate-550 mb-1.5">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Your phone number"
                className="w-full border border-slate-200 bg-white rounded-xl p-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-sm font-medium"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Minimum 10 digits required</p>
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-slate-550 mb-1.5">Email Address</label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full border border-slate-200 bg-slate-50 text-slate-400 rounded-xl p-3.5 font-medium cursor-not-allowed"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Registered email address cannot be changed</p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-6 border-t border-slate-100 font-bold">
              <button
                type="button"
                onClick={() => navigate(`/${currentUser?.name}`)}
                className="flex-1 py-3 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-750 disabled:bg-gray-300 transition-colors shadow-md shadow-indigo-600/10"
              >
                {saving ? "Saving changes..." : "Save Profile Details"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
  );
};

export default EditProfile;
