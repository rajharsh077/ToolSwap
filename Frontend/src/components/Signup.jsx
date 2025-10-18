import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserPlusIcon, EnvelopeIcon, LockClosedIcon, MapPinIcon, PhoneIcon } from "@heroicons/react/24/solid"; // ⬅️ Added Icons

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    location: "", // ⬅️ NEW
    phone: "",     // ⬅️ NEW
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Basic frontend validation for new fields
    if (!formData.location || !formData.phone) {
        setError("Location and Phone are required.");
        return;
    }

    try {
      const { data } = await axios.post("http://localhost:3000/signup", formData);
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
    <div className="min-h-screen flex items-center justify-center bg-sky-100 p-4">
      <div className="container mx-auto grid md:grid-cols-2 gap-12 items-center max-w-7xl">
        {/* Left Side: Form Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-sky-400 text-white rounded-full flex items-center justify-center shadow-lg mb-4">
              <UserPlusIcon className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2 text-center">
              Create Your Account
            </h2>
            <p className="text-gray-500 mb-6 text-center">
              Join our community to start sharing tools.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg text-sm">
              <p className="font-semibold">Sign Up Failed:</p>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="name">Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <UserPlusIcon className="h-5 w-5" />
                </span>
                <input
                  type="text" id="name" name="name" className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow duration-300"
                  value={formData.name} onChange={handleChange} required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="email">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <EnvelopeIcon className="h-5 w-5" />
                </span>
                <input
                  type="email" id="email" name="email" className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow duration-300"
                  value={formData.email} onChange={handleChange} required
                />
              </div>
            </div>

            {/* Location ⬅️ NEW FIELD */}
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="location">Location</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <MapPinIcon className="h-5 w-5" />
                </span>
                <input
                  type="text" id="location" name="location" className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow duration-300"
                  value={formData.location} onChange={handleChange} required
                />
              </div>
            </div>

            {/* Phone ⬅️ NEW FIELD */}
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="phone">Phone</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <PhoneIcon className="h-5 w-5" />
                </span>
                <input
                  type="tel" id="phone" name="phone" className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow duration-300"
                  value={formData.phone} onChange={handleChange} required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <LockClosedIcon className="h-5 w-5" />
                </span>
                <input
                  type="password" id="password" name="password" className="w-full border border-gray-300 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-shadow duration-300"
                  value={formData.password} onChange={handleChange} required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-sky-400 text-white font-bold py-3 rounded-lg hover:bg-sky-500 transition-colors duration-300 shadow-md"
            >
              Sign Up
            </button>
          </form>

          <p className="mt-6 text-center text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-sky-500 font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>

        {/* Right Side: Narrative Content */}
        <div className="hidden md:flex flex-col items-center text-center p-8">
          <h1 className="text-5xl font-extrabold text-gray-800 drop-shadow-lg leading-tight mb-4">
            Connect. Create.
            <br />
            Community.
          </h1>
          <p className="text-lg text-gray-600 max-w-md">
            Find the right tool for any job and help your neighbors with yours. Join the movement towards a more sustainable and collaborative future.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;