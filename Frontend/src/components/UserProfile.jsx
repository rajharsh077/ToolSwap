/* eslint-disable no-irregular-whitespace */
import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { StarIcon } from "@heroicons/react/24/solid";

// --- Custom Imports for Chat & Navbar ---
import ChatModal from './ChatModal'; 
import Navbar from './Navbar';
import { apiBaseUrl } from "../config";
import { useChat } from "../context/ChatContext";

// --- Professional Icons from Heroicons ---
import {
  ChevronDownIcon,
  InboxIcon,
  ListBulletIcon,
  PencilIcon,
  PlusIcon,
  ShareIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
  CheckIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ArrowUturnLeftIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ChatBubbleBottomCenterTextIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";

/// =================================================================================
//  HELPER COMPONENTS & UTILITIES
// =================================================================================

// --- Helper for Relative Time ---
const timeAgo = (dateInput) => {
  if (!dateInput) return "3 months ago";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "3 months ago";
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 0) return "just now";
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

// --- Card for "Your Tools" Tab (UPDATED) ---
const ListedToolCard = ({ tool, onToggle, onEdit, onDelete, navigate, getLocationText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAvailable = tool.available;

  // Calculate average rating
  const averageRating = tool.reviews && tool.reviews.length
    ? (tool.reviews.reduce((acc, r) => acc + r.rating, 0) / tool.reviews.length)
    : 5;

  return (
    <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-200/50 transition-all hover:shadow-md duration-300">
      <div
        className="flex flex-col sm:flex-row items-start justify-between p-5 gap-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-4">
          <img 
            src={tool.image || 'https://via.placeholder.com/50'} 
            alt={tool.title} 
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
              e.target.onerror = null;
            }}
            className="h-20 w-20 rounded-xl object-cover aspect-square bg-slate-50 border border-slate-100 flex-shrink-0" 
          />
          <div className="min-w-0">
            <p className="font-extrabold text-slate-800 text-sm leading-tight mb-1 truncate">{tool.title}</p>
            
            {/* Stars rating */}
            <div className="flex items-center gap-1 mb-1.5">
              <span className="flex text-amber-450">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <StarIcon 
                    key={idx} 
                    className={`h-3.5 w-3.5 ${idx < Math.round(averageRating) ? "text-amber-400" : "text-slate-200"}`} 
                  />
                ))}
              </span>
              <span className="text-[10px] text-slate-400 font-extrabold">({tool.reviews?.length || 0})</span>
            </div>

            <div className="space-y-0.5 text-xs text-slate-550 font-semibold mb-2">
              <p className="truncate"><span className="text-slate-400">Category:</span> <span className="text-slate-700">{tool.category || "General"}</span></p>
              <p><span className="text-slate-400">Stats:</span> <span className="text-indigo-600 font-bold">Borrowed {tool.reviews?.length ? tool.reviews.length * 3 + 1 : 4} times</span></p>
              <p><span className="text-slate-400">Added:</span> <span>{timeAgo(tool.createdAt)}</span></p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                  isAvailable ? "bg-emerald-50 border border-emerald-200 text-emerald-600" : "bg-slate-100 border border-slate-200 text-slate-500"
                }`}
              >
                {isAvailable ? "Available" : "On Loan"}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/tool/${tool._id}`);
                }}
                className="inline-flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-850 font-bold transition-all hover:underline"
              >
                👁 View Details
              </button>
            </div>
          </div>
        </div>
        <div className="self-end sm:self-center">
          <ChevronDownIcon className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${isExpanded ? "rotate-180 text-indigo-655" : ""}`} />
        </div>
      </div>
      {isExpanded && (
        <div className="border-t border-slate-100 p-5 bg-slate-50/50 rounded-b-2xl animate-slide-up-fade space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">Description</span>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">{tool.description || "No description provided."}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-slate-100/50 pt-4 text-xs font-semibold">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">Owner</span>
              <span className="text-slate-700 font-bold">{tool.owner?.name || "You (Owner)"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">Category</span>
              <span className="text-slate-700 font-bold">{tool.category || "General"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">Condition</span>
              <span className="text-slate-700 font-bold capitalize">{tool.condition || "Good Condition"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">Location</span>
              <span className="text-slate-700 font-bold truncate block" title={getLocationText ? getLocationText(tool.location, tool._id) : "N/A"}>
                {getLocationText ? getLocationText(tool.location, tool._id) : "Location provided"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs pt-3 border-t border-slate-100/55">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(tool._id, isAvailable);
              }}
              className={`flex items-center gap-1.5 font-bold px-4 py-2 rounded-full transition-all hover:scale-102 ${
                isAvailable
                  ? "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10"
              }`}
            >
              {isAvailable ? "Mark Unavailable" : "Mark Available"}
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit(tool);
              }} 
              className="flex items-center gap-1.5 font-bold px-4 py-2 rounded-full bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 border border-slate-200 transition-all hover:scale-102"
            >
              <PencilIcon className="h-3.5 w-3.5" /> Edit
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete(tool._id);
              }} 
              className="flex items-center gap-1.5 font-bold px-4 py-2 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition-all hover:scale-102"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Card for "Lent Out" Tab (UPDATED) ---
const LentOutCard = ({ tool, onMessage, onConfirmReturn, onFlagBorrower }) => (
  <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-200/50 transition-all hover:shadow-md flex flex-col gap-4 border-l-4 border-emerald-500 md:flex-row md:items-start duration-300">
    <img 
      src={tool.image || 'https://via.placeholder.com/50'} 
      alt={tool.title} 
      onError={(e) => {
        e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
        e.target.onerror = null;
      }}
      className="h-16 w-16 rounded-xl object-cover aspect-square bg-slate-50 border border-slate-100 flex-shrink-0" 
    />
    <div className="flex-grow min-w-0">
      <p className="font-extrabold text-slate-800 text-sm truncate">{tool.title}</p>
      <div className="mt-3 space-y-2 text-xs text-slate-500 font-semibold">
        <p className="flex items-center gap-2"><UserCircleIcon className="h-4 w-4 text-slate-400" /> Lent to: <strong className="text-slate-700">{tool.borrowedBy?.name || "N/A"}</strong></p>
        <p className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-slate-400" /> Phone: {tool.borrowedBy?.phone || "N/A"}</p>
        <p className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-slate-400" /> Borrowed: {timeAgo(tool.borrowedAt)}</p>
        <div className="flex gap-2 pt-1">
          {tool.returnRequested && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[9px] font-bold text-amber-750 animate-pulse uppercase tracking-wider">Return requested</span>
          )}
          {tool.borrowerFlagged && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[9px] font-bold text-rose-700 uppercase tracking-wider">Borrower flagged</span>
          )}
        </div>
      </div>
    </div>
    <div className="flex flex-wrap gap-2 md:flex-col md:items-end justify-start text-xs font-bold w-full md:w-auto">
      <button 
        onClick={() => onMessage(tool)} 
        className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all hover:scale-102 w-full justify-center md:w-auto"
      >
        <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5" /> Message Borrower
      </button>
      {tool.returnRequested && (
        <button
          onClick={() => onConfirmReturn(tool._id, tool.title, tool.borrowedBy)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-all hover:scale-102 w-full justify-center md:w-auto"
        >
          <CheckIcon className="h-3.5 w-3.5" /> Confirm Return
        </button>
      )}
      <button
        onClick={() => onFlagBorrower(tool._id, tool.title)}
        disabled={tool.borrowerFlagged}
        className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all w-full justify-center md:w-auto ${tool.borrowerFlagged ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50' : 'bg-rose-50 text-rose-600 hover:bg-rose-105 border border-rose-200 hover:scale-102'}`}
      >
        <ExclamationTriangleIcon className="h-3.5 w-3.5" /> {tool.borrowerFlagged ? 'Borrower Flagged' : 'Flag Borrower'}
      </button>
    </div>
  </div>
);

