"use client";

import React, { useState } from 'react';
import styles from './Chatbot.module.css';
import { getAIAdvice } from '@/lib/api';

const Chatbot = () => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    age: '',
    gender: 'male',
    weight: '',
    height: '',
    activity_level: 'low',
    goal: ''
  });
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleOpen = () => setOpen((o) => !o);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await getAIAdvice(form);
      setResponse(result.data);
    } catch (err) {
      setError(err.message || 'Failed to get advice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.chatbotContainer}>
      {open && (
        <div className={styles.chatWindow}>
          <div className={styles.header}>AI Assistant</div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Age:
              <input
                type="number"
                name="age"
                value={form.age}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Gender:
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Weight (kg):
              <input
                type="number"
                name="weight"
                value={form.weight}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Height (cm):
              <input
                type="number"
                name="height"
                value={form.height}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Activity level:
              <select
                name="activity_level"
                value={form.activity_level}
                onChange={handleChange}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
            </label>
            <label>
              Goal:
              <input
                type="text"
                name="goal"
                value={form.goal}
                onChange={handleChange}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Thinking...' : 'Get Advice'}
            </button>
          </form>
          {error && <div className={styles.error}>{error}</div>}
          {response && <div className={styles.response}>{response}</div>}
        </div>
      )}
      <button className={styles.toggleButton} onClick={toggleOpen}>
        {open ? '×' : 'Chat'}
      </button>
    </div>
  );
};

export default Chatbot;
