import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeConversations, setActiveConversations] = useState({});

  useEffect(() => {
    let socketInstance;

    if (user) {
      // Connect to the socket server, passing the User ID in handshake query params
      const socketUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;
      socketInstance = io(socketUrl, {
        query: { userId: user.id },
      });

      setSocket(socketInstance);

      // Listen for message notifications (for user-wide alerts)
      socketInstance.on('message_notification', ({ conversationId, messageText, senderName }) => {
        const audioAlert = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA');
        audioAlert.play().catch(() => {}); // Play dynamic micro beep

        setNotifications((prev) => [
          {
            id: Date.now(),
            title: `New Message from ${senderName}`,
            message: messageText,
            conversationId,
            isRead: false,
          },
          ...prev,
        ]);
      });

      // Listen for online status broadcasts
      socketInstance.on('user_status', ({ userId, status }) => {
        setActiveConversations((prev) => ({
          ...prev,
          [userId]: status,
        }));
      });
    }

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        notifications,
        setNotifications,
        activeConversations,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;
