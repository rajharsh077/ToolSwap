/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { apiBaseUrl } from '../config';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [requestCount, setRequestCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const updateUnreadCount = useCallback((value) => {
    setUnreadCount((prev) => {
      if (typeof value === 'function') {
        return value(prev);
      }
      return typeof value === 'number' ? value : prev;
    });
  }, []);

  const updateRequestCount = useCallback((value) => {
    setRequestCount((prev) => {
      if (typeof value === 'function') {
        return value(prev);
      }
      return typeof value === 'number' ? value : prev;
    });
  }, []);

  const updateNotificationCount = useCallback((value) => {
    setNotificationCount((prev) => {
      if (typeof value === 'function') {
        return value(prev);
      }
      return typeof value === 'number' ? value : prev;
    });
  }, []);

  const refreshNotifications = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await axios.get(`${apiBaseUrl}/user/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const notificationsData = response.data || [];
      setNotifications(notificationsData);
      const unread = notificationsData.filter((notification) => !notification.isRead).length;
      setNotificationCount(unread);
    } catch (err) {
      console.error('Failed to refresh notifications:', err);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const decoded = jwtDecode(token);
      const currentUserId = decoded.id || decoded._id;

      const response = await axios.get(`${apiBaseUrl}/chat/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const conversationsData = response.data || [];
      let totalUnread = 0;
      conversationsData.forEach((conv) => {
        if (conv.messages) {
          conv.messages.forEach((msg) => {
            const senderId = msg.sender?._id || msg.sender;
            if (senderId && senderId.toString() !== currentUserId && !msg.isRead) {
              totalUnread++;
            }
          });
        }
      });
      setUnreadCount(totalUnread);
    } catch (err) {
      console.error('Failed to refresh unread count:', err);
    }
  }, []);

  const markNotificationsRead = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await axios.put(
        `${apiBaseUrl}/user/notifications/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      setNotificationCount(0);
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    refreshUnreadCount();
  }, [refreshNotifications, refreshUnreadCount]);

  const providerValue = useMemo(
    () => ({
      unreadCount,
      requestCount,
      notificationCount,
      notifications,
      updateUnreadCount,
      updateRequestCount,
      updateNotificationCount,
      refreshNotifications,
      markNotificationsRead,
      refreshUnreadCount,
    }),
    [
      unreadCount,
      requestCount,
      notificationCount,
      notifications,
      updateUnreadCount,
      updateRequestCount,
      updateNotificationCount,
      refreshNotifications,
      markNotificationsRead,
      refreshUnreadCount,
    ]
  );

  return <ChatContext.Provider value={providerValue}>{children}</ChatContext.Provider>;
};
