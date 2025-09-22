import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import {jwtDecode} from "jwt-decode";
import "react-toastify/dist/ReactToastify.css";

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
  const [userId, setUserId] = useState(null);

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
      setUserId(decoded.id || decoded._id);

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
      toast.error("Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `http://localhost:3000/${name}/addTool`,
        { title, description, category, image, location, available: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Tool added successfully😊");
      navigate(`/${name}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to add tool. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      {/* Full-feature ToastContainer */}
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

      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Add a Tool
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Tool Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none"
            rows={4}
          />
          <input
            type="text"
            placeholder="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none"
          />
          <input
            type="text"
            placeholder="Image URL"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none"
          />
          <input
            type="text"
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition"
          >
            {loading ? "Adding..." : "Add Tool"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddTool;
