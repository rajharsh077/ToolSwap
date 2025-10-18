import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import {jwtDecode} from 'jwt-decode';
import { toast, ToastContainer } from 'react-toastify';
import {
  InboxStackIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';
import io from 'socket.io-client';

// Correct path for your context
import { useChat } from '../context/ChatContext';

const socket = io('http://localhost:3000'); // connect socket

const MessageInbox = () => {
  const [conversations, setConversations] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeConversation, setActiveConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { name } = useParams();

  const { updateUnreadCount: updateUnreadCountFromContext } = useChat();

  // Memoize context function to avoid re-renders
  const updateUnreadCount = useCallback(
    (value) => updateUnreadCountFromContext(value),
    [updateUnreadCountFromContext]
  );

  // -------------------------------
  // 1. Auth & Conversations Fetch
  // -------------------------------
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

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

        const currentUserId = decoded.id || decoded._id;
        const currentUserName = decoded.name || decoded.username;

        setCurrentUser({ id: currentUserId, name: currentUserName });

        socket.emit('join_room', currentUserId);

        const res = await axios.get('http://localhost:3000/chat/conversations', {
          headers: { Authorization: `Bearer ${token}` }
        });

        const loadedConversations = res.data;
        setConversations(loadedConversations);
        updateUnreadCount(loadedConversations.length);
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
  }, [navigate, updateUnreadCount]);

  // -------------------------------
  // 2. Socket Listener for Incoming Messages
  // -------------------------------
  useEffect(() => {
    if (!currentUser) return;

    const handleReceiveMessage = (data) => {
      const conversationId = data.conversationId;

      // Update active chat window if it matches
      setActiveConversation((prevConv) => {
        if (prevConv && prevConv._id === conversationId) {
          const newMessage = {
            _id: data._id || Date.now(),
            sender: { _id: data.senderId, name: data.senderName },
            message: data.message,
            timestamp: data.timestamp
          };
          return {
            ...prevConv,
            messages: [...prevConv.messages, newMessage],
            lastMessageAt: data.timestamp
          };
        }
        return prevConv;
      });

      // Update conversations list
      setConversations((prevConvs) => {
        const convIndex = prevConvs.findIndex((conv) => conv._id === conversationId);
        if (convIndex === -1) return prevConvs;

        const updatedConvs = [...prevConvs];
        updatedConvs[convIndex] = {
          ...updatedConvs[convIndex],
          lastMessageAt: data.timestamp,
          messages: [...(updatedConvs[convIndex].messages || []), data]
        };

        return updatedConvs.sort(
          (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
        );
      });

      // Update unread count
      updateUnreadCount((prevCount) => prevCount + 1);
    };

    socket.on('receive_message', handleReceiveMessage);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, [currentUser, updateUnreadCount]);

  // -------------------------------
  // Helpers
  // -------------------------------
  const getOtherParticipant = (participants) => {
    if (!currentUser) return participants[0];
    return participants.find((p) => p._id !== currentUser.id) || participants[0];
  };

  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // -------------------------------
  // Chat Window Component
  // -------------------------------
  const ChatWindow = ({ conversation, currentUser, onClose }) => {
    const otherUser = getOtherParticipant(conversation.participants);
    const [inputMessage, setInputMessage] = useState('');
    const [messages, setMessages] = useState(conversation.messages || []);
    const messagesEndRef = useRef(null);

    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
      e.preventDefault();
      if (!inputMessage.trim()) return;

      const messageData = {
        conversationId: conversation._id,
        senderId: currentUser.id,
        receiverId: otherUser._id,
        message: inputMessage,
        toolId: conversation.tool._id,
        senderName: currentUser.name,
        timestamp: new Date().toISOString()
      };

      socket.emit('send_message', messageData);

      setMessages((prev) => [
        ...prev,
        { ...messageData, _id: Date.now(), senderId: currentUser.id }
      ]);

      setInputMessage('');
    };

    // Decrement unread count when opened
    useEffect(() => {
      updateUnreadCount((prev) => Math.max(0, prev - 1));
    }, [conversation._id, updateUnreadCount]);

    return (
      <div className="flex flex-col w-full h-full bg-white border border-gray-300 rounded-lg shadow-xl relative">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-slate-50 z-20 flex-shrink-0">
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-1 rounded-full">
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center flex-1">
            <h3 className="text-xl font-bold text-slate-800">{otherUser.name}</h3>
            <p className="text-sm text-slate-500">
              Regarding: <span className="font-semibold text-[#06B6D4]">{conversation.tool.title}</span>
            </p>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-0">
          {messages.length === 0 && (
            <div className="text-center text-slate-500 pt-10">No messages yet. Start a conversation!</div>
          )}
          {messages.map((msg) => {
  const isCurrentUser = msg.sender?._id === currentUser.id || msg.senderId === currentUser.id;
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

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex gap-3 bg-white z-20 flex-shrink-0">
          <input
            type="text"
            placeholder="Type your message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-xl text-slate-600">Loading conversations...</div>;
  }

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
                const lastMessageTime = new Date(conv.lastMessageAt).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'short'
                });

                return (
                  <div
                    key={conv._id}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-4 flex gap-3 items-center cursor-pointer transition-colors border-l-4 ${
                      activeConversation && activeConversation._id === conv._id
                        ? 'bg-sky-50 border-[#06B6D4]'
                        : 'hover:bg-gray-100 border-transparent'
                    }`}
                  >
                    <UserCircleIcon className="h-10 w-10 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-slate-800 truncate">{other.name}</p>
                        <span className="text-xs text-slate-500">{lastMessageTime}</span>
                      </div>
                      <p className="text-sm text-slate-600 truncate">{conv.tool.title}</p>
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
