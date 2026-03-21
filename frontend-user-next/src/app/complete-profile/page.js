"use client";

import { useState } from "react";
import axiosClient from "@/lib/axios";
import styles from "./page.module.css";

export default function CompleteProfilePage() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDOB] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);



  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await axiosClient.post("/complete-profile", {fullName, phone, dob, gender} );
      setMessage({ type: "success", text: "Profile saved successfully." });
      window.location.href = '/'; 
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
       
          <input
            name="firstName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Full name"
            required
            className={styles.input}
          />


        <input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className={styles.input}
          required
        />

        <input
          type="date"
          name="dob"
          value={dob}
          onChange={(e) => setDOB(e.target.value)}
          placeholder="Date of birth"
          className={styles.input}
          required
        />

        <select required name="gender" value={gender} onChange={(e) => setGender(e.target.value)} className={styles.input}>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>

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
