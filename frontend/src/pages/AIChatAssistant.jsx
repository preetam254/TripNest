import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import api from '../services/api.js';

const AIChatAssistant = () => {
  const { user, isAuthenticated } = useAuth();
  const { socket, activeConversations } = useSocket();
  const [searchParams] = useSearchParams();
  const hostIdParam = searchParams.get('chatHost');

  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'inbox'
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  
  // Messages states
  const [messages, setMessages] = useState([]);
  const [aiChatHistory, setAiChatHistory] = useState([
    {
      sender: 'ai',
      text: "Hello! I'm Nestor, your TripNest AI Assistant. How can I help you find stays, plan routes, or review your bookings?",
      createdAt: new Date(),
    },
  ]);

  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiChatHistory, typingUser]);

  // Load Host direct chat or conversations list
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadInbox = async () => {
      try {
        const { data } = await api.get('/messages/conversations');
        if (data.success) {
          setConversations(data.conversations);

          // If URL param is passed, find or create the guest-host chat room
          if (hostIdParam) {
            setActiveTab('inbox');
            setLoading(true);
            const createRes = await api.post('/messages', { receiverId: hostIdParam, text: 'Hello, I am interested in your stay!' });
            if (createRes.data.success) {
              const convId = createRes.data.conversationId;
              
              // Reload conversations list
              const reloadRes = await api.get('/messages/conversations');
              setConversations(reloadRes.data.conversations);

              // Select newly created conversation
              const matchingConv = reloadRes.data.conversations.find(c => c._id === convId);
              if (matchingConv) {
                handleSelectConversation(matchingConv);
              }
            }
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('Error loading inbox details:', err.message);
        setLoading(false);
      }
    };

    loadInbox();
  }, [isAuthenticated, hostIdParam]);

  // Socket triggers for direct messaging
  useEffect(() => {
    if (!socket || activeTab !== 'inbox' || !currentConversation) return;

    // Join conversation room
    socket.emit('join_room', currentConversation._id);

    // Listen for new messages
    socket.on('new_message', ({ conversationId, message }) => {
      if (conversationId === currentConversation._id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    // Listen for typing events
    socket.on('typing', ({ conversationId, userName }) => {
      if (conversationId === currentConversation._id) {
        setTypingUser(userName);
      }
    });

    socket.on('stop_typing', ({ conversationId }) => {
      if (conversationId === currentConversation._id) {
        setTypingUser(null);
      }
    });

    return () => {
      socket.off('new_message');
      socket.off('typing');
      socket.off('stop_typing');
    };
  }, [socket, activeTab, currentConversation]);

  const handleSelectConversation = async (conv) => {
    setCurrentConversation(conv);
    setLoading(true);
    setMessages([]);
    try {
      const { data } = await api.get(`/messages/conversations/${conv._id}/messages`);
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const payloadText = text;
    setText('');

    // Stop typing feedback
    if (socket && currentConversation) {
      socket.emit('stop_typing', { conversationId: currentConversation._id });
      setIsTyping(false);
    }

    if (activeTab === 'ai') {
      // 1. AI Assistant Chat logic
      const userMessage = { sender: 'user', text: payloadText, createdAt: new Date() };
      setAiChatHistory((prev) => [...prev, userMessage]);

      try {
        const { data } = await api.post('/ai/chat', {
          message: payloadText,
          history: aiChatHistory.map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model', text: msg.text }))
        });

        if (data.success) {
          setAiChatHistory((prev) => [
            ...prev,
            { sender: 'ai', text: data.reply, createdAt: new Date() },
          ]);
        }
      } catch (err) {
        setAiChatHistory((prev) => [
          ...prev,
          { sender: 'ai', text: 'Oops! I had a connection glitch. Can you rephrase?', createdAt: new Date() },
        ]);
      }
    } else if (currentConversation) {
      // 2. Direct Messaging logic
      try {
        const participantsIds = currentConversation.participants.map(p => p._id);
        const { data } = await api.post('/messages', {
          conversationId: currentConversation._id,
          text: payloadText,
        });

        if (data.success) {
          // Emit message via websocket
          if (socket) {
            socket.emit('send_message', {
              conversationId: currentConversation._id,
              message: {
                ...data.message,
                sender: { _id: user.id, name: user.name, avatar: user.avatar },
                conversationParticipants: participantsIds,
              },
            });
          }
        }
      } catch (err) {
        console.error('Error sending message:', err.message);
      }
    }
  };

  const handleTypingStatus = (e) => {
    setText(e.target.value);
    if (!socket || !currentConversation) return;

    if (!isTyping && e.target.value.trim() !== '') {
      setIsTyping(true);
      socket.emit('typing', { conversationId: currentConversation._id, userName: user.name.split(' ')[0] });
    } else if (isTyping && e.target.value.trim() === '') {
      setIsTyping(false);
      socket.emit('stop_typing', { conversationId: currentConversation._id });
    }
  };

  const getChatPartner = (conv) => {
    if (!conv) return null;
    return conv.participants.find(p => p._id !== user?.id);
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 80px)', backgroundColor: 'var(--bg-primary)' }}>
      {/* Left Column: Channels/Inbox Lists */}
      <div style={{
        width: '280px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Toggle between AI Chat & Inbox direct chats */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('ai')}
            style={{
              flexGrow: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'ai' ? 'var(--brand-light)' : 'none',
              color: activeTab === 'ai' ? 'var(--brand)' : 'var(--text-secondary)',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Nestor AI
          </button>
          {isAuthenticated && (
            <button
              onClick={() => setActiveTab('inbox')}
              style={{
                flexGrow: 1,
                padding: '16px',
                border: 'none',
                background: activeTab === 'inbox' ? 'var(--brand-light)' : 'none',
                color: activeTab === 'inbox' ? 'var(--brand)' : 'var(--text-secondary)',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Direct Chat
            </button>
          )}
        </div>

        {/* Channels scroll container */}
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {activeTab === 'ai' ? (
            <div style={{ padding: '16px', display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--bg-tertiary)', borderLeft: '4px solid var(--brand)', margin: '8px' }}>
              <span style={{ fontSize: '1.25rem' }}>🤖</span>
              <div>
                <h4 style={{ fontWeight: 700, fontSize: '0.85rem' }}>Nestor AI Assistant</h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent-color)' }}>Online buddy</span>
              </div>
            </div>
          ) : conversations.length === 0 ? (
            <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              No chat logs yet. Click 'Chat with Host' on any stays page.
            </p>
          ) : (
            conversations.map((conv) => {
              const partner = getChatPartner(conv);
              if (!partner) return null;
              const partnerStatus = activeConversations[partner._id] || 'offline';

              return (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: currentConversation?._id === conv._id ? 'var(--bg-tertiary)' : 'transparent',
                    transition: 'background-color 0.2s'
                  }}
                  className="conv-list-item"
                >
                  <div style={{ position: 'relative' }}>
                    <img src={partner.avatar} alt={partner.name} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    {/* Status circle indicator */}
                    <div style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: partnerStatus === 'online' ? 'var(--accent-color)' : '#94a3b8',
                      border: '2px solid white'
                    }} />
                  </div>
                  <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.875rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>{partner.name}</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                      {conv.lastMessage || 'Click to message...'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Right Column: Chat Feed Screen */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {activeTab === 'ai' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem' }}>🤖</span>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem' }}>Nestor AI Assistant</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Answers stays, booking, & refund questions</span>
              </div>
            </div>
          ) : currentConversation ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img src={getChatPartner(currentConversation)?.avatar} alt="partner" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
              <div>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem' }}>{getChatPartner(currentConversation)?.name}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Role: {getChatPartner(currentConversation)?.role.toUpperCase()} | Status: {activeConversations[getChatPartner(currentConversation)?._id] || 'offline'}
                </span>
              </div>
            </div>
          ) : (
            <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-secondary)' }}>Select conversation to begin messaging</h3>
          )}
        </div>

        {/* Message Logs */}
        <div className="chat-messages-container" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {loading ? (
            <div style={{ margin: 'auto', textAlign: 'center' }}>
              <div style={{ border: '3px solid var(--border-color)', borderTop: '3px solid var(--brand)', borderRadius: '50%', width: '32px', height: '32px', animation: 'spin 1s linear infinite' }}></div>
            </div>
          ) : activeTab === 'ai' ? (
            aiChatHistory.map((msg, idx) => (
              <div
                key={idx}
                className={`message-bubble ${msg.sender === 'user' ? 'message-sent' : 'message-received'}`}
              >
                {msg.text}
              </div>
            ))
          ) : currentConversation ? (
            messages.length === 0 ? (
              <p style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Chat initialized. Type a message below.
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`message-bubble ${msg.sender._id === user?.id ? 'message-sent' : 'message-received'}`}
                >
                  <span style={{ fontSize: '0.65rem', display: 'block', opacity: 0.8, marginBottom: '2px', fontWeight: 600 }}>
                    {msg.sender.name.split(' ')[0]}
                  </span>
                  {msg.text}
                </div>
              ))
            )
          ) : (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <span style={{ fontSize: '3rem' }}>💬</span>
              <h4 style={{ marginTop: '15px' }}>Direct Guest-Host Inbox</h4>
              <p style={{ fontSize: '0.85rem' }}>Chat in real-time with hosts about amenities, check-in, or availability.</p>
            </div>
          )}

          {/* Typing Feedback */}
          {typingUser && (
            <div className="message-bubble message-received" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', padding: '8px 12px' }}>
              ✍️ {typingUser} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Text Input area */}
        {(activeTab === 'ai' || currentConversation) && (
          <form onSubmit={handleSendText} style={{
            padding: '16px 24px',
            backgroundColor: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '12px'
          }}>
            <input
              type="text"
              className="form-control"
              placeholder={activeTab === 'ai' ? 'Ask Nestor booking questions...' : 'Type message here...'}
              value={text}
              onChange={handleTypingStatus}
              required
            />
            <button type="submit" className="btn btn-brand" style={{ padding: '10px 24px' }}>Send</button>
          </form>
        )}
      </div>

      <style>{`
        .conv-list-item:hover {
          background-color: var(--bg-tertiary);
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AIChatAssistant;
