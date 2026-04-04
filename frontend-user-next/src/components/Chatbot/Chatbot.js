"use client";

import React, { useState, useRef, useEffect } from 'react';
import styles from '@/styles/Chatbot.module.css';
import { chatWithAI } from '@/lib/api';

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your gym fitness assistant. I can help you with questions about diet, workout programs, gym packages, and general fitness advice. What would you like to know?'
    }
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

  const toggleOpen = () => setOpen((o) => !o);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAI(newMessages);
      const assistantMessage = { role: 'assistant', content: response.message };
      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble responding right now. Please try again later.'
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.chatbotContainer}>
      {open && (
        <div className={styles.chatWindow}>
          <div className={styles.header}>
            <span>Gym Assistant</span>
            <button onClick={toggleOpen} className={styles.closeButton}>x</button>
          </div>

          <div className={styles.messagesContainer}>
            {messages.map((message, index) => (
              <div
                key={index}
                className={`${styles.message} ${
                  message.role === 'user' ? styles.userMessage : styles.assistantMessage
                }`}
              >
                <div className={styles.messageContent}>
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className={`${styles.message} ${styles.assistantMessage}`}>
                <div className={styles.messageContent}>
                  <div className={styles.typingIndicator}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about diet, workouts, packages..."
              disabled={loading}
              className={styles.inputField}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className={styles.sendButton}
            >
              Send
            </button>
          </form>
        </div>
      )}

      {!open && (
        <button className={styles.toggleButton} onClick={toggleOpen}>
          Chat
        </button>
      )}
    </div>
  );
};

export default Chatbot;
