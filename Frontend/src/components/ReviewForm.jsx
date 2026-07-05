import { useState } from "react";
import axios from "axios";
import { StarIcon } from "@heroicons/react/24/solid";
import { apiBaseUrl } from "../config";

const ReviewForm = ({ toolId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comment.trim()) {
      setError("Please add a comment");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        `${apiBaseUrl}/tools/${toolId}/review`,
        { rating, comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onReviewSubmitted(res.data.tool.reviews[res.data.tool.reviews.length - 1]);
      setRating(5);
      setComment("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit review");
    } finally {
      setLoading(false);
    }
  };

  const renderStarSelector = () => {
    return (
      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className="transition-all transform hover:scale-125"
          >
            <StarIcon
              className={`h-10 w-10 ${star <= rating ? "text-yellow-400" : "text-gray-300"}`}
            />
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-gradient-to-r from-sky-50 to-cyan-50 rounded-2xl p-6 mb-6 border-2 border-sky-300 shadow-lg">
      <h3 className="text-lg font-bold text-slate-900 mb-6">Share Your Experience</h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Your Rating</label>
          {renderStarSelector()}
          <p className="text-sm text-slate-600 mt-2">
            Rating: <span className="font-bold text-sky-600">{rating}</span> out of 5 stars
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Your Review</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell other borrowers about your experience with this tool and owner..."
            maxLength={500}
            rows={4}
            className="w-full p-4 border-2 border-sky-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none shadow-sm hover:border-sky-400 transition-colors"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-slate-600">{comment.length}/500 characters</p>
            {comment.length > 400 && (
              <p className="text-xs text-amber-600 font-semibold">Getting close to limit!</p>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg font-semibold">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-sky-500 to-cyan-500 text-white font-bold py-3 rounded-lg hover:from-sky-600 hover:to-cyan-600 disabled:from-gray-400 disabled:to-gray-400 transition-all shadow-lg disabled:shadow-none"
          >
            {loading ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReviewForm;
