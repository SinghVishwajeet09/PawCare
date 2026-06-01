import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { apiFetch } from '../api';
import './PawBot.css';

const PawBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Namaste! Main PawBot hoon. Aapki aur animals ki madad ke liye. Kaise help karun?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      // Optioanl: Fetch location to send context (skipped for simplicity, but could be added)
      const payload = { message: userMessage };
      
      const data = await apiFetch('/chatbot', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setMessages(prev => [...prev, { type: 'bot', text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'bot', text: 'Sorry, kuch technical error aaya. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!isOpen && (
        <button className="pawbot-trigger" onClick={toggleChat}>
          <MessageCircle size={28} color="white" />
        </button>
      )}
      
      {isOpen && (
        <div className="pawbot-container">
          <div className="pawbot-header">
            <h3>🐾 PawBot</h3>
            <button className="close-btn" onClick={toggleChat}>
              <X size={20} color="white" />
            </button>
          </div>
          
          <div className="pawbot-messages">
             {messages.map((msg, idx) => (
               <div key={idx} className={`message-wrapper ${msg.type}`}>
                 <div className={`message-bubble ${msg.type}`}>
                   {msg.text}
                 </div>
               </div>
             ))}
             {loading && (
               <div className="message-wrapper bot">
                 <div className="message-bubble bot loading-dots">
                   ...
                 </div>
               </div>
             )}
             <div ref={messagesEndRef} />
          </div>

          <form className="pawbot-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Type your message..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default PawBot;
