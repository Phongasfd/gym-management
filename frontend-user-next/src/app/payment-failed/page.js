"use client";

import styles from './page.module.css';

export default function PaymentStatus() {
  return (
    <div className={styles.container}>
      <div className={styles.card}>
       
        <h2 className={styles.title}>Payment Failed</h2>
        <p className={styles.message}>Unfortunately the payment could not be completed. Please try again later.</p>
        <button
          onClick={() => (window.location.href = '/')}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Return to Home
        </button>
      </div>
    </div>
  );
}