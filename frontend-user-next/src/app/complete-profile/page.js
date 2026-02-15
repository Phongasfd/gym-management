"use client";

import { useState } from "react";
import axios from "../../lib/axios";
import styles from "./page.module.css";

export default function CompleteProfilePage() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dob: "",
    gender: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await axios.post("/complete-profile", form);
      setMessage({ type: "success", text: "Profile saved successfully." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save profile.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Complete Your Profile</h1>
      <p className={styles.description}>Please fill out the fields below to complete your profile.</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.row}>
          <input
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            placeholder="First name"
            required
            className={styles.input}
          />
          <input
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            placeholder="Last name"
            required
            className={styles.input}
          />
        </div>

        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Phone number"
          className={styles.input}
        />

        <input
          type="date"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          placeholder="Date of birth"
          className={styles.input}
        />

        <select name="gender" value={form.gender} onChange={handleChange} className={styles.input}>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>

        <textarea
          name="address"
          value={form.address}
          onChange={handleChange}
          placeholder="Address"
          rows={3}
          className={styles.textarea}
        />

        <div>
          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>

      {message && (
        <div className={message.type === "error" ? styles.messageError : styles.messageSuccess}>
          {message.text}
        </div>
      )}
    </main>
  );
}
