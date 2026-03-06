"use client";

import { useState } from 'react';
import { forgotPassword, verifyResetCode, resetPassword } from '@/lib/api';
import styles from './page.module.css';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // Step 1: Email, Step 2: Verification, Step 3: New Password
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Request password reset code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!email) {
        setError('Please enter your email address');
        setLoading(false);
        return;
      }

      const result = await forgotPassword(email);
      setSuccess('If an account exists with this email, a reset code has been sent to your inbox.');
      setStep(2);
    } catch (err) {
      setError(err.msg || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify reset code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!resetCode) {
        setError('Please enter the reset code');
        setLoading(false);
        return;
      }

      const result = await verifyResetCode(email, resetCode);
      setSuccess('Reset code verified! Please create a new password.');
      setStep(3);
    } catch (err) {
      setError(err.msg || 'Invalid or expired reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!newPassword || !confirmPassword) {
        setError('Please enter and confirm your new password');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }

      if (newPassword.length < 8) {
        setError('Password must be at least 8 characters long');
        setLoading(false);
        return;
      }

      const result = await resetPassword(email, resetCode, newPassword);
      setSuccess(result.msg);
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      setError(err.msg || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles["auth-container"]}>
      <div className={styles["auth-card"]}>
        {/* Header */}
        <div className={styles["auth-header"]}>
          <a href="/" className={styles["auth-logo"]}>
            <span className={styles["auth-logo-icon"]}>💪</span>
            <span className={styles["auth-logo-text"]}>ELEVATE</span>
          </a>
          <h1 className={styles["auth-title"]}>Reset Password</h1>
          <p className={styles["auth-subtitle"]}>
            {step === 1 && "Enter your email to receive a reset code"}
            {step === 2 && "Enter the code sent to your email"}
            {step === 3 && "Create a new password for your account"}
          </p>
        </div>

        {/* Body */}
        <div className={styles["auth-body"]}>
          {/* Alert Messages */}
          {error && <div className={`${styles["alert"]} ${styles["alert-error"]}`}>{error}</div>}
          {success && <div className={`${styles["alert"]} ${styles["alert-success"]}`}>{success}</div>}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleSendCode}>
              <div className={styles["form-group"]}>
                <label htmlFor="email" className={styles["form-label"]}>Email Address</label>
                <input
                  id="email"
                  type="email"
                  className={styles["form-input"]}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className={`${styles["btn"]} ${styles["btn-primary"]}`}
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <div className={styles["auth-footer-link"]}>
                <p>Remember your password? <a href="/login">Sign in</a></p>
              </div>
            </form>
          )}

          {/* Step 2: Verification Code */}
          {step === 2 && (
            <form onSubmit={handleVerifyCode}>
              <div className={styles["form-group"]}>
                <label htmlFor="resetCode" className={styles["form-label"]}>Enter Reset Code</label>
                <p className={styles["form-info"]}>We sent a 6-digit code to {email}</p>
                <input
                  id="resetCode"
                  type="text"
                  className={styles["form-input"]}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className={`${styles["btn"]} ${styles["btn-primary"]}`}
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button
                type="button"
                className={`${styles["btn"]} ${styles["btn-link"]}`}
                onClick={() => setStep(1)}
                disabled={loading}
              >
                Use different email
              </button>

              <div className={styles["code-expiry-notice"]}>
                <small>Code expires in 10 minutes</small>
              </div>
            </form>
          )}

          {/* Step 3: New Password */}
          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className={styles["form-group"]}>
                <label htmlFor="newPassword" className={styles["form-label"]}>New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  className={styles["form-input"]}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
                <small className={styles["form-hint"]}>At least 8 characters</small>
              </div>

              <div className={styles["form-group"]}>
                <label htmlFor="confirmPassword" className={styles["form-label"]}>Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className={styles["form-input"]}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className={`${styles["btn"]} ${styles["btn-primary"]}`}
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                className={`${styles["btn"]} ${styles["btn-link"]}`}
                onClick={() => setStep(2)}
                disabled={loading}
              >
                Back
              </button>
            </form>
          )}
        </div>
      </div>


    </div>
  );
}
