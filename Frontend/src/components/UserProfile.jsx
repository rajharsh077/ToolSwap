import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// --- Custom Imports for Chat ---
import ChatModal from './ChatModal'; 

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
  ChatBubbleBottomCenterTextIcon, // Icon for chat button
} from "@heroicons/react/24/outline";

// =================================================================================
//  HELPER COMPONENTS
// =================================================================================

// --- Card for "Your Tools" Tab ---
const ListedToolCard = ({ tool, onToggle, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAvailable = tool.available;

  return (
    <div className="bg-white rounded-2xl shadow-lg transition-all hover:shadow-xl">
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <img src={tool.image || 'https://via.placeholder.com/50'} alt={tool.title} className="h-12 w-12 rounded-lg object-cover" />
          <div>
            <p className="font-bold text-slate-800">{tool.title}</p>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isAvailable ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {isAvailable ? "Available" : "On Loan"}
            </span>
          </div>
        </div>
        <ChevronDownIcon className={`h-6 w-6 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
      </div>
      {isExpanded && (
        <div className="border-t border-slate-200 p-4">
          <p className="text-slate-600 mb-4">{tool.description}</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onToggle(tool._id, isAvailable)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors ${
                isAvailable
                  ? "bg-yellow-500 text-white hover:bg-yellow-600"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {isAvailable ? "Mark as Unavailable" : "Mark as Available"}
            </button>
            <button onClick={() => onEdit(tool)} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
              <PencilIcon className="h-4 w-4" /> Edit
            </button>
            <button onClick={() => onDelete(tool._id)} className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
              <TrashIcon className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Card for "Lent Out" Tab (UPDATED with Chat Button) ---
const LentOutCard = ({ tool, onMessage }) => (
  <div className="bg-white p-4 rounded-2xl shadow-lg transition-all hover:shadow-xl flex items-start gap-4 border-l-4 border-[#06C4B0]">
    <img src={tool.image || 'https://via.placeholder.com/50'} alt={tool.title} className="h-16 w-16 rounded-lg object-cover" />
    <div className="flex-1">
      <p className="font-bold text-slate-800">{tool.title}</p>
      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p className="flex items-center gap-2"><UserCircleIcon className="h-4 w-4 text-slate-400" /> Lent to: <strong className="text-slate-800">{tool.borrowedBy?.name || "N/A"}</strong></p>
        <p className="flex items-center gap-2"><PhoneIcon className="h-4 w-4 text-slate-400" /> Phone: {tool.borrowedBy?.phone || "N/A"}</p>
        <p className="flex items-center gap-2"><CalendarDaysIcon className="h-4 w-4 text-slate-400" /> Borrowed on: {tool.borrowedAt ? new Date(tool.borrowedAt).toLocaleDateString() : "N/A"}</p>
      </div>
    </div>
    <button 
      onClick={() => onMessage(tool)} 
      className="flex items-center gap-1 text-sm font-semibold px-4 py-2 rounded-lg bg-[#1E3A8A] text-white hover:bg-[#15275a] transition-colors self-end"
    >
      <ChatBubbleBottomCenterTextIcon className="h-4 w-4" /> Message
    </button>
  </div>
);

// --- Card for "Requests" Tab ---
const RequestCard = ({ req, onAction }) => (
  <div className="bg-white p-4 rounded-2xl shadow-lg transition-all hover:shadow-xl">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <img src={req.toolImage || 'https://via.placeholder.com/50'} alt={req.toolTitle} className="h-12 w-12 rounded-lg object-cover" />
        <p className="text-slate-700">
          <span className="font-bold text-slate-800">{req.borrowerName}</span> wants to borrow <span className="font-bold text-[#06C4B0]">{req.toolTitle}</span>.
        </p>
      </div>
      <div className="flex gap-3 self-end sm:self-center">
        <button onClick={() => onAction({ ...req, status: "approved" })} className="flex items-center gap-2 font-semibold px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
          <CheckIcon className="h-5 w-5" /> Approve
        </button>
        <button onClick={() => onAction({ ...req, status: "rejected" })} className="flex items-center gap-2 font-semibold px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
          <XMarkIcon className="h-5 w-5" /> Reject
        </button>
      </div>
    </div>
  </div>
);

// --- Card for "Borrowed" Tab ---
const BorrowedToolCard = ({ tool, onReturn }) => (
  <div className="bg-white p-4 rounded-2xl shadow-lg transition-all hover:shadow-xl">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <img src={tool.image || 'https://via.placeholder.com/50'} alt={tool.title} className="h-12 w-12 rounded-lg object-cover" />
        <div>
          <p className="font-bold text-slate-800">{tool.title}</p>
          <p className="text-sm text-slate-500">Owner: {tool.owner?.name || 'N/A'}</p>
        </div>
      </div>
      <button
        onClick={() => onReturn(tool._id, tool.title)}
        className="flex items-center gap-2 font-semibold px-4 py-2 bg-[#06C4B0] text-white rounded-lg hover:bg-[#0598B5] transition-colors self-end sm:self-center"
      >
        <ArrowUturnLeftIcon className="h-5 w-5" /> Return Tool
      </button>
    </div>
  </div>
);

// --- Component for Empty States ---
const EmptyState = ({ icon, title, message }) => (
  <div className="text-center py-16 px-6 bg-white rounded-2xl border-2 border-dashed border-slate-200 shadow-md">
    <div className="flex justify-center items-center h-16 w-16 bg-gray-50 rounded-full mx-auto shadow-sm text-slate-400">
      {icon}
    </div>
    <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
    <p className="mt-1 text-slate-500">{message}</p>
  </div>
);

// =================================================================================
//  MAIN USER PROFILE COMPONENT
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
  const navigate = useNavigate();
  
  // ⬅️ CHAT STATE
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [targetChat, setTargetChat] = useState({ user: null, tool: null }); 
  const [currentUserName, setCurrentUserName] = useState('');

  // --- Data Fetching and Auth Validation ---
  useEffect(() => {
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
      
      try {
        // 1. Fetch Profile Data (Owned Tools, Basic Info)
        const ownedRes = await axios.get(
            `http://localhost:3000/${name}/profileData/${currentUserId}`, // ✅ NEW, SAFE ENDPOINT
            { headers }
        );
        
        // 2. Fetch Other Transaction Data concurrently
        const [lentOutRes, borrowedRes, requestsRes] = await Promise.all([
            axios.get(`http://localhost:3000/${name}/${currentUserId}/lentOut`, { headers }),
            axios.get(`http://localhost:3000/tools/borrowed/${currentUserId}`, { headers }),
            axios.get(`http://localhost:3000/tools/requests/${currentUserId}`, { headers })
        ]);
        
        // Update state based on new API responses
        setLentTools(ownedRes.data.toolsOwned || []);
        setToolsWithBorrowers(lentOutRes.data || []);
        setBorrowedTools(borrowedRes.data || []);
        setRequests(requestsRes.data || []);
        
      } catch (error) {
        console.error(error);
        toast.error("Failed to load profile data.");
      }
    };
    fetchProfileData();
  }, [navigate, name]);
  
  // ⬅️ Handler: Open chat modal
  const handleOpenChat = (tool) => {
    // Only allow chat if tool has a borrower (i.e., is lent out)
    if (!tool.borrowedBy) {
      toast.error("Tool is not currently lent out.");
      return;
    }
    setTargetChat({ 
      user: { id: tool.borrowedBy._id, name: tool.borrowedBy.name, phone: tool.borrowedBy.phone }, // Borrower details
      tool: { id: tool._id, title: tool.title } 
    });
    setIsChatOpen(true);
  };
  
  // --- Tool Management Handlers ---
  
  const handleAvailabilityToggle = async (toolId, currentStatus) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`http://localhost:3000/tools/${toolId}`, { available: !currentStatus }, { headers: { Authorization: `Bearer ${token}` } });
      setLentTools((prev) => prev.map((tool) => (tool._id === toolId ? { ...tool, available: !currentStatus } : tool)));
      toast.success("Availability updated!");
    } catch (error) {
      toast.error("Failed to update availability.");
    }
  };

  const handleDelete = async (toolId) => {
    if(!window.confirm("Are you sure you want to delete this tool permanently?")) return;
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`http://localhost:3000/tools/${toolId}`, { headers: { Authorization: `Bearer ${token}` } });
      setLentTools((prev) => prev.filter((tool) => tool._id !== toolId));
      toast.success("Tool deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete tool.");
    }
  };

  const handleEdit = (tool) => {
    setEditToolData(tool);
    setIsModalOpen(true);
  };
  
  const handleReturnTool = async (toolId, toolTitle) => {
    const token = localStorage.getItem("token");
    const confirmed = window.confirm(`Are you sure you want to request the return of "${toolTitle}"?`);
    if (!confirmed) return;

    try {
      await axios.post(`http://localhost:3000/tools/return/${toolId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Return request sent for "${toolTitle}"!`);
      // Optimistically update UI
      setBorrowedTools(prevTools => prevTools.filter(tool => tool._id !== toolId));
    } catch (err) {
      console.error(err);
      toast.error("Failed to send return request.");
    }
  };

  const handleModalSave = async () => {
    const token = localStorage.getItem("token");
    try {
      const { data: updatedTool } = await axios.put( `http://localhost:3000/tools/${editToolData._id}`, {
        title: editToolData.title,
        description: editToolData.description,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setLentTools((prev) => prev.map((tool) => (tool._id === updatedTool._id ? updatedTool : tool)));
      setIsModalOpen(false);
      toast.success("Tool updated successfully!");
    } catch (error) {
      toast.error("Failed to update tool.");
    }
  };

  const handleRequest = async (reqObj) => {
    const token = localStorage.getItem("token");
    try {
      await axios.put(`http://localhost:3000/tools/request/${reqObj.toolId}/${reqObj.borrowerId}`, { status: reqObj.status }, { headers: { Authorization: `Bearer ${token}` } });
      setRequests((prev) => prev.filter((r) => r._id !== reqObj._id));
      if (reqObj.status === "approved") {
        toast.success("Request approved!");
        // Refresh lent-out tools list
        const lentOutRes = await axios.get(`http://localhost:3000/${name}/${userId}/lentOut`, { headers: { Authorization: `Bearer ${token}` } });
        setToolsWithBorrowers(lentOutRes.data);
      } else {
        toast.info("Request rejected!");
      }
    } catch (err) {
      toast.error("Failed to process request.");
    }
  };

  // --- Content Renderer ---
  const renderContent = () => {
    switch (activeTab) {
      case "listed":
        return lentTools.length > 0 ? (
          <div className="space-y-4">
            {lentTools.map((tool) => (
              <ListedToolCard key={tool._id} tool={tool} onToggle={handleAvailabilityToggle} onEdit={handleEdit} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<ListBulletIcon className="h-8 w-8"/>} title="No tools listed yet" message="Click 'Add New Tool' to share your tools with the community." />
        );
      case "lentOut":
        return toolsWithBorrowers.length > 0 ? (
          <div className="space-y-4">
            {toolsWithBorrowers.map((tool) => (
              <LentOutCard key={tool._id} tool={tool} onMessage={handleOpenChat} />
            ))}
          </div>
        ) : (
           <EmptyState icon={<ShareIcon className="h-8 w-8"/>} title="No tools are lent out" message="When someone borrows your tool, it will appear here." />
        );
      case "requests":
        return requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((req) => (
              <RequestCard key={req._id} req={req} onAction={handleRequest} />
            ))}
          </div>
        ) : (
           <EmptyState icon={<InboxIcon className="h-8 w-8"/>} title="No new requests" message="Borrow requests from other users will show up here." />
        );
      case "borrowed":
        return borrowedTools.length > 0 ? (
          <div className="space-y-4">
            {borrowedTools.map((tool) => (
              <BorrowedToolCard key={tool._id} tool={tool} onReturn={handleReturnTool} />
            ))}
          </div>
        ) : (
           <EmptyState icon={<ArchiveBoxIcon className="h-8 w-8"/>} title="Nothing borrowed" message="Tools you borrow from others will be tracked here." />
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
  

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800">
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

        {/* --- Header --- */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your Dashboard</h1>
            <p className="mt-1 text-slate-500">Manage your tools, requests, and borrowings all in one place.</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* --- Tab Navigation --- */}
        <div className="mb-8">
          <nav className="flex space-x-2 bg-white rounded-full p-1 shadow-md" aria-label="Tabs">
            {tabs.map(tab => (
                    <button
                      key={tab.name}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full whitespace-nowrap flex items-center justify-center gap-2 py-2 px-4 rounded-full font-bold text-sm transition-all duration-300 ${
                          activeTab === tab.id
                          ? 'bg-[#1E3A8A] text-white shadow-md'
                          : 'bg-transparent text-slate-500 hover:text-slate-800'
                      }`}
                  >
                      {tab.icon} {tab.name}
                      {tab.count > 0 && (
                          <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
                              {tab.count}
                          </span>
                      )}
                  </button>
            ))}
          </nav>
        </div>

        <div>{renderContent()}</div>
      </main>

      {/* --- Edit Tool Modal --- */}
      {isModalOpen && editToolData && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 transition-colors">
                  <XMarkIcon className="h-7 w-7" />
              </button>
            <h2 className="text-2xl font-bold mb-6 text-slate-900">Edit Tool</h2>
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">Title</label>
                <input type="text" id="title" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#06C4B0] focus:border-[#06C4B0]" value={editToolData.title} onChange={(e) => setEditToolData({ ...editToolData, title: e.target.value })} />
            </div>
            <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Description</label>
                <textarea id="description" rows={4} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#06C4B0] focus:border-[#06C4B0]" value={editToolData.description} onChange={(e) => setEditToolData({ ...editToolData, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-4 py-2 rounded-lg bg-slate-100 text-slate-800 font-semibold hover:bg-slate-200" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-[#06C4B0] text-white font-semibold hover:bg-[#0598B5]" onClick={handleModalSave}>Save Changes</button>
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
    </div>
  );
};

export default UserProfile;
