import React, { useEffect, useState } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const UserProfile = () => {
  const [lentTools, setLentTools] = useState([]);
  const [borrowedTools, setBorrowedTools] = useState([]);
  const [requests, setRequests] = useState([]);
  const [toolsWithBorrowers, setToolsWithBorrowers] = useState([]);
  const [expandedToolId, setExpandedToolId] = useState(null);
  const { name } = useParams();

  const [activeTab, setActiveTab] = useState("listed");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editToolData, setEditToolData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfileData = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      let userId;
      try {
        const decoded = jwtDecode(token);
        userId = decoded.id || decoded._id;
      } catch {
        toast.error("Invalid token. Please login again.");
        localStorage.removeItem("token");
        navigate("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      try {
        // Fetch user data
        const userRes = await axios.get(`http://localhost:3000/${name}/${userId}`, { headers });
        const userData = userRes.data;
        setLentTools(userData.toolsOwned || []);

        // Populate lentOut tools with borrower info
        const lentOutRes = await axios.get(`http://localhost:3000/${name}/${userId}/lentOut`, { headers });
         setToolsWithBorrowers(lentOutRes.data);

        // Fetch borrowed tools
        const borrowedRes = await axios.get(`http://localhost:3000/tools/borrowed/${userId}`, { headers });
        setBorrowedTools(borrowedRes.data);

        // Fetch requests
        const requestsRes = await axios.get(`http://localhost:3000/tools/requests/${userId}`, { headers });
        setRequests(requestsRes.data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load profile data.");
      }
    };

    fetchProfileData();
  }, [navigate, name]);

  // Toggle tool availability
  const handleAvailabilityToggle = async (toolId, currentStatus) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.put(`http://localhost:3000/tools/${toolId}`, { available: !currentStatus }, { headers });
      setLentTools((prev) => prev.map((tool) => (tool._id === toolId ? { ...tool, available: !currentStatus } : tool)));
      setToolsWithBorrowers((prev) => prev.map((tool) => (tool._id === toolId ? { ...tool, available: !currentStatus } : tool)));
      toast.success("Tool updated successfully!");
    } catch (error) {
      toast.error("Failed to update availability.");
    }
  };

  // Delete a tool
  const handleDelete = async (toolId) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.delete(`http://localhost:3000/tools/${toolId}`, { headers });
      setLentTools((prev) => prev.filter((tool) => tool._id !== toolId));
      setToolsWithBorrowers((prev) => prev.filter((tool) => tool._id !== toolId));
      toast.success("Tool deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete tool.");
    }
  };

  // Open edit modal
  const handleEdit = (tool) => {
    setEditToolData(tool);
    setIsModalOpen(true);
  };

  const handleReturnTool = async (toolId, toolTitle) => {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  try {
    await axios.post(`http://localhost:3000/tools/return/${toolId}`, {}, { headers });
    toast.success(`Return request sent for "${toolTitle}"!`);
  } catch (err) {
    console.error(err);
    toast.error("Failed to send return request.");
  }
};


  // Save edited tool
  const handleModalSave = async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const updatedTool = await axios.put(
        `http://localhost:3000/tools/${editToolData._id}`,
        {
          title: editToolData.title,
          description: editToolData.description,
          available: editToolData.available,
        },
        { headers }
      );

      setLentTools((prev) => prev.map((tool) => (tool._id === updatedTool.data._id ? updatedTool.data : tool)));
      setToolsWithBorrowers((prev) => prev.map((tool) => (tool._id === updatedTool.data._id ? updatedTool.data : tool)));
      setIsModalOpen(false);
      toast.success("Tool updated successfully!");
    } catch (error) {
      toast.error("Failed to update tool.");
    }
  };

  // Approve or reject a borrow request
  const handleRequest = async (reqObj) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      await axios.put(
        `http://localhost:3000/tools/request/${reqObj.toolId}/${reqObj.borrowerId}`,
        { status: reqObj.status },
        { headers }
      );

      // Remove request from list
      setRequests((prev) => prev.filter((r) => r._id !== reqObj._id));

      if (reqObj.status === "approved") {
        toast.success("Request approved!");
        setBorrowedTools((prev) => [...prev, { _id: reqObj.toolId, title: reqObj.toolTitle }]);
      } else if (reqObj.status === "rejected") {
        toast.info("Request rejected!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to update request.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "listed":
        return (
          <ul className="space-y-2">
            {lentTools.length === 0 ? (
              <p className="text-gray-600">You haven't listed any tools yet.</p>
            ) : (
              lentTools.map((tool) => (
                <li
                  key={tool._id}
                  className="bg-white p-3 rounded shadow cursor-pointer"
                  onClick={() => setExpandedToolId(expandedToolId === tool._id ? null : tool._id)}
                >
                  <div className="flex justify-between items-center">
                    <span>{tool.title}</span>
                    <span className="text-sm text-gray-500">{tool.available ? "Available" : "Not Available"}</span>
                  </div>

                  {expandedToolId === tool._id && (
                    <div className="mt-4 border-t pt-3 flex flex-col gap-2">
                      <p>
                        <strong>Description:</strong> {tool.description}
                      </p>
                      <div className="flex gap-2">
                        <button
                          className={`px-4 py-2 rounded text-white ${tool.available ? "bg-red-500" : "bg-green-500"}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAvailabilityToggle(tool._id, tool.available);
                          }}
                        >
                          Mark as {tool.available ? "Not Available" : "Available"}
                        </button>
                        <button
                          className="px-4 py-2 rounded bg-blue-500 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(tool);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="px-4 py-2 rounded bg-red-600 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(tool._id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))
            )}
          </ul>
        );

      case "lentOut":
        return toolsWithBorrowers.length === 0 ? (
          <p className="text-gray-600">No tools are currently lent out.</p>
        ) : (
          <ul className="space-y-2">
            {toolsWithBorrowers.map((tool) => (
              <li key={tool._id} className="bg-white p-3 rounded shadow">
                <p>
                  <strong>{tool.title}</strong> is currently with <strong>{tool.borrowedBy?.name}</strong>
                </p>
                <p className="text-sm text-gray-600">📱 {tool.borrowedBy?.phone}</p>
                <p className="text-sm text-gray-500">Status: {tool.available ? "Available" : "Not Available"}</p>
                <p className="text-sm text-gray-500">
  Borrowed on: {tool.borrowedAt ? new Date(tool.borrowedAt).toLocaleDateString() : "N/A"}
</p>

              </li>
            ))}
          </ul>
        );

      case "requests":
        return requests.length === 0 ? (
          <p className="text-gray-600">No lend requests yet.</p>
        ) : (
          <ul className="space-y-2">
            {requests.map((req) => (
              <li key={req._id} className="bg-white p-3 rounded shadow flex justify-between items-center">
                <span>
                  {req.borrowerName} requested <strong>{req.toolTitle}</strong>
                </span>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-green-500 text-white rounded"
                    onClick={() => handleRequest({ ...req, status: "approved" })}
                  >
                    Approve
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded"
                    onClick={() => handleRequest({ ...req, status: "rejected" })}
                  >
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        );

      case "borrowed":
  return borrowedTools.length === 0 ? (
    <p className="text-gray-600">You haven't borrowed any tools.</p>
  ) : (
    <ul className="space-y-2">
      {borrowedTools.map((tool) => (
        <li key={tool._id} className="bg-white p-3 rounded shadow flex justify-between items-center">
          <span>{tool.title}</span>
          <button
            className="px-3 py-1 bg-green-500 text-white rounded"
            onClick={() => handleReturnTool(tool._id, tool.title)}
          >
            Return
          </button>
        </li>
      ))}
    </ul>
  );



      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-lg mb-6 text-white shadow">
        <h1 className="text-3xl font-bold">👋 Welcome to Your ToolSwap Dashboard!</h1>
        <p className="mt-2">Manage your tools, requests, and borrowings all in one place.</p>
      </div>

      <div className="flex gap-4 mb-6">
        <button className={`px-4 py-2 rounded ${activeTab === "listed" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("listed")}>
          🔧 Your Tools
        </button>
        <button className={`px-4 py-2 rounded ${activeTab === "lentOut" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("lentOut")}>
          🔄 Lent Out
        </button>
        <button className={`px-4 py-2 rounded ${activeTab === "requests" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("requests")}>
          📥 Requests
        </button>
        <button className={`px-4 py-2 rounded ${activeTab === "borrowed" ? "bg-blue-500 text-white" : "bg-gray-200"}`} onClick={() => setActiveTab("borrowed")}>
          📦 Borrowed
        </button>
      </div>

      <div>{renderContent()}</div>

      {isModalOpen && editToolData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96">
            <h2 className="text-xl font-bold mb-4">Edit Tool</h2>
            <label className="block mb-2">Title:</label>
            <input type="text" className="border p-2 w-full mb-4 rounded" value={editToolData.title} onChange={(e) => setEditToolData({ ...editToolData, title: e.target.value })} />
            <label className="block mb-2">Description:</label>
            <textarea className="border p-2 w-full mb-4 rounded" value={editToolData.description} onChange={(e) => setEditToolData({ ...editToolData, description: e.target.value })} />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 rounded bg-gray-300" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-blue-500 text-white" onClick={handleModalSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
