import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import {
  InboxStackIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import io from 'socket.io-client';
import { useChat } from '../context/ChatContext';

const socket = io('http://localhost:3000', { autoConnect: true });

const MessageInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [newMessageIds, setNewMessageIds] = useState({}); // Track new messages per conversation
  const navigate = useNavigate();

  const { updateUnreadCount: updateUnreadCountFromContext } = useChat();
  const updateUnreadCount = useCallback(
    (value) => updateUnreadCountFromContext(value),
    [updateUnreadCountFromContext]
  );

  // -------------------------------
  // Load badges from localStorage
  // -------------------------------
  useEffect(() => {
    const stored = localStorage.getItem('newMessageIds');
    if (stored) {
      setNewMessageIds(JSON.parse(stored));
    }
  }, []);

  // -------------------------------
  // 1. Auth & Conversations Fetch
  // -------------------------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    let currentUserId = null;

    const setupUserAndFetch = async () => {
      try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;

        if (decoded.exp < currentTime) {
          toast.info('Session expired. Please log in again.');
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }

        currentUserId = decoded.id || decoded._id;
        const currentUserName = decoded.name || decoded.username;
        setCurrentUser({ id: currentUserId, name: currentUserName });

        socket.emit('join_room', currentUserId);
        socket.emit('user_online', currentUserId);

        const res = await axios.get('http://localhost:3000/chat/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const filteredConversations = res.data.filter(
          (conv) => conv.messages && conv.messages.length > 0
        );
        setConversations(filteredConversations);
        updateUnreadCount(filteredConversations.length);
      } catch (error) {
        console.error('Auth/Fetch Error:', error);
        toast.error('Failed to load messages. Redirecting...');
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    setupUserAndFetch();

    const handleBeforeUnload = () => {
      if (currentUserId) socket.emit('user_offline', currentUserId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (currentUserId) socket.emit('user_offline', currentUserId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [navigate, updateUnreadCount]);

  // -------------------------------
  // 2. Socket Listeners
  // -------------------------------
  useEffect(() => {
    if (!currentUser) return;

    const handleReceiveMessage = (data) => {
      const conversationId = data.conversationId;

      // Update active conversation messages if open
      setActiveConversation((prevConv) => {
        if (prevConv && prevConv._id === conversationId) {
          const newMessage = {
            _id: data._id || Date.now(),
            sender: { _id: data.senderId, name: data.senderName },
            message: data.message,
            timestamp: data.timestamp,
          };
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
        updatedConvs[convIndex] = {
          ...updatedConvs[convIndex],
          lastMessageAt: data.timestamp,
          messages: [...(updatedConvs[convIndex].messages || []), data],
        };

        return updatedConvs.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
      });

      // Track new messages only if conversation is not active and not sent by current user
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

  // -------------------------------
  // Helpers
  // -------------------------------
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
    // Clear new messages badge
    setNewMessageIds((prev) => {
      const updated = { ...prev };
      delete updated[conv._id];
      localStorage.setItem('newMessageIds', JSON.stringify(updated));
      return updated;
    });
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

    useEffect(() => {
      updateUnreadCount((prev) => Math.max(0, prev - 1));
    }, [conversation._id, updateUnreadCount]);

    return (
      <div className="flex flex-col w-full h-full bg-white border border-gray-300 rounded-lg shadow-xl relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50 z-20 flex-shrink-0">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 p-1 rounded-full"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>

          <div className="flex flex-col items-center flex-1 text-center">
            <h3 className="text-xl font-bold text-slate-800 flex items-center justify-center gap-2">
              {otherUser.name}
              <span
                className={`inline-block w-3 h-3 rounded-full ${
                  isOtherUserOnline ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
            </h3>
            {isTyping && (
              <p className="text-xs text-gray-500 italic">{isTyping} is typing...</p>
            )}
            <p className="text-sm text-slate-500">
              Regarding:{' '}
              <span className="font-semibold text-[#06B6D4]">{conversation.tool.title}</span>
            </p>
          </div>
          <div className="w-10" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-0 flex flex-col">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 pt-10">No messages yet.</div>
          )}

          {messages.map((msg) => {
            const isCurrentUser =
              msg.sender?._id === currentUser.id || msg.senderId === currentUser.id;
            return (
              <div
                key={msg._id}
                className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} w-full`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl text-sm shadow-md break-words ${
                    isCurrentUser
                      ? 'bg-[#06B6D4] text-white rounded-br-none'
                      : 'bg-gray-200 text-slate-800 rounded-tl-none'
                  }`}
                >
                  {msg.message}
                  <span className="block text-[10px] opacity-80 mt-1 text-right">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="text-sm text-gray-500 italic mt-2 self-start">
              {isTyping} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-gray-200 flex gap-3 bg-white z-20 flex-shrink-0"
        >
          <input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={handleTypingInput}
            className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#06B6D4] z-30"
          />
          <button
            type="submit"
            className="bg-[#1E3A8A] text-white p-3 rounded-full hover:bg-[#15275a] transition-colors disabled:opacity-50 z-30"
            disabled={inputMessage.trim() === ''}
          >
            <PaperAirplaneIcon className="h-6 w-6 transform rotate-45" />
          </button>
        </form>
      </div>
    );
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-xl text-slate-600">
        Loading conversations...
      </div>
    );

  // -------------------------------
  // Layout Render
  // -------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <InboxStackIcon className="h-8 w-8 text-[#06B6D4]" />
          Message Inbox ({conversations.length})
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Conversation List */}
          <div className="md:col-span-1 bg-white rounded-xl shadow-lg h-[80vh] overflow-y-auto border border-gray-200">
            <div className="p-4 border-b bg-gray-50 sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-slate-800">Your Conversations</h2>
            </div>

            {conversations.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No conversations found.</div>
            ) : (
              conversations.map((conv) => {
                const other = getOtherParticipant(conv.participants);
                const lastMessage =
                  conv.messages && conv.messages.length > 0
                    ? conv.messages[conv.messages.length - 1]
                    : null;
                const lastMessageText = lastMessage
                  ? lastMessage.sender?._id === currentUser.id
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
                const newMessages = newMessageIds[conv._id] || [];

                return (
                  <div
                    key={conv._id}
                    onClick={() => handleOpenConversation(conv)}
                    className={`p-4 flex flex-col cursor-pointer transition-colors border-l-4 ${
                      activeConversation && activeConversation._id === conv._id
                        ? 'bg-sky-50 border-[#06B6D4]'
                        : 'hover:bg-gray-100 border-transparent'
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="relative">
                        <UserCircleIcon className="h-10 w-10 text-slate-400" />
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${
                            isOtherOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-slate-800 truncate">{other.name}</p>
                          <span className="text-xs text-slate-500">{lastMessageTime}</span>
                        </div>

                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-slate-500 truncate italic">
                            {isOtherOnline ? '🟢 Online' : '⚫ Offline'}
                          </p>
                          <p className="text-xs text-[#06B6D4] font-semibold truncate ml-2">
                            {conv.tool.title}
                          </p>
                          {newMessages.length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {newMessages.length}
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-slate-700 truncate mt-1">{lastMessageText}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Chat Window */}
          <div className="md:col-span-2 h-[80vh]">
            {activeConversation ? (
              <ChatWindow
                conversation={activeConversation}
                currentUser={currentUser}
                onClose={() => setActiveConversation(null)}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-slate-500">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto mb-4" />
                  <p className="text-lg">Select a conversation to start chatting</p>
                  <p className="text-sm">Or message an owner from a tool page.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInbox;
