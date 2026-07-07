import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import 'react-toastify/dist/ReactToastify.css';
import {
  InboxStackIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import { apiBaseUrl, socketUrl } from '../config';
import Navbar from './Navbar';
import { useChat } from '../context/ChatContext';

let socket;

const SidebarSkeleton = () => (
  <div className="space-y-3 p-4 animate-pulse">
    {Array.from({ length: 4 }).map((_, idx) => (
      <div key={idx} className="flex gap-3 items-center p-3 rounded-2xl border border-slate-100/50 bg-slate-50/20">
        <div className="w-10 h-10 rounded-xl bg-slate-200" />
        <div className="flex-grow space-y-2">
          <div className="flex justify-between items-center">
            <div className="h-3.5 bg-slate-200 rounded w-1/3" />
            <div className="h-2 bg-slate-200 rounded w-1/6" />
          </div>
          <div className="h-2.5 bg-slate-200 rounded w-1/2" />
          <div className="h-3 bg-slate-200 rounded w-5/6" />
        </div>
      </div>
    ))}
  </div>
);

const MessageInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessageIds, setNewMessageIds] = useState(() => {
    try {
      const stored = localStorage.getItem('newMessageIds');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const navigate = useNavigate();
  const { updateUnreadCount } = useChat();

  // -------------------------------
  // Auth Verification
  // -------------------------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      if (decoded.exp < currentTime) {
        toast.info('Session expired. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login');
        return;
      }
      setCurrentUser({
        id: decoded.id || decoded.userId || decoded._id,
        name: decoded.name || decoded.username,
        isAdmin: decoded.isAdmin,
      });
    } catch {
      toast.error('Invalid session.');
      localStorage.removeItem('token');
      navigate('/login');
    }
  }, [navigate]);

  // -------------------------------
  // Fetch Conversations
  // -------------------------------
  useEffect(() => {
    const fetchConversations = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      try {
        const res = await axios.get(`${apiBaseUrl}/chat/conversations`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Filter valid conversations and sort by last active date
        const validConversations = (res.data || []).filter(
          (c) => c.participants && c.participants.length >= 2 && c.tool
        );
        const sorted = validConversations.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );

        setConversations(sorted);
      } catch {
        toast.error('Failed to load inbox.');
      } finally {
        setLoading(false);
      }
    };

    if (currentUser) {
      fetchConversations();
    }
  }, [currentUser]);

  // -------------------------------
  // Socket.io Connection
  // -------------------------------
  useEffect(() => {
    if (!currentUser) return;

    socket = io(socketUrl, {
      transports: ['websocket'],
      upgrade: false,
    });

    socket.emit('register_user', currentUser.id);

    return () => {
      if (socket) socket.disconnect();
    };
  }, [currentUser]);

  // -------------------------------
  // Socket Event Listeners
  // -------------------------------
  useEffect(() => {
    if (!currentUser) return;

    const handleReceiveMessage = (data) => {
      const { conversationId } = data;

      // Update current open active conversation immediately if open
      setActiveConversation((prevConv) => {
        if (prevConv && prevConv._id === conversationId) {
          const newMessage = {
            _id: data._id || Date.now(),
            sender: { _id: data.senderId, name: data.senderName },
            message: data.message,
            timestamp: data.timestamp,
            isRead: true,
          };

          const token = localStorage.getItem('token');
          if (token) {
            axios.put(`${apiBaseUrl}/chat/${conversationId}/read`, {}, {
              headers: { Authorization: `Bearer ${token}` }
            }).catch(err => console.error("Error marking msg read:", err));
          }

          return {
            ...prevConv,
            messages: [...prevConv.messages, newMessage],
            lastMessageAt: data.timestamp,
          };
        }
        return prevConv;
      });

      // Update conversations list for sorting
      setConversations((prevConvs) => {
        const convIndex = prevConvs.findIndex((conv) => conv._id === conversationId);
        if (convIndex === -1) return prevConvs;

        const updatedConvs = [...prevConvs];
        const isMsgRead = data.senderId === currentUser.id || (activeConversation && activeConversation._id === conversationId);
        updatedConvs[convIndex] = {
          ...updatedConvs[convIndex],
          lastMessageAt: data.timestamp,
          messages: [...(updatedConvs[convIndex].messages || []), { ...data, isRead: isMsgRead }],
        };

        return updatedConvs.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
      });

      // Track new messages count
      if (data.senderId !== currentUser.id && (!activeConversation || activeConversation._id !== conversationId)) {
        setNewMessageIds((prev) => {
          const updated = {
            ...prev,
            [conversationId]: [...(prev[conversationId] || []), data._id || Date.now()],
          };
          localStorage.setItem('newMessageIds', JSON.stringify(updated));
          return updated;
        });

        updateUnreadCount((prevCount) => prevCount + 1);
      }
    };

    const handleTyping = ({ conversationId, senderId, senderName }) => {
      if (senderId === currentUser.id) return;
      setTypingUsers((prev) => ({ ...prev, [conversationId]: senderName }));

      setTimeout(() => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[conversationId];
          return updated;
        });
      }, 2000);
    };

    const handleOnlineUsers = (users) => setOnlineUsers(users);

    socket.on('receive_message', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('online_users', handleOnlineUsers);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('online_users', handleOnlineUsers);
    };
  }, [currentUser, activeConversation, updateUnreadCount]);

  const getOtherParticipant = (participants) => {
    if (!currentUser) return participants[0];
    return participants.find((p) => p._id !== currentUser.id) || participants[0];
  };

  const formatTime = (isoString) =>
    new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleOpenConversation = (conv) => {
    setActiveConversation(conv);
    setConversations(prevConvs => 
      prevConvs.map(c => {
        if (c._id === conv._id && c.messages) {
          return {
            ...c,
            messages: c.messages.map(m => ({ ...m, isRead: true }))
          };
        }
        return c;
      })
    );
    setNewMessageIds((prev) => {
      const updated = { ...prev };
      delete updated[conv._id];
      localStorage.setItem('newMessageIds', JSON.stringify(updated));
      return updated;
    });
  };

  // Mark active conversation messages as read in DB and update count
  useEffect(() => {
    if (!activeConversation || !currentUser) return;

    const markAsRead = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        await axios.put(`${apiBaseUrl}/chat/${activeConversation._id}/read`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.error("Failed to mark conversation as read:", err);
      }

      let unreadInConv = 0;
      activeConversation.messages.forEach(msg => {
        const senderId = msg.sender?._id || msg.sender;
        if (senderId && senderId.toString() !== currentUser.id && !msg.isRead) {
          unreadInConv++;
          msg.isRead = true;
        }
      });

      if (unreadInConv > 0) {
        updateUnreadCount((prev) => Math.max(0, prev - unreadInConv));
      }
    };

    markAsRead();
  }, [activeConversation?._id, currentUser, updateUnreadCount]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  // -------------------------------
  // Chat Window Component
  // -------------------------------
  const ChatWindow = ({ conversation, currentUser, onClose }) => {
    const otherUser = getOtherParticipant(conversation.participants);
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState(conversation.messages || []);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const isOtherUserOnline = onlineUsers.includes(otherUser._id);
    const isTyping = typingUsers[conversation._id];

    useEffect(() => {
      setMessages(conversation.messages || []);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 0);
    }, [conversation._id]);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
      e.preventDefault();
      if (!inputMessage.trim()) return;

      const messageData = {
        conversationId: conversation._id,
        senderId: currentUser.id,
        receiverId: getOtherParticipant(conversation.participants)._id,
        message: inputMessage,
        toolId: conversation.tool._id,
        senderName: currentUser.name,
        timestamp: new Date().toISOString(),
      };

      socket.emit('send_message', messageData);
      setMessages((prev) => [...prev, { ...messageData, _id: Date.now() }]);
      setInputMessage('');
    };

    const handleTypingInput = (e) => {
      setInputMessage(e.target.value);

      if (!typingTimeoutRef.current) {
        socket.emit('typing', {
          conversationId: conversation._id,
          senderId: currentUser.id,
          senderName: currentUser.name,
          receiverId: otherUser._id,
        });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 1500);
    };

    return (
      <div className="flex flex-col w-full h-full bg-white border border-slate-100 rounded-3xl shadow-xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white z-20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-full transition-all md:hidden"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-teal-500 text-white rounded-xl flex items-center justify-center font-bold text-sm shadow-sm relative flex-shrink-0">
                {otherUser.profileImage ? (
                  <img src={otherUser.profileImage} alt={otherUser.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  (otherUser.name || "U").charAt(0).toUpperCase()
                )}
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                    isOtherUserOnline ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 leading-none">
                  {otherUser.name}
                </h3>
                
                {/* Secondary participant info */}
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[9px] font-bold text-slate-400">
                  <span className="flex items-center gap-0.5">
                    📍 {otherUser.location || "Location not specified"}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 text-amber-500">
                    ★ {otherUser.rating ? otherUser.rating.toFixed(1) : "0.0"} ({otherUser.numReviews || 0})
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tool Thumbnail Pill */}
            <div className="hidden sm:flex items-center gap-2 bg-indigo-50/60 border border-indigo-100/50 rounded-2xl p-1 pr-3 shadow-inner">
              <img
                src={conversation.tool.image || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop"}
                alt={conversation.tool.title}
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&auto=format&fit=crop";
                  e.target.onerror = null;
                }}
                className="w-7 h-7 rounded-lg object-cover border border-slate-100 flex-shrink-0"
              />
              <div className="text-left">
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 block leading-none">Gear</span>
                <span className="text-[10px] font-black text-indigo-700 leading-tight block mt-0.5 max-w-[100px] truncate">{conversation.tool.title}</span>
              </div>
            </div>

            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isOtherUserOnline 
                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                : 'bg-slate-50 border-slate-150 text-slate-400'
            }`}>
              {isOtherUserOnline ? '🟢 Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 relative z-0 flex flex-col bg-gradient-to-br from-slate-50 via-indigo-50/10 to-teal-50/10">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-slate-400">
                <ChatBubbleLeftRightIcon className="h-10 w-10 mx-auto mb-2 text-slate-350" />
                <p className="text-xs font-bold text-slate-700">No messages yet</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Start the conversation regarding the tool lend!</p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isCurrentUser =
              msg.sender?._id === currentUser.id || msg.senderId === currentUser.id;
            return (
              <div
                key={msg._id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`max-w-[65%] px-5 py-3.5 rounded-[22px] text-xs shadow-sm break-words transition-all leading-relaxed ${
                    isCurrentUser
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-indigo-600/10'
                      : 'bg-white border border-slate-100/80 text-slate-800 rounded-tl-none'
                  }`}
                >
                  <p>{msg.message}</p>
                  
                  <span className={`block text-[9px] mt-1.5 text-right font-semibold flex items-center justify-end gap-1 ${
                    isCurrentUser ? 'text-white/80' : 'text-slate-400'
                  }`}>
                    <span>{formatTime(msg.timestamp)}</span>
                    {isCurrentUser && (
                      <span className={msg.isRead ? "text-sky-300 font-extrabold" : "text-white/40 font-extrabold"}>
                        ✓✓
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="text-[10px] text-slate-500 mt-2 self-start bg-white px-4 py-2.5 rounded-2xl border border-slate-100/80 shadow-sm flex items-center gap-2 font-semibold animate-pulse">
              <span>{isTyping} is typing</span>
              <div className="flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-slate-100 flex gap-2.5 bg-white z-20 flex-shrink-0 items-center"
        >
          {/* Attachments buttons */}
          <div className="flex gap-1.5 items-center pr-2.5 border-r border-slate-100 text-xs">
            <button type="button" className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-all" title="Add Image">📷</button>
            <button type="button" className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-all" title="Add File">📄</button>
            <button type="button" className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-all" title="Share Location">📍</button>
            <button type="button" className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-full transition-all" title="Add Emoji">😊</button>
          </div>

          <input
            type="text"
            placeholder="Type your message here..."
            value={inputMessage}
            onChange={handleTypingInput}
            className="flex-1 px-5 py-3 border border-slate-200 bg-slate-50 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs shadow-inner"
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 shadow-md shadow-indigo-600/10 transition-all flex items-center justify-center flex-shrink-0"
            disabled={inputMessage.trim() === ''}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </form>
      </div>
    );
  };

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase().trim();
    return conversations.filter(c => {
      const other = getOtherParticipant(c.participants);
      return (
        other.name.toLowerCase().includes(q) ||
        c.tool.title.toLowerCase().includes(q)
      );
    });
  }, [conversations, searchQuery]);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 bg-gradient-to-br from-indigo-50/40 via-slate-50 to-teal-50/20 font-sans antialiased flex flex-col relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-200/10 rounded-full blur-3xl" />
      
      <Navbar user={currentUser} onLogout={handleLogout} />
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full flex-1 flex flex-col animate-in fade-in duration-300">
        <button
          onClick={() => navigate(`/${currentUser.name}`)}
          className="mb-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all max-w-max shadow-sm"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </button>

        <header className="mb-6 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-650 to-teal-500 text-white shadow-md flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.06),_transparent_60%)] pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3">
            <InboxStackIcon className="h-5 w-5 text-indigo-200" />
            <h1 className="text-sm md:text-base font-black tracking-tight">Message Inbox</h1>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
              {loading ? "..." : conversations.length} Chats
            </span>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-6 flex-1 items-stretch">
          {/* Conversation List Sidebar */}
          <div className={`md:col-span-1 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100/80 shadow-lg h-[72vh] overflow-y-auto flex flex-col transition-all duration-300 ${activeConversation ? 'hidden md:flex animate-in slide-in-from-left-4 duration-300' : 'flex animate-in slide-in-from-right-4 duration-300'}`}>
            
            {/* Search conversations */}
            <div className="p-4 border-b border-slate-100 sticky top-0 bg-white z-10 space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversations</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="🔍 Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl border border-slate-205 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50 shadow-inner"
                />
              </div>
            </div>

            {loading ? (
              <SidebarSkeleton />
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center flex-1">
                <ChatBubbleLeftRightIcon className="h-10 w-10 mx-auto mb-2 text-slate-350" />
                <p className="font-bold text-xs">{searchQuery ? "No matches found" : "No active chats"}</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[150px] mx-auto leading-relaxed">
                  {searchQuery ? "Try searching for a different owner name or tool name." : "Choose a tool owner to start chatting regarding a tool lend!"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100/50">
                {filteredConversations.map((conv) => {
                  const other = getOtherParticipant(conv.participants);
                  const lastMessage =
                    conv.messages && conv.messages.length > 0
                      ? conv.messages[conv.messages.length - 1]
                      : null;
                  const lastMessageText = lastMessage
                    ? lastMessage.sender?._id === currentUser?.id
                      ? `You: ${lastMessage.message}`
                      : lastMessage.message
                    : 'No messages yet';
                  const lastMessageTime = conv.lastMessageAt
                    ? new Date(conv.lastMessageAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                      })
                    : '';
                  const isOtherOnline = onlineUsers.includes(other._id);
                  const unreadCountForConv = conv.messages 
                    ? conv.messages.filter(msg => {
                        const senderId = msg.sender?._id || msg.sender || msg.senderId;
                        return senderId && senderId.toString() !== currentUser?.id && !msg.isRead;
                      }).length
                    : 0;

                  return (
                    <div
                      key={conv._id}
                      onClick={() => handleOpenConversation(conv)}
                      className={`p-4 flex flex-col cursor-pointer transition-all border-l-4 ${
                        activeConversation && activeConversation._id === conv._id
                          ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                          : 'hover:bg-slate-50 border-transparent hover:border-l-indigo-200'
                      }`}
                    >
                      <div className="flex gap-3 items-center">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center font-bold text-sm text-slate-500 shadow-sm">
                            {other.profileImage ? (
                              <img src={other.profileImage} alt={other.name} className="h-full w-full object-cover rounded-xl" />
                            ) : (
                              (other.name || "U").charAt(0).toUpperCase()
                            )}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              isOtherOnline ? 'bg-emerald-500' : 'bg-slate-350'
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <p className={`text-xs truncate ${unreadCountForConv > 0 ? "font-black text-slate-900" : "font-bold text-slate-800"}`}>{other.name}</p>
                            <span className="text-[9px] text-slate-400">{lastMessageTime}</span>
                          </div>

                          <div className="flex justify-between items-center mt-1">
                            <span className="inline-block bg-indigo-50 text-indigo-750 text-[9px] font-extrabold px-2 py-0.5 rounded border border-indigo-100/40 uppercase tracking-tight">
                              🔧 {conv.tool.title}
                            </span>
                            {unreadCountForConv > 0 && (
                              <span className="ml-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse flex-shrink-0">
                                {unreadCountForConv}
                              </span>
                            )}
                          </div>

                          <p className={`text-[10px] truncate mt-1.5 ${unreadCountForConv > 0 ? "font-bold text-slate-850" : "text-slate-400 font-semibold"}`}>{lastMessageText}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Chat Window Area */}
          <div className={`md:col-span-2 h-[72vh] ${activeConversation ? 'flex animate-in slide-in-from-right-4 duration-300' : 'hidden md:flex animate-in slide-in-from-left-4 duration-300'}`}>
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                currentUser={currentUser}
                onClose={() => setActiveConversation(null)}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-white/80 backdrop-blur-md rounded-3xl border border-slate-100 shadow-lg p-8">
                <div className="text-center text-slate-500 max-w-sm flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-2xl mb-4 shadow-inner">
                    💬
                  </div>
                  <p className="text-base font-black text-slate-800 mb-1.5">No conversation selected</p>
                  <p className="text-slate-450 text-xs mb-6 font-semibold leading-relaxed">Choose a conversation from the sidebar list or browse catalog tools to start a new negotiation.</p>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-full transition-all hover:scale-102 shadow-md shadow-indigo-600/10 active:scale-98"
                  >
                    Browse Tools
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MessageInbox;
