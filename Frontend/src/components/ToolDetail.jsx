import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { StarIcon, ArrowLeftIcon, ChatBubbleBottomCenterTextIcon, HandRaisedIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/solid";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Navbar from "./Navbar";
import ReviewForm from "./ReviewForm";
import ChatModal from "./ChatModal";
import { apiBaseUrl } from "../config";

const ToolDetail = () => {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const [tool, setTool] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetChat, setTargetChat] = useState({ user: null, tool: null });

  const isOwner = user && tool && (user.id === tool.owner?._id || user.id === tool.owner);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded?.exp && decoded.exp > Date.now() / 1000) {
          setUser({ id: decoded.id || decoded._id, name: decoded.name, isAdmin: decoded.isAdmin });
        }
      } catch (err) {
        console.error("Token decode error:", err);
      }
    }
  }, []);

  useEffect(() => {
    const fetchToolDetail = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        
        const res = await axios.get(`${apiBaseUrl}/tools/detail/${toolId}`, { headers });
        setTool(res.data);
        setReviews(res.data.reviews || []);
        setError(null);
      } catch (err) {
        console.error("Error fetching tool detail:", err);
        setError(err.response?.data?.message || "Failed to load tool details");
      } finally {
        setLoading(false);
      }
    };

    if (toolId) {
      fetchToolDetail();
    }
  }, [toolId]);

  const handleRequestBorrow = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("❌ Please login to borrow tools");
      navigate("/login");
      return;
    }

    try {
      await axios.post(
        `${apiBaseUrl}/tools/request/${toolId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("✅ Borrow request sent successfully! Owner will review it soon.");
    } catch (err) {
      const message = err.response?.data?.message || "Error sending borrow request";
      toast.error(`❌ ${message}`);
    }
  };

  const handleMessageOwner = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("❌ Please login to message");
      navigate("/login");
      return;
    }

    if (!user) {
      toast.error("❌ Unable to load user info");
      return;
    }

    setTargetChat({
      user: { id: tool.owner?._id, name: tool.owner?.name },
      tool: { id: toolId, title: tool.title }
    });
    setIsChatOpen(true);
  };

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else if (user?.name) {
      navigate(`/${user.name}`);
    } else {
      navigate("/");
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const emptyStars = 5 - fullStars;

    return (
      <div className="flex gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <StarIcon key={`full-${i}`} className="h-4 w-4 text-amber-400" />
        ))}
        {[...Array(emptyStars)].map((_, i) => (
          <StarIcon key={`empty-${i}`} className="h-4 w-4 text-slate-200" />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar user={user} />
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 bg-indigo-100 rounded-full animate-pulse"></div>
                <div className="absolute inset-2.5 bg-indigo-200 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="absolute inset-4 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-650">Loading tool details...</p>
            <p className="text-xs text-slate-400">Please wait a moment</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tool) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar user={user} />
        <div className="container mx-auto max-w-2xl px-6 py-20 flex-1 flex flex-col justify-center">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8 font-bold text-xs bg-indigo-50 px-4 py-2 rounded-full max-w-max transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to tools
          </button>
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-slate-100 text-center">
            <div className="mb-4 text-5xl">⚠️</div>
            <p className="text-rose-600 text-lg font-bold mb-2">{error || "Tool not found"}</p>
            <p className="text-slate-500 text-xs mb-6 leading-relaxed">This tool may have been removed or is no longer available.</p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-750 shadow-md shadow-indigo-600/10 text-xs"
            >
              Return to Browse Tools
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 bg-gradient-to-br from-indigo-50/40 via-slate-50 to-teal-50/20 font-sans antialiased flex flex-col relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-200/10 rounded-full blur-3xl pointer-events-none" />
      <Navbar user={user} />

      <div className="container mx-auto max-w-5xl px-6 py-12 relative z-10">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-8 font-bold text-xs bg-indigo-50 hover:bg-indigo-100/80 px-4 py-2 rounded-full max-w-max transition-all shadow-sm"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to listings
        </button>

        <div className="bg-white/80 backdrop-blur-md rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden border border-slate-200/60">
          
          {/* Main Horizontal Grid Section */}
          <div className="grid md:grid-cols-12 gap-0">
            
            {/* Left Column: Image Area */}
            <div className="md:col-span-5 bg-slate-50/40 p-6 md:p-10 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200/60 relative">
              <div className="relative w-full aspect-square max-h-96 md:max-h-none flex items-center justify-center rounded-2xl bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.015)] border border-slate-100">
                <img
                  src={tool.image}
                  alt={tool.title}
                  onError={(e) => {
                    e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
                    e.target.onerror = null;
                  }}
                  className="max-h-72 object-contain rounded-xl hover:scale-102 transition-transform duration-500"
                />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-extrabold text-white shadow-md uppercase tracking-wider ${tool.available ? "bg-emerald-500" : "bg-slate-400"}`}>
                  {tool.available ? "Available" : "Borrowed"}
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Info & Actions */}
            <div className="md:col-span-7 p-6 md:p-10 flex flex-col justify-between">
              <div>
                {/* Category & Title */}
                <div className="mb-4">
                  <span className="inline-block bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
                    {tool.category || "Other"}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight leading-tight">{tool.title}</h1>
                </div>

                {/* Description */}
                <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                  {tool.description}
                </p>

                {/* Specification Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 p-5 rounded-2xl bg-slate-50 border border-slate-200/50 text-[10px] sm:text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">📍 Location</p>
                    <p className="text-slate-800 font-bold">
                      {typeof tool.location === "string"
                        ? tool.location
                        : tool.location?.address || "Location provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">🕒 Pickup Time</p>
                    <p className="text-slate-800 font-bold">{tool.pickupTime || "Flexible"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">⏳ Return Deadline</p>
                    <p className="text-slate-800 font-bold">{tool.returnDeadline || "Flexible"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">📅 Booking Window</p>
                    <p className="text-slate-800 font-bold">
                      {tool.bookingStartDate && tool.bookingEndDate
                        ? `${new Date(tool.bookingStartDate).toLocaleDateString()} - ${new Date(
                            tool.bookingEndDate
                          ).toLocaleDateString()}`
                        : "Flexible availability"}
                    </p>
                  </div>
                </div>

                {/* Lender Profile Card */}
                <div className="mb-8 border-t border-slate-100 pt-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Lender Details</h3>
                  <div className="flex items-center gap-4 bg-slate-50 border border-slate-200/50 rounded-2xl p-4">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-xl flex items-center justify-center font-black shadow-sm overflow-hidden flex-shrink-0">
                      {tool.owner?.profileImage ? (
                        <img
                          src={tool.owner.profileImage}
                          alt={tool.owner.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (tool.owner?.name || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 text-sm truncate">{tool.owner?.name || "Unknown"}</span>
                        {tool.owner?.isVerified && (
                          <span className="text-[8px] text-teal-600 font-bold bg-teal-50 px-1 py-0.2 rounded border border-teal-100">✓ Verified</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {renderStars(tool.owner?.rating || 0)}
                        <span className="text-[10px] font-bold text-slate-500">
                          {tool.owner?.rating ? tool.owner.rating.toFixed(1) : "0"}
                          <span className="font-medium text-slate-400 ml-1">({tool.owner?.numReviews || 0} reviews)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 text-xs sm:text-sm font-bold pt-4 border-t border-slate-100">
                {isOwner ? (
                  <button
                    onClick={() => navigate(`/${user.name}`)}
                    className="flex-1 py-3.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/10 hover:scale-[1.01] flex items-center justify-center gap-2 transition-all shadow-md"
                  >
                    <WrenchScrewdriverIcon className="h-5 w-5 flex-shrink-0" />
                    Manage Tool in Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleRequestBorrow}
                      disabled={!tool.available}
                      className={`flex-1 py-3.5 rounded-full flex items-center justify-center gap-2 transition-all shadow-md ${
                        tool.available
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/10 hover:scale-[1.01]"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50"
                      }`}
                    >
                      <HandRaisedIcon className="h-5 w-5 flex-shrink-0" />
                      {tool.available ? "Request to Borrow" : "Lent Out / Booked"}
                    </button>
                    <button
                      onClick={handleMessageOwner}
                      className="flex-1 py-3.5 rounded-full border border-indigo-200 text-indigo-600 bg-white hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
                    >
                      <ChatBubbleBottomCenterTextIcon className="h-5 w-5 flex-shrink-0" />
                      Message Owner
                    </button>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* Full Width Reviews Section */}
          <div className="border-t border-slate-200/60 p-6 md:p-10 bg-slate-50/20 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.01),_transparent_40%)] pointer-events-none" />
            <div className="relative z-10">
              
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Reviews ({reviews.length})</h2>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Community feedback on borrowing this tool</p>
                </div>
                {user && (
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all hover:scale-102"
                  >
                    {showReviewForm ? "Cancel" : "Leave Review"}
                  </button>
                )}
              </div>

              {showReviewForm && user && (
                <div className="mb-8 p-6 rounded-2xl border border-indigo-100 bg-indigo-50/30 animate-slide-up-fade">
                  <ReviewForm
                    toolId={toolId}
                    onReviewSubmitted={(newReview) => {
                      setReviews([newReview, ...reviews]);
                      setShowReviewForm(false);
                    }}
                  />
                </div>
              )}

              {reviews.length === 0 ? (
                <p className="text-slate-400 text-center py-12 text-xs font-medium bg-white rounded-2xl border border-dashed border-slate-200 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
                  No reviews yet for this tool. Be the first to share your experience!
                </p>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {reviews.map((review, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.01)] flex flex-col gap-3 hover:shadow-sm transition-shadow duration-200">
                      <div className="flex items-start justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-700 flex items-center justify-center rounded-xl font-bold text-sm border border-indigo-100">
                            {review.borrower?.profileImage ? (
                              <img
                                src={review.borrower.profileImage}
                                alt={review.borrower.name}
                                className="w-full h-full object-cover rounded-xl"
                              />
                            ) : (
                              (review.borrower?.name || "U").charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-800 text-xs">{review.borrower?.name || "Anonymous borrower"}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-0.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed italic">“{review.comment}”</p>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        currentUser={user}
        targetUser={targetChat.user}
        targetTool={targetChat.tool}
      />
    </div>
  );
};

export default ToolDetail;