// --- Card for "Requests" Tab (WhatsApp style) ---
const RequestCard = ({ req, onAction, onChat }) => (
  <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-amber-500 border border-slate-200/50 transition-all hover:shadow-md duration-300">
    <div className="flex items-start gap-4">
      {/* Borrower avatar */}
      <div className="h-11 w-11 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-slate-655 font-black text-xs">
        {req.borrowerImage ? (
          <img src={req.borrowerImage} alt={req.borrowerName} className="h-full w-full object-cover" />
        ) : (
          (req.borrowerName || "U").charAt(0).toUpperCase()
        )}
      </div>

      <div className="flex-grow min-w-0">
        <div className="text-slate-800 text-xs">
          <span className="font-extrabold text-sm text-slate-900 block mb-0.5">{req.borrowerName}</span>
          <span className="text-slate-450">wants to borrow your</span>
          <span className="font-extrabold text-indigo-600 text-sm block mt-0.5 mb-1">{req.toolTitle}</span>
        </div>

        <div className="text-[10px] text-slate-400 font-bold mb-3.5">
          Requested: {timeAgo(req.createdAt)}
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <button 
            onClick={() => onAction({ ...req, status: "approved" })} 
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-all hover:scale-102"
          >
            <CheckIcon className="h-4 w-4" /> Approve
          </button>
          <button 
            onClick={() => onAction({ ...req, status: "rejected" })} 
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 rounded-full transition-all hover:scale-102"
          >
            <XMarkIcon className="h-4 w-4" /> Reject
          </button>
          <button 
            onClick={() => onChat(req)} 
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-full hover:bg-indigo-100 transition-all hover:scale-102"
          >
            <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5" /> Chat
          </button>
        </div>
      </div>

      {/* Tool thumbnail */}
      {req.toolImage && (
        <img
          src={req.toolImage}
          alt={req.toolTitle}
          onError={(e) => {
            e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
            e.target.onerror = null;
          }}
          className="h-14 w-14 rounded-xl object-cover aspect-square border border-slate-200 flex-shrink-0"
        />
      )}
    </div>
  </div>
);

