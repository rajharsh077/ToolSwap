import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { useChat } from '../context/ChatContext';

const socket = io('http://localhost:3000');

const ChatModal = ({ isOpen, onClose, currentUser, targetUser, targetTool }) => {
    // --- Hooks always run unconditionally ---
    const [conversation, setConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const token = localStorage.getItem("token");
    const { updateUnreadCount } = useChat();

    const isDataMissing = !currentUser?.id || !targetUser?.id || !targetTool?.id || !token;

    // --- Fetch or Create Conversation ---
    useEffect(() => {
        if (!isOpen || isDataMissing) {
            setIsLoading(false);
            return;
        }

        const fetchConversation = async () => {
            setIsLoading(true);
            setConversation(null);
            setMessages([]);

            try {
                const res = await axios.get(
                    `http://localhost:3000/chat/${targetTool.id}/${targetUser.id}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const conv = res.data;
                setConversation(conv);
                setMessages(conv.messages.map(msg => ({
                    _id: msg._id,
                    senderId: msg.sender._id || msg.sender,
                    message: msg.message,
                    timestamp: msg.timestamp
                })));

                socket.emit('join_room', currentUser.id);
            } catch (error) {
                toast.error("Failed to load chat history.");
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchConversation();
    }, [isOpen, currentUser?.id, targetUser?.id, targetTool?.id, token]);

    // --- Real-time Socket Listener ---
    useEffect(() => {
        if (!conversation) return;

        const handleReceiveMessage = (data) => {
            if (data.conversationId === conversation._id) {
                setMessages(prev => [...prev, data]);
                setConversation(prev => ({ ...prev, lastMessageAt: data.timestamp }));

                if (data.senderId !== currentUser.id) {
                    updateUnreadCount(prev => prev + 1);
                }
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        return () => socket.off('receive_message', handleReceiveMessage);
    }, [conversation, currentUser.id, updateUnreadCount]);

    // --- Scroll to bottom ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // --- JSX rendering ---
    if (!isOpen) return null;

    if (isDataMissing) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
                    <p className="text-red-500">Required user/tool data is missing.</p>
                    <button onClick={onClose} className="mt-4 bg-gray-200 p-2 rounded-full">Close</button>
                </div>
            </div>
        );
    }

    const handleSend = (e) => {
        e.preventDefault();
        if (!conversation || inputMessage.trim() === '') return;

        const messageData = {
            conversationId: conversation._id,
            senderId: currentUser.id,
            receiverId: targetUser.id,
            message: inputMessage,
            toolId: targetTool.id,
            senderName: currentUser.name,
            timestamp: new Date().toISOString()
        };

        socket.emit('send_message', messageData);

        setMessages(prev => [...prev, { ...messageData, _id: Date.now() }]);
        setInputMessage('');
    };

    const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col relative">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-2xl">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-bold">{targetUser.name}</h3>
                        <p className="text-sm text-slate-500">
                            <ChatBubbleBottomCenterTextIcon className="h-4 w-4 inline mr-1" />
                            Conversation about: {targetTool.title}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-800 p-2">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600">
                        Loading chat history...
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {messages.length === 0 && <div className="text-center text-slate-500 pt-10">No messages yet.</div>}
                            {messages.map((msg, i) => {
                                const isCurrentUser = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg._id || i} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl text-sm shadow-md ${
                                            isCurrentUser ? 'bg-[#06B6D4] text-white rounded-br-none' : 'bg-gray-200 text-slate-800 rounded-tl-none'
                                        }`}>
                                            {msg.message}
                                            <span className="block text-[10px] opacity-80 mt-1 text-right">{formatTime(msg.timestamp)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 flex gap-3">
                            <input
                                type="text"
                                placeholder="Write your message..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-[#06B6D4]"
                            />
                            <button type="submit" disabled={inputMessage.trim() === ''} className="bg-[#1E3A8A] text-white p-3 rounded-full hover:bg-[#15275a]">
                                <PaperAirplaneIcon className="h-6 w-6 transform rotate-45" />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatModal;
