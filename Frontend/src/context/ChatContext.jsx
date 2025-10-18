// ToolSwap/Frontend/src/context/ChatContext.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  // Accept either a value or an updater function, and ensure the function reference is stable
  const updateUnreadCount = useCallback((value) => {
    // if value is function, call with prev, else set direct value
    setUnreadCount((prev) => {
      if (typeof value === 'function') {
        return value(prev);
      }
      // if value is undefined/null -> treat as 0
      return typeof value === 'number' ? value : prev;
    });
  }, []);

  // Memoize the provider value to avoid re-renders for consumers when functions are stable
  const providerValue = useMemo(() => ({
    unreadCount,
    updateUnreadCount
  }), [unreadCount, updateUnreadCount]);

  return (
    <ChatContext.Provider value={providerValue}>
      {children}
    </ChatContext.Provider>
  );
};