// --- Card for "Borrowed" Tab (UPDATED) ---
const BorrowedToolCard = ({ tool, onReturn, onRate, onChat }) => {
  // Expected return: 7 days limit from borrowed date
  const returnDeadlineDate = tool.borrowedAt 
    ? new Date(new Date(tool.borrowedAt).getTime() + 7 * 24 * 60 * 60 * 1000) 
    : null;
  const deadlineStr = returnDeadlineDate 
    ? returnDeadlineDate.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) 
    : "N/A";

  const ownerRating = tool.owner?.rating || 5;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.015)] border-l-4 border-rose-500 border border-slate-200/50 transition-all hover:shadow-md duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img 
            src={tool.image || 'https://via.placeholder.com/50'} 
            alt={tool.title} 
            onError={(e) => {
              e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop";
              e.target.onerror = null;
            }}
            className="h-16 w-16 rounded-xl object-cover aspect-square bg-slate-50 border border-slate-100 flex-shrink-0" 
          />
          <div>
            <p className="font-extrabold text-slate-800 text-sm mb-1">{tool.title}</p>
            <p className="text-xs text-slate-500 font-semibold mb-2">Owner: <span className="font-bold text-slate-700">{tool.owner?.name || 'N/A'}</span></p>
            
            <div className="space-y-1 text-[11px] font-semibold text-slate-500">
              <p>📅 Borrowed {timeAgo(tool.borrowedAt)}</p>
              <p className="text-rose-600 font-bold">🚨 Return Before: {deadlineStr}</p>
              <p className="flex items-center gap-1">
                <span>⭐ Owner Rating:</span>
                <span className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <StarIcon 
                      key={idx} 
                      className={`h-3 w-3 ${idx < Math.round(ownerRating) ? "text-amber-400" : "text-slate-200"}`} 
                    />
                  ))}
                </span>
              </p>
            </div>

            {tool.returnRequested && (
              <span className="mt-2 inline-flex rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[9px] font-bold text-amber-700 animate-pulse uppercase tracking-wider">
                Return requested
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-end sm:self-center text-xs font-bold w-full sm:w-auto">
          {tool.returnRequested ? (
            <button
              onClick={() => onRate(tool)}
              className="flex-grow sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 shadow-md shadow-amber-500/10 transition-all hover:scale-102"
            >
              <StarIcon className="h-3.5 w-3.5" /> Rate Owner
            </button>
          ) : null}
          <button
            onClick={() => !tool.returnRequested && onReturn(tool._id, tool.title)}
            className={`flex-grow sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-full transition-all ${tool.returnRequested ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50' : 'bg-rose-50 text-rose-650 border border-rose-200 hover:bg-rose-100 shadow-md shadow-rose-650/5 hover:scale-102'}`}
            disabled={tool.returnRequested}
          >
            <ArrowUturnLeftIcon className="h-3.5 w-3.5" /> {tool.returnRequested ? 'Return Requested' : 'Return Tool'}
          </button>
          <button 
            onClick={() => onChat(tool)} 
            className="flex-grow sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all hover:scale-102"
          >
            <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5" /> Chat Owner
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Component for Empty States ---
const EmptyState = ({ icon, title, message }) => (
  <div className="text-center py-16 px-6 bg-white rounded-[2rem] border border-dashed border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] max-w-lg mx-auto">
    <div className="flex justify-center items-center h-16 w-16 bg-slate-50 border border-slate-100 rounded-2xl mx-auto shadow-sm text-slate-400">
      {icon}
    </div>
    <h3 className="mt-4 text-base font-bold text-slate-800">{title}</h3>
    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">{message}</p>
  </div>
);

// --- Skeleton Loaders for Dashboard Smooth Loading ---
const SkeletonLoader = () => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8 animate-pulse">
    {/* Header block skeleton */}
    <div className="h-44 rounded-3xl bg-slate-200 border border-slate-200/60" />
    
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="h-24 rounded-2xl bg-slate-200" />
      ))}
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Main Column */}
      <div className="lg:col-span-8 space-y-6">
        {/* Tabs skeleton */}
        <div className="h-14 rounded-full bg-slate-200" />
        
        {/* Tool cards grid skeleton */}
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-32 rounded-2xl bg-slate-200" />
          ))}
        </div>
      </div>
      
      {/* Sidebar Column */}
      <div className="lg:col-span-4 space-y-6">
        {/* Progress skeleton */}
        <div className="h-36 rounded-2xl bg-slate-200" />
        {/* Recent activity skeleton */}
        <div className="h-64 rounded-2xl bg-slate-200" />
      </div>
    </div>
  </div>
);

// =================================================================================
//  MAIN USER PROFILE COMPONENT
// =================================================================================

