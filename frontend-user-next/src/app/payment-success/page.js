"use client";

import styles from './page.module.css';

export default function PaymentStatus() {
  // This page is displayed after the backend has already
  // verified the VNPay response and redirected the user to
  // either /payment-success or /payment-failed. No additional
  // API call is needed here – we simply show a static message.

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon} style={{ color: 'green' }}>✅</div>
        <h2 className={styles.title}>Payment Successful!</h2>
        <p className={styles.message}>Your payment has been processed successfully.</p>
        <button
          onClick={() => (window.location.href = '/')}
          className={`${styles.button} ${styles.buttonPrimary}`}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}