import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { XMarkIcon, PaperAirplaneIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/outline';
import io from 'socket.io-client';
import { toast } from 'react-toastify';
import { useChat } from '../context/ChatContext';
import { socketUrl, apiBaseUrl } from '../config';

const socket = io(socketUrl);

const ChatModal = ({ isOpen, onClose, currentUser, targetUser, targetTool }) => {
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
                    `${apiBaseUrl}/chat/${targetTool.id}/${targetUser.id}`,
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

                await axios.put(`${apiBaseUrl}/chat/${conv._id}/read`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                let unreadInConv = 0;
                conv.messages.forEach(msg => {
                    const senderId = msg.sender?._id || msg.sender;
                    if (senderId && senderId.toString() !== currentUser.id && !msg.isRead) {
                        unreadInConv++;
                    }
                });

                if (unreadInConv > 0) {
                    updateUnreadCount(prev => Math.max(0, prev - unreadInConv));
                }
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
                setMessages(prev => {
                    const isDuplicate = prev.some(msg => 
                        msg.senderId === data.senderId && 
                        msg.message === data.message && 
                        Math.abs(new Date(msg.timestamp) - new Date(data.timestamp)) < 5000
                    );
                    if (isDuplicate) return prev;
                    return [...prev, data];
                });
                setConversation(prev => ({ ...prev, lastMessageAt: data.timestamp }));

                if (data.senderId !== currentUser.id) {
                    axios.put(`${apiBaseUrl}/chat/${conversation._id}/read`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(err => console.error("Error marking msg read in modal socket:", err));
                }
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        return () => socket.off('receive_message', handleReceiveMessage);
    }, [conversation, currentUser?.id, updateUnreadCount]);

    // --- Scroll to bottom ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    if (!isOpen) return null;

    if (isDataMissing) {
        return (
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 animate-slide-up-fade text-center text-xs font-semibold">
                    <div className="text-4xl mb-3">⚠️</div>
                    <p className="text-rose-600 font-bold text-sm mb-1.5">Missing Connection Info</p>
                    <p className="text-slate-400 mb-6 leading-relaxed">Cannot open conversation room without verification details.</p>
                    <button onClick={onClose} className="bg-indigo-600 text-white px-6 py-2.5 rounded-full hover:bg-indigo-750 transition-all font-bold shadow-md shadow-indigo-600/10">
                        Close Modal
                    </button>
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg h-[75vh] flex flex-col relative border border-slate-100 overflow-hidden animate-slide-up-fade">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-slate-800">{targetUser.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-semibold">
                          <ChatBubbleBottomCenterTextIcon className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Regarding:</span>
                          <span className="font-bold text-indigo-650">{targetTool.title}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-2 bg-slate-50 text-slate-400 hover:text-slate-700 transition-all">
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-3 text-xs font-semibold">
                        <div className="relative w-10 h-10">
                            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-pulse"></div>
                            <div className="absolute inset-1.5 bg-indigo-200 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                            <div className="absolute inset-3 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                        </div>
                        <p>Loading messages...</p>
                    </div>
                ) : (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
                            {messages.length === 0 && (
                                <div className="flex items-center justify-center h-full text-center text-slate-400 text-xs font-medium">
                                    <div>
                                        <ChatBubbleBottomCenterTextIcon className="h-10 w-10 mx-auto mb-2 text-slate-350 animate-pulse" />
                                        <p className="font-bold">No message history</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Send a quick message to negotiate details!</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => {
                                const isCurrentUser = msg.senderId === currentUser.id;
                                return (
                                    <div key={msg._id || i} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                        <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-xs shadow-sm transition-all break-words ${
                                            isCurrentUser ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-none'
                                        }`}>
                                            <p className="leading-relaxed">{msg.message}</p>
                                            <span className={`block text-[8px] mt-1 text-right ${isCurrentUser ? 'opacity-80' : 'opacity-40 text-slate-500'}`}>{formatTime(msg.timestamp)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex gap-2.5 bg-white">
                            <input
                                type="text"
                                placeholder="Type your message..."
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                className="flex-1 px-5 py-3 border border-slate-200 bg-slate-50 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-inner"
                            />
                            <button type="submit" disabled={inputMessage.trim() === ''} className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 transition-all flex items-center justify-center shadow-md shadow-indigo-600/10">
                                <PaperAirplaneIcon className="h-5 w-5" />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatModal;