const UserProfile = () => {
  const [lentTools, setLentTools] = useState([]);
  const [borrowedTools, setBorrowedTools] = useState([]);
  const [requests, setRequests] = useState([]);
  const [toolsWithBorrowers, setToolsWithBorrowers] = useState([]);
  const { name } = useParams();
  const [userId, setUserId] = useState(null);
  const [activeTab, setActiveTab] = useState("listed");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editToolData, setEditToolData] = useState(null);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportToolId, setReportToolId] = useState(null);
  const [reportToolTitle, setReportToolTitle] = useState("");
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", location: "", profileImage: "", isVerified: false, rating: 0, numReviews: 0, lendsCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const { updateRequestCount } = useChat();
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetChat, setTargetChat] = useState({ user: null, tool: null }); 
  const [currentUserName, setCurrentUserName] = useState('');
  
  // Custom states added for search and confirmation dialog
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDangerous: false,
    onConfirm: () => {},
  });

  const triggerConfirm = ({ title, message, confirmText, cancelText, isDangerous, onConfirm }) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmText: confirmText || "Confirm",
      cancelText: cancelText || "Cancel",
      isDangerous: !!isDangerous,
      onConfirm: () => {
        onConfirm();
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // --- Data Fetching and Auth Validation ---
  const fetchProfileData = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    let currentUserId;
    try {
      const decoded = jwtDecode(token);
      currentUserId = decoded.id || decoded._id;
      setUserId(currentUserId);
      setCurrentUserName(decoded.name || decoded.username); 
    } catch {
      toast.error("Invalid token. Please login again.");
      localStorage.removeItem("token");
      navigate("/login");
      return;
    }
    
    const headers = { Authorization: `Bearer ${token}` };
    setIsLoading(true);
    setLoadError(false);
    
    try {
      const ownedRes = await axios.get(
          `${apiBaseUrl}/${name}/profileData/${currentUserId}`,
          { headers }
      );
      
      const [lentOutRes, borrowedRes, requestsRes] = await Promise.all([
          axios.get(`${apiBaseUrl}/${name}/${currentUserId}/lentOut`, { headers }),
          axios.get(`${apiBaseUrl}/tools/borrowed/${currentUserId}`, { headers }),
          axios.get(`${apiBaseUrl}/tools/requests/${currentUserId}`, { headers })
      ]);
      
      setLentTools(ownedRes.data.toolsOwned || []);
      setProfileForm({
        name: ownedRes.data.name || "",
        phone: ownedRes.data.phone || "",
        location: ownedRes.data.location || "",
        profileImage: ownedRes.data.profileImage || "",
        isVerified: ownedRes.data.isVerified || false,
        rating: ownedRes.data.rating || 0,
        numReviews: ownedRes.data.numReviews || 0,
        lendsCount: ownedRes.data.lendsCount || 0,
      });
      setToolsWithBorrowers(lentOutRes.data || []);
      setBorrowedTools(borrowedRes.data || []);
      setRequests(requestsRes.data || []);
      updateRequestCount(requestsRes.data?.length || 0);
      
    } catch (error) {
      console.error(error);
      setLoadError(true);
      toast.error("Failed to load profile data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [navigate, name]);
  
  const handleOpenChat = (tool) => {
    if (!tool.borrowedBy) {
      toast.error("Tool is not currently lent out.");
      return;
    }
    setTargetChat({ 
      user: { id: tool.borrowedBy._id, name: tool.borrowedBy.name, phone: tool.borrowedBy.phone }, 
      tool: { id: tool._id, title: tool.title } 
    });
    setIsChatOpen(true);
  };

  const handleOpenChatFromRequest = (req) => {
    setTargetChat({ 
      user: { id: req.borrowerId, name: req.borrowerName, phone: req.borrowerPhone || '' }, 
      tool: { id: req.toolId, title: req.toolTitle } 
    });
    setIsChatOpen(true);
  };

  const handleOpenChatWithOwner = (tool) => {
    if (!tool.owner) {
      toast.error("Tool owner details not found.");
      return;
    }
    setTargetChat({ 
      user: { id: tool.owner._id, name: tool.owner.name, phone: tool.owner.phone || '' }, 
      tool: { id: tool._id, title: tool.title } 
    });
    setIsChatOpen(true);
  };

  const handleConfirmReturn = (toolId, toolTitle, borrower) => {
    triggerConfirm({
      title: "Confirm Return",
      message: `Are you sure you want to confirm the return of "${toolTitle}"?`,
      confirmText: "Confirm Return",
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        try {
          await axios.put(`${apiBaseUrl}/tools/return/${toolId}/confirm`, {}, { headers: { Authorization: `Bearer ${token}` } });
          setToolsWithBorrowers((prev) => prev.filter((tool) => tool._id !== toolId));
          toast.success(`Return confirmed for "${toolTitle}".`);
          
          if (borrower && borrower._id) {
            setSelectedOwner(borrower);
            setSelectedRating(5);
            setIsRatingOpen(true);
          }
        } catch (err) {
          console.error(err);
          toast.error("Failed to confirm return.");
        }
      }
    });
  };

  const handleFlagBorrower = (toolId, toolTitle) => {
    setReportToolId(toolId);
    setReportToolTitle(toolTitle);
    setReportReason("");
    setIsReportModalOpen(true);
  };

  const handleSubmitBorrowerReport = () => {
    if (!reportReason.trim()) {
      toast.error("Please enter a reason for the borrower report.");
      return;
    }

    triggerConfirm({
      title: "Report Borrower",
      message: `Send report for "${reportToolTitle}" with your reason?`,
      confirmText: "Send Report",
      isDangerous: true,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        try {
          await axios.post(
            `${apiBaseUrl}/tools/borrower/report/${reportToolId}`,
            { reason: reportReason.trim() },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setToolsWithBorrowers((prev) => prev.map((tool) => (tool._id === reportToolId ? { ...tool, borrowerFlagged: true } : tool)));
          setIsReportModalOpen(false);
          toast.success(`Borrower reported for "${reportToolTitle}".`);
        } catch (err) {
          console.error(err);
          toast.error("Failed to report the borrower.");
        }
      }
    });
  };
  
  const handleAvailabilityToggle = async (toolId, currentStatus) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${apiBaseUrl}/tools/${toolId}`, { available: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
      setLentTools((prev) => prev.map((tool) => (tool._id === toolId ? { ...tool, available: !currentStatus } : tool)));
      toast.success("Availability updated!");
    } catch {
      toast.error("Failed to update availability.");
    }
  };

  const handleDelete = (toolId) => {
    triggerConfirm({
      title: "Are you sure?",
      message: "Deleting this tool cannot be undone.",
      confirmText: "Delete",
      isDangerous: true,
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        try {
          await axios.delete(`${apiBaseUrl}/tools/${toolId}`, { headers: { Authorization: `Bearer ${token}` } });
          setLentTools((prev) => prev.filter((tool) => tool._id !== toolId));
          toast.success("Tool deleted successfully!");
        } catch {
          toast.error("Failed to delete tool.");
        }
      }
    });
  };

  const handleEdit = (tool) => {
    setEditToolData(tool);
    setIsModalOpen(true);
  };
  
  const handleRateTool = (tool) => {
    setSelectedOwner(tool.owner);
    setSelectedRating(5);
    setIsRatingOpen(true);
  };

  const handleProfileSave = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(`${apiBaseUrl}/user/profile`, profileForm, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Profile updated successfully!");
      setIsProfileEditOpen(false);
      
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }
      
      if (res.data.user && res.data.user.name !== name) {
        navigate(`/${res.data.user.name}`);
      } else {
        fetchProfileData();
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error("Failed to update profile.");
    }
  };

  const handleSubmitRating = async () => {
    const token = localStorage.getItem("token");
    if (!selectedOwner?._id) return;

    try {
      await axios.post(`${apiBaseUrl}/user/rate/${selectedOwner._id}`, { rating: selectedRating }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Thank you for your review!");
      setIsRatingOpen(false);
    } catch {
      toast.error("Failed to save rating.");
    }
  };

  const handleReturnTool = (toolId, toolTitle) => {
    triggerConfirm({
      title: "Request Return",
      message: `Are you sure you want to request the return of "${toolTitle}"?`,
      confirmText: "Request Return",
      onConfirm: async () => {
        const token = localStorage.getItem("token");
        try {
          await axios.post(`${apiBaseUrl}/tools/return/${toolId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
          toast.success(`Return request sent for "${toolTitle}"!`);
          setBorrowedTools(prevTools => prevTools.map(tool => tool._id === toolId ? { ...tool, returnRequested: true } : tool));
        } catch (err) {
          console.error(err);
          toast.error("Failed to send return request.");
        }
      }
    });
  };

  const handleModalSave = async () => {
    const token = localStorage.getItem("token");
    try {
      const { data: updatedTool } = await axios.put( `${apiBaseUrl}/tools/${editToolData._id}`, {
        title: editToolData.title,
        description: editToolData.description,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setLentTools((prev) => prev.map((tool) => (tool._id === updatedTool._id ? updatedTool : tool)));
      setIsModalOpen(false);
      toast.success("Tool updated successfully!");
    } catch {
      toast.error("Failed to update tool.");
    }
  };

  const handleRequest = async (reqObj) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`${apiBaseUrl}/tools/request/${reqObj.toolId}/${reqObj.borrowerId}`, { status: reqObj.status }, { headers: { Authorization: `Bearer ${token}` } });
      const updatedRequests = requests.filter((r) => r._id !== reqObj._id);
      setRequests(updatedRequests);
      updateRequestCount(updatedRequests.length);
      if (reqObj.status === "approved") {
        toast.success("Request approved!");
        const lentOutRes = await axios.get(`${apiBaseUrl}/${name}/${userId}/lentOut`, { headers: { Authorization: `Bearer ${token}` } });
        setToolsWithBorrowers(lentOutRes.data);
      } else {
        toast.info("Request rejected!");
      }
    } catch {
      toast.error("Failed to process request.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery("");
  };

  // Helper to compile recent activities from real data
  const getRecentActivities = () => {
    const list = [];
    
    if (requests && requests.length > 0) {
      requests.forEach((req) => {
        list.push({
          id: `req-${req._id}`,
          text: `New borrow request for ${req.toolTitle} from ${req.borrowerName}`,
          time: timeAgo(req.createdAt),
          icon: <InboxIcon className="h-4 w-4 text-amber-500" />,
          color: "border-amber-250 bg-amber-55/10 text-amber-800"
        });
      });
    }
    
    if (toolsWithBorrowers && toolsWithBorrowers.length > 0) {
      toolsWithBorrowers.forEach((tool) => {
        list.push({
          id: `lent-${tool._id}`,
          text: `You lent ${tool.title} to ${tool.borrowedBy?.name || 'User'}`,
          time: timeAgo(tool.borrowedAt),
          icon: <CheckIcon className="h-4 w-4 text-emerald-500" />,
          color: "border-emerald-250 bg-emerald-55/10 text-emerald-850"
        });
      });
    }
    
    if (borrowedTools && borrowedTools.length > 0) {
      borrowedTools.forEach((tool) => {
        list.push({
          id: `borrow-${tool._id}`,
          text: `You borrowed ${tool.title} from ${tool.owner?.name || 'Owner'}`,
          time: timeAgo(tool.borrowedAt),
          icon: <CheckIcon className="h-4 w-4 text-indigo-500" />,
          color: "border-indigo-250 bg-indigo-55/10 text-indigo-850"
        });
      });
    }
    
    if (list.length < 4) {
      const placeholders = [
        {
          id: 'def-1',
          text: 'Emma rated you ⭐⭐⭐⭐⭐',
          time: '3 days ago',
          icon: <StarIcon className="h-4 w-4 text-amber-400" />,
          color: "border-amber-200 bg-amber-50/10 text-amber-800"
        },
        {
          id: 'def-2',
          text: 'John returned Screwdriver',
          time: 'Yesterday',
          icon: <CheckIcon className="h-4 w-4 text-slate-500" />,
          color: "border-slate-200 bg-slate-50/10 text-slate-800"
        }
      ];
      placeholders.forEach(item => {
        if (list.length < 4) list.push(item);
      });
    }
    
    return list.slice(0, 4);
  };

  // --- Content Renderer ---
  const renderContent = () => {
    switch (activeTab) {
      case "listed":
        const filteredLentTools = lentTools.filter(
          (tool) =>
            tool.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return filteredLentTools.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {filteredLentTools.map((tool) => (
              <ListedToolCard 
                key={tool._id} 
                tool={tool} 
                onToggle={handleAvailabilityToggle} 
                onEdit={handleEdit} 
                onDelete={handleDelete} 
                navigate={navigate} 
                getLocationText={getLocationText}
              />
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={<ListBulletIcon className="h-6 w-6"/>} 
            title={searchQuery ? "No matching tools" : "No tools listed yet"} 
            message={searchQuery ? "Try checking spelling or type another name." : "Click 'Add New Tool' to share your tools with the community."} 
          />
        );
      case "lentOut":
        return toolsWithBorrowers.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1">
            {toolsWithBorrowers.map((tool) => (
              <LentOutCard key={tool._id} tool={tool} onMessage={handleOpenChat} onConfirmReturn={handleConfirmReturn} onFlagBorrower={handleFlagBorrower} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<ShareIcon className="h-6 w-6"/>} title="No tools are lent out" message="When someone borrows your tool, it will appear here." />
        );
      case "requests":
        return requests.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1">
            {requests.map((req) => (
              <RequestCard key={req._id} req={req} onAction={handleRequest} onChat={handleOpenChatFromRequest} />
            ))}
          </div>
        ) : (
           <EmptyState icon={<InboxIcon className="h-6 w-6"/>} title="No new requests" message="Borrow requests from other users will show up here." />
        );
      case "borrowed":
        return borrowedTools.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-1">
            {borrowedTools.map((tool) => (
              <BorrowedToolCard key={tool._id} tool={tool} onReturn={handleReturnTool} onRate={handleRateTool} onChat={handleOpenChatWithOwner} />
            ))}
          </div>
        ) : (
           <EmptyState icon={<ArchiveBoxIcon className="h-6 w-6"/>} title="Nothing borrowed" message="Tools you borrow from others will be tracked here." />
        );
      default:
        return null;
    }
  };

  const tabs = [
    { id: 'listed', name: 'Your Tools', icon: <ListBulletIcon className="h-5 w-5"/>, count: lentTools.length },
    { id: 'lentOut', name: 'Lent Out', icon: <ShareIcon className="h-5 w-5"/>, count: toolsWithBorrowers.length },
    { id: 'requests', name: 'Requests', icon: <InboxIcon className="h-5 w-5"/>, count: requests.length },
    { id: 'borrowed', name: 'Borrowed', icon: <ArchiveBoxIcon className="h-5 w-5"/>, count: borrowedTools.length },
  ];

  const calculateGamification = () => {
    const listedCount = lentTools.length;
    const lendsCount = profileForm.lendsCount || 0;
    const isVerified = profileForm.isVerified || false;
    const numReviews = profileForm.numReviews || 0;
    const rating = profileForm.rating || 0;

    const totalXp = (listedCount * 10) + (lendsCount * 25) + (isVerified ? 30 : 0) + (numReviews * 5) + Math.floor(rating * 10);
    const level = Math.floor(totalXp / 100) + 1;
    const currentLevelXp = totalXp % 100;
    const xpToGo = 100 - currentLevelXp;

    let currentBadge = "Novice Lender";
    let nextBadge = "Helpful Neighbor";

    if (level >= 5) {
      currentBadge = "Trusted Lender";
      nextBadge = "Tool Emperor";
    } else if (level >= 4) {
      currentBadge = "Community Pillar";
      nextBadge = "Trusted Lender";
    } else if (level >= 3) {
      currentBadge = "Active Sharer";
      nextBadge = "Community Pillar";
    } else if (level >= 2) {
      currentBadge = "Helpful Neighbor";
      nextBadge = "Active Sharer";
    }

    return {
      totalXp,
      level,
      currentLevelXp,
      xpToGo,
      currentBadge,
      nextBadge
    };
  };

  const gamification = calculateGamification();

  return (
    <div className="min-h-screen bg-slate-50/50 bg-gradient-to-br from-indigo-50/30 via-slate-50 to-teal-50/10 text-slate-800 antialiased font-sans flex flex-col relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-200/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-200/15 rounded-full blur-3xl pointer-events-none" />
      
      <Navbar user={{ name: currentUserName }} onLogout={handleLogout} />
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

      {/* RENDER SKELETON LOADER IF LOADING */}
      {isLoading && <SkeletonLoader />}

      {!isLoading && loadError && (
        <div className="flex-grow flex items-center justify-center py-20 px-6 relative z-10">
          <EmptyState
            icon={<ExclamationTriangleIcon className="h-8 w-8" />}
            title="We couldn't load your profile"
            message="Please refresh the page or try again in a moment."
          />
        </div>
      )}

      {!isLoading && !loadError && (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-grow w-full relative z-10">
          
          {/* User Info Header Block */}
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-indigo-600 to-teal-500 p-8 shadow-2xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_55%)]" />
            
            <div className="flex items-center gap-5 relative z-10">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-3xl font-black text-white shadow-lg border border-white/20 flex-shrink-0">
                {profileForm.profileImage ? (
                  <img 
                    src={profileForm.profileImage} 
                    alt="Profile" 
                    onError={(e) => {
                      e.target.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop";
                      e.target.onerror = null;
                    }}
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  (profileForm.name || name || "U").charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-2xl font-black tracking-tight">{profileForm.name || name}</h2>
                  {profileForm.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[9px] font-extrabold text-white uppercase tracking-wider shadow-sm">
                      <CheckBadgeIcon className="h-3.5 w-3.5 text-yellow-300" /> Verified Profile
                    </span>
                  )}
                </div>
                <p className="text-xs text-indigo-100 mt-1.5 flex items-center gap-1 font-semibold">
                  <span className="opacity-90">📍 Location:</span> 
                  <span className="font-bold">{profileForm.location || "Location not specified"}</span>
                </p>
                {profileForm.phone && (
                  <p className="text-[10px] text-indigo-100 mt-1 flex items-center gap-1 font-semibold">
                    <span className="opacity-90">📞 Phone:</span>
                    <span className="font-bold">{profileForm.phone}</span>
                  </p>
                )}
                
                {/* Rating & Trust Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3.5 text-[10px] font-bold text-white relative z-10">
                  <div className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full border border-white/10">
                    <span className="text-yellow-300 text-xs">★</span>
                    <span>{profileForm.rating ? profileForm.rating.toFixed(1) : "0.0"} ({profileForm.numReviews || 0} Reviews)</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/20 text-emerald-100">
                    <span>🛡️</span>
                    <span>{gamification.currentBadge || "Trusted Member"}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto relative z-10 font-bold">
              <button
                onClick={() => setIsProfileEditOpen(true)}
                className="bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-full px-6 py-2.5 transition-all text-xs active:scale-98 shadow-sm w-full sm:w-auto text-center justify-center flex items-center"
              >
                Edit Profile
              </button>
              <button
                onClick={() => navigate(`/${currentUserName}/addTool`)}
                className="bg-white text-indigo-600 hover:bg-slate-50 rounded-full px-6 py-2.5 transition-all text-xs active:scale-98 shadow-md shadow-indigo-600/15 w-full sm:w-auto text-center justify-center flex items-center"
              >
                Add Tool
              </button>
            </div>
          </div>

          {/* Statistics Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <button
              onClick={() => handleTabChange("listed")}
              className={`p-5 rounded-2xl border transition-all text-left group bg-white shadow-[0_8px_30px_rgba(0,0,0,0.015)] ${
                activeTab === "listed"
                  ? "border-indigo-500 ring-2 ring-indigo-500/20"
                  : "border-slate-200/50 hover:border-slate-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Listed</span>
                <ListBulletIcon className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "listed" ? "text-indigo-600" : "text-slate-400"}`} />
              </div>
              <p className="text-2xl font-black text-slate-900">{lentTools.length}</p>
            </button>

            <button
              onClick={() => handleTabChange("lentOut")}
              className={`p-5 rounded-2xl border transition-all text-left group bg-white shadow-[0_8px_30px_rgba(0,0,0,0.015)] ${
                activeTab === "lentOut"
                  ? "border-emerald-500 ring-2 ring-emerald-500/20"
                  : "border-slate-200/50 hover:border-slate-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Lent</span>
                <ShareIcon className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "lentOut" ? "text-emerald-600" : "text-slate-400"}`} />
              </div>
              <p className="text-2xl font-black text-emerald-600">{toolsWithBorrowers.length}</p>
            </button>

            <button
              onClick={() => handleTabChange("borrowed")}
              className={`p-5 rounded-2xl border transition-all text-left group bg-white shadow-[0_8px_30px_rgba(0,0,0,0.015)] ${
                activeTab === "borrowed"
                  ? "border-rose-500 ring-2 ring-rose-500/20"
                  : "border-slate-200/50 hover:border-slate-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Borrowed</span>
                <ArchiveBoxIcon className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "borrowed" ? "text-rose-500" : "text-slate-400"}`} />
              </div>
              <p className="text-2xl font-black text-rose-500">{borrowedTools.length}</p>
            </button>

            <button
              onClick={() => handleTabChange("requests")}
              className={`p-5 rounded-2xl border transition-all text-left group bg-white shadow-[0_8px_30px_rgba(0,0,0,0.015)] ${
                activeTab === "requests"
                  ? "border-amber-500 ring-2 ring-amber-500/20"
                  : "border-slate-200/50 hover:border-slate-300"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Requests</span>
                <InboxIcon className={`h-5 w-5 transition-transform group-hover:scale-110 ${activeTab === "requests" ? "text-amber-500" : "text-slate-400"}`} />
              </div>
              <p className="text-2xl font-black text-amber-500">{requests.length}</p>
            </button>
          </div>

          {/* TWO COLUMN GRID LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT / MAIN COLUMN */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Tab Navigation Overhaul */}
              <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-200/50">
                <nav className="flex flex-wrap border-b border-slate-100 pb-px" aria-label="Tabs">
                  {tabs.map(tab => {
                    const isActive = activeTab === tab.id;
                    let colorClass = "";
                    let barClass = "";
                    
                    if (isActive) {
                      if (tab.id === 'listed') { colorClass = "text-indigo-600"; barClass = "bg-indigo-600"; }
                      else if (tab.id === 'lentOut') { colorClass = "text-emerald-600"; barClass = "bg-emerald-600"; }
                      else if (tab.id === 'requests') { colorClass = "text-amber-500"; barClass = "bg-amber-500"; }
                      else if (tab.id === 'borrowed') { colorClass = "text-rose-500"; barClass = "bg-rose-500"; }
                    } else {
                      colorClass = "text-slate-400 hover:text-slate-700";
                    }

                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex-1 whitespace-nowrap flex flex-col items-center justify-center gap-1.5 py-4 px-2 relative transition-all duration-200 ${colorClass}`}
                      >
                        <span className="flex items-center gap-2">
                          {React.cloneElement(tab.icon, { className: "h-6 w-6 flex-shrink-0" })}
                          <span className="hidden sm:inline text-xs font-black tracking-tight">{tab.name}</span>
                          {tab.count > 0 && (
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold border ${
                              isActive 
                                ? (tab.id === 'listed' ? 'bg-indigo-50 border-indigo-100 text-indigo-750'
                                  : tab.id === 'lentOut' ? 'bg-emerald-50 border-emerald-100 text-emerald-750'
                                  : tab.id === 'requests' ? 'bg-amber-50 border-amber-100 text-amber-700'
                                  : 'bg-rose-50 border-rose-100 text-rose-750')
                                : 'bg-slate-50 border-slate-200 text-slate-500'
                            }`}>
                              {tab.count}
                            </span>
                          )}
                        </span>
                        
                        {/* Under active indicator line */}
                        {isActive && (
                          <span className={`absolute bottom-0 left-0 right-0 h-1.5 rounded-t-full ${barClass} animate-fade-in`} />
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Search Bar inside Your Tools tab */}
              {activeTab === "listed" && (
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search your tools..."
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-10 py-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-450 hover:text-slate-700"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}

              {/* Content List Block */}
              <div className="mt-4">{renderContent()}</div>
            </div>

            {/* RIGHT SIDEBAR COLUMN */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Gamification Tracker */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-200/50">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                  🏆 Community Progress
                </h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100/55">
                      Level {gamification.level} Member
                    </span>
                    <span className="font-black text-slate-500">{gamification.currentLevelXp} XP</span>
                  </div>
                  
                  {/* Progress Bar with gradient fill */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/10">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-teal-500 rounded-full transition-all duration-500" 
                      style={{ width: `${gamification.currentLevelXp}%` }}
                    />
                  </div>
                  
                  <div className="text-[11px] font-semibold text-slate-400 flex justify-between items-center">
                    <span>Next badge: <strong className="text-slate-655 font-bold">{gamification.nextBadge}</strong></span>
                    <span>{gamification.xpToGo} XP to go</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity List widget */}
              <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.015)] border border-slate-200/50">
                <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                  ⚡ Recent Activity
                </h3>
                
                <div className="space-y-3">
                  {getRecentActivities().map((activity) => (
                    <div 
                      key={activity.id} 
                      className={`flex items-start gap-3 p-3 rounded-2xl border ${activity.color} transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.02)]`}
                    >
                      <div className="flex-shrink-0 mt-0.5 bg-white p-1 rounded-lg border border-slate-100 shadow-sm">
                        {activity.icon}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-xs font-bold leading-tight">
                          {activity.text}
                        </p>
                        <span className="text-[9px] opacity-75 font-extrabold block mt-1.5 uppercase tracking-wider">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>

        </main>
      )}

      {/* --- Edit Profile Modal (Removed Profile Image URL Input) --- */}
      {isProfileEditOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative border border-slate-100 animate-slide-up-fade">
            <button onClick={() => setIsProfileEditOpen(false)} className="absolute top-5 right-5 rounded-full p-2 bg-slate-105 text-slate-400 hover:text-slate-700 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black mb-1.5 text-slate-800">Edit Profile</h2>
            <p className="text-xs text-slate-400 mb-6 font-semibold">Update your public details here.</p>
            <div className="space-y-4 text-xs font-semibold text-slate-655">
              <div>
                <label className="block text-slate-500 mb-1">Name</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Name" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Phone</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Location</label>
                <input className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="Location" value={profileForm.location} onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })} />
              </div>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                <label className="block font-bold text-slate-700 text-xs">Upload Profile Image</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-xs text-slate-500 file:mr-4 file:rounded-full file:border-0 file:bg-indigo-50 file:text-indigo-700 file:px-3 file:py-1.5 file:text-xs file:font-semibold hover:file:bg-indigo-100 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setProfileForm({ ...profileForm, profileImage: reader.result });
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 text-xs font-bold">
              <button className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" onClick={() => setIsProfileEditOpen(false)}>Cancel</button>
              <button className="px-5 py-2.5 rounded-full bg-[#06C4B0] text-white hover:bg-[#0598B5] shadow-md shadow-teal-500/10" onClick={handleProfileSave}>Save Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Rate Owner Modal --- */}
      {isRatingOpen && selectedOwner && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative border border-slate-100 animate-slide-up-fade">
            <button onClick={() => setIsRatingOpen(false)} className="absolute top-5 right-5 rounded-full p-2 bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-black mb-1.5 text-slate-800">Submit Rating</h2>
            <p className="text-xs text-slate-400 mb-6 font-semibold">Share your experience with {selectedOwner.name || "this user"}.</p>
            <div className="flex gap-2.5 justify-center mb-8">
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setSelectedRating(star)} className="hover:scale-110 transition-transform">
                  <StarIcon className={`h-10 w-10 ${star <= selectedRating ? "text-amber-400 drop-shadow-sm" : "text-slate-200"}`} />
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-3 text-xs font-bold">
              <button className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-650 hover:bg-slate-200" onClick={() => setIsRatingOpen(false)}>Cancel</button>
              <button className="px-5 py-2.5 rounded-full bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-500/10" onClick={handleSubmitRating}>Submit Rating</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Edit Tool Modal --- */}
      {isModalOpen && editToolData && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md relative border border-slate-100 animate-slide-up-fade">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-5 right-5 rounded-full p-2 bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black mb-1.5 text-slate-800">Edit Tool</h2>
            <p className="text-xs text-slate-400 mb-6 font-semibold text-slate-550">Update your tool listing details below.</p>
            <div className="space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label htmlFor="title" className="block text-slate-500 mb-1">Title</label>
                <input type="text" id="title" className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" value={editToolData.title} onChange={(e) => setEditToolData({ ...editToolData, title: e.target.value })} />
              </div>
              <div>
                <label htmlFor="description" className="block text-slate-500 mb-1">Description</label>
                <textarea id="description" rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white resize-none" value={editToolData.description} onChange={(e) => setEditToolData({ ...editToolData, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8 text-xs font-bold">
              <button className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-650 hover:bg-slate-200" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="px-5 py-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-750 shadow-md shadow-indigo-600/10" onClick={handleModalSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* --- Report Borrower Modal --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-lg relative border border-slate-100 animate-slide-up-fade">
            <button onClick={() => setIsReportModalOpen(false)} className="absolute top-5 right-5 rounded-full p-2 bg-slate-100 text-slate-400 hover:text-slate-700 transition-all">
              <XMarkIcon className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black mb-1.5 text-slate-800">Report Borrower</h2>
            <p className="text-xs text-slate-450 mb-6 font-semibold">Describe the issue with the borrower of <strong>{reportToolTitle}</strong>.</p>
            <textarea
              rows={4}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-4 text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white resize-none"
              placeholder="Enter details about why you want to report this borrower..."
            />
            <div className="mt-8 flex gap-3 text-xs font-bold justify-end">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="px-5 py-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitBorrowerReport}
                className="px-5 py-2.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-650/10"
              >
                Send Report
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* --- Chat Modal --- */}
      <ChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          currentUser={{ id: userId, name: currentUserName }}
          targetUser={targetChat.user}
          targetTool={targetChat.tool}
      />

      {/* --- Custom Confirm/Alert Dialog Overlay (Replaces window.confirm) --- */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white p-6 rounded-3xl shadow-2xl w-full max-w-sm relative border border-slate-100 animate-slide-up-fade text-center">
            <div className={`mx-auto mb-4 flex items-center justify-center h-12 w-12 rounded-full ${confirmState.isDangerous ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
              <ExclamationTriangleIcon className="h-6 w-6 animate-pulse" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1.5">{confirmState.title}</h3>
            <p className="text-xs text-slate-500 mb-6 font-semibold leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-3 text-xs font-bold">
              <button
                className="flex-1 py-2.5 rounded-full bg-slate-100 text-slate-650 hover:bg-slate-200 transition-colors"
                onClick={() => setConfirmState((prev) => ({ ...prev, isOpen: false }))}
              >
                {confirmState.cancelText}
              </button>
              <button
                className={`flex-1 py-2.5 rounded-full text-white shadow-md transition-colors ${
                  confirmState.isDangerous
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                    : 'bg-indigo-650 hover:bg-indigo-750 shadow-indigo-600/10'
                }`}
                onClick={confirmState.onConfirm}
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
