import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrophyIcon, SparklesIcon, ShareIcon, HandRaisedIcon, StarIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';
import { toast, ToastContainer } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { apiBaseUrl } from '../config';
import Navbar from './Navbar';
import { jwtDecode } from "jwt-decode";

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const { name } = useParams();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/login');
            return;
        }

        try {
          const decoded = jwtDecode(token);
          setUser({ name: decoded.name || decoded.username, isAdmin: decoded.isAdmin });
        } catch (err) {
          console.error("Token decode error:", err);
        }

        const res = await axios.get(`${apiBaseUrl}/tools/leaderboard`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setLeaderboard(res.data);
      } catch {
        toast.error('Failed to load leaderboard data.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [navigate]);

  const renderRankIcon = (index) => {
    if (index === 0) return <TrophyIcon className="h-6 w-6 text-yellow-500" />;
    if (index === 1) return <TrophyIcon className="h-5 w-5 text-slate-400" />;
    if (index === 2) return <TrophyIcon className="h-5 w-5 text-amber-700" />;
    return <span className="text-xs font-black text-slate-400 w-5 text-center">{index + 1}</span>;
  };

  // Slice top 3 for podium
  const podiumUsers = leaderboard.slice(0, 3);
  const listUsers = leaderboard.slice(3);

  // Reorder podium as: [2nd, 1st, 3rd] for visual presentation
  const visualPodium = [];
  if (podiumUsers[1]) visualPodium.push({ ...podiumUsers[1], rank: 2 });
  if (podiumUsers[0]) visualPodium.push({ ...podiumUsers[0], rank: 1 });
  if (podiumUsers[2]) visualPodium.push({ ...podiumUsers[2], rank: 3 });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Navbar user={user || { name }} />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-xs font-bold text-slate-500 animate-pulse">Loading Leaderboard details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 bg-gradient-to-br from-indigo-50/40 via-slate-50 to-teal-50/20 font-sans antialiased flex flex-col relative overflow-hidden">
      <div className="absolute top-0 -left-4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-4 w-96 h-96 bg-teal-200/10 rounded-full blur-3xl pointer-events-none" />
      
      <Navbar user={user || { name }} />
      <ToastContainer position="bottom-right" autoClose={3000} theme="light" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10 w-full flex-1">
        <button
          onClick={() => navigate(`/${name}`)}
          className="mb-8 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2 text-xs font-bold flex items-center gap-1.5 transition-all max-w-max shadow-sm"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Dashboard
        </button>

        <header className="mb-12 p-8 md:p-10 rounded-3xl bg-gradient-to-r from-amber-500 via-indigo-600 to-teal-500 text-white shadow-xl overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.12),_transparent_55%)]" />
          <div className="relative z-10 text-center flex flex-col items-center">
            <TrophyIcon className="h-12 w-12 text-yellow-300 bg-white/10 p-2.5 rounded-2xl mb-4 drop-shadow-md animate-bounce" />
            <h1 className="text-3xl font-black tracking-tight mb-2">
              Community Champions
            </h1>
            <p className="text-white/90 text-xs max-w-md leading-relaxed font-semibold">
              Meet the top sharing neighbors in our community. Points are earned through listing tools, borrow requests, and positive owner feedback.
            </p>
          </div>
        </header>

        {leaderboard.length === 0 ? (
          <div className="text-center py-20 bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/50 shadow-sm max-w-md mx-auto p-8">
            <SparklesIcon className="h-10 w-10 text-indigo-500 mx-auto mb-4 animate-pulse" />
            <p className="text-sm font-bold text-slate-800 mb-1">No Champions Yet</p>
            <p className="text-slate-450 text-xs max-w-xs mx-auto leading-relaxed font-semibold">Be the first to share a tool in your neighborhood and start earning lending points!</p>
          </div>
        ) : (
          <div className="space-y-12">
            {/* Visual Podium Section */}
            {visualPodium.length > 0 && (
              <div className="flex flex-col sm:flex-row items-end justify-center gap-6 pt-10 pb-4">
                {visualPodium.map((user) => {
                  const isFirst = user.rank === 1;
                  const isSecond = user.rank === 2;
                  const borderClass = isFirst 
                    ? 'border-yellow-300 shadow-[0_15px_35px_rgba(234,179,8,0.12)] ring-4 ring-yellow-400/10 scale-105 order-1 sm:order-2 z-20 bg-gradient-to-b from-yellow-50/30 to-white/95' 
                    : isSecond 
                      ? 'border-slate-300/80 shadow-[0_10px_25px_rgba(148,163,184,0.08)] order-2 sm:order-1 z-10 bg-gradient-to-b from-slate-50/30 to-white/95' 
                      : 'border-amber-600/30 shadow-[0_10px_25px_rgba(180,83,9,0.06)] order-3 sm:order-3 z-10 bg-gradient-to-b from-amber-50/10 to-white/95';
                  const heightClass = isFirst ? 'h-[360px]' : 'h-[320px]';
                  
                  return (
                    <div
                      key={user._id}
                      className={`relative backdrop-blur-sm border rounded-3xl p-5 flex flex-col items-center justify-between w-full sm:w-52 transition-all hover:translate-y-[-2px] duration-300 ${borderClass} ${heightClass}`}
                    >
                      <div className="flex flex-col items-center w-full">
                        <div className="relative">
                          <div className={`h-16 w-16 overflow-hidden rounded-2xl flex items-center justify-center text-xl font-bold shadow-md border ${
                            isFirst ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : isSecond ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}>
                            {user.profileImage ? (
                              <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                            ) : (
                              user.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className={`absolute -top-3 -right-3 rounded-full h-7 w-7 flex items-center justify-center text-xs font-black shadow-md border-2 text-white ${
                            isFirst ? 'bg-yellow-500 border-yellow-200' : isSecond ? 'bg-slate-400 border-slate-200' : 'bg-amber-700 border-amber-200'
                          }`}>
                            {user.rank}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-sm mt-3 text-center line-clamp-1 w-full">{user.name}</h3>
                      </div>

                      {/* Mini Stats Breakdown Grid */}
                      <div className="w-full space-y-1.5 text-[10px] text-slate-500 border-t border-b border-slate-100/70 py-2.5 my-2 flex flex-col">
                        <div className="flex justify-between w-full font-semibold">
                          <span>🛠️ Listed:</span>
                          <span className="text-slate-700 font-bold">{user.listedTools || 0} tools</span>
                        </div>
                        <div className="flex justify-between w-full font-semibold">
                          <span>📤 Shared:</span>
                          <span className="text-slate-700 font-bold">+{user.lendingPoints || 0} pts</span>
                        </div>
                        <div className="flex justify-between w-full font-semibold">
                          <span>📥 Borrowed:</span>
                          <span className="text-slate-700 font-bold">+{user.borrowingPoints || 0} pts</span>
                        </div>
                        <div className="flex justify-between w-full font-semibold">
                          <span>🌟 Reputation:</span>
                          <span className="text-amber-600 font-bold">+{user.ratingBonus || 0} pts</span>
                        </div>
                      </div>
                      
                      <div className="w-full text-center">
                        <span className="text-lg font-black text-indigo-650 block leading-none">{user.totalScore}</span>
                        <span className="text-[9px] block text-slate-400 uppercase tracking-wider font-bold mt-1">Total Points</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List Table Section */}
            {listUsers.length > 0 && (
              <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-slate-200/50 shadow-lg p-6 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">Rest of the Leaderboard</h3>
                {listUsers.map((user, index) => (
                  <div
                    key={user._id}
                    className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.01)] hover:shadow-md hover:border-slate-200 transition-all gap-4"
                  >
                    <div className="flex items-center gap-4 flex-1 w-full">
                      <div className="w-8 flex justify-center">{renderRankIcon(index + 3)}</div>
                      <div className="h-10 w-10 overflow-hidden bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-center text-sm font-bold text-slate-500 shadow-sm flex-shrink-0">
                        {user.profileImage ? (
                          <img src={user.profileImage} alt={user.name} className="h-full w-full object-cover" />
                        ) : (
                          user.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-800">{user.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{user.listedTools || 0} tools listed</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-[10px] font-bold text-slate-500">
                      <div className="text-center bg-slate-50 border border-slate-100 rounded-lg p-1.5 min-w-16 shadow-inner">
                        <ShareIcon className="h-3.5 w-3.5 text-emerald-500 mx-auto mb-0.5" />
                        <p className="text-slate-700">{user.lendingPoints || 0}</p>
                        <p className="text-[8px] text-slate-400 font-medium">Lending</p>
                      </div>
                      <div className="text-center bg-slate-50 border border-slate-100 rounded-lg p-1.5 min-w-16 shadow-inner">
                        <HandRaisedIcon className="h-3.5 w-3.5 text-indigo-500 mx-auto mb-0.5" />
                        <p className="text-slate-700">{user.borrowingPoints || 0}</p>
                        <p className="text-[8px] text-slate-400 font-medium">Borrowing</p>
                      </div>
                      <div className="text-center bg-slate-50 border border-slate-100 rounded-lg p-1.5 min-w-16 shadow-inner">
                        <StarIcon className="h-3.5 w-3.5 text-amber-500 mx-auto mb-0.5" />
                        <p className="text-slate-700">{user.ratingBonus || 0}</p>
                        <p className="text-[8px] text-slate-400 font-medium">Bonus</p>
                      </div>
                    </div>

                    <div className="text-right w-24 flex-shrink-0 border-l border-slate-150 pl-4">
                      <span className="text-lg font-black text-indigo-600 block leading-none">
                        {user.totalScore}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Points</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
