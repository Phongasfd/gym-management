"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

export default function PaymentStatus() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get all query parameters from VNPay return
        const params = {};
        for (let [key, value] of searchParams.entries()) {
          params[key] = value;
        }

        // Send to backend for verification
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/vnpay/check-payment-vnpay?${new URLSearchParams(params)}`);
        const result = await response.json();

        if (response.ok && result.message === 'Payment successful') {
          setStatus('success');
          setMessage('Your payment has been processed successfully!');
        } else {
          setStatus('failed');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred while verifying payment.');
        console.error(error);
      }
    };

    if (searchParams.has('vnp_ResponseCode')) {
      verifyPayment();
    }
  }, [searchParams]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {status === 'verifying' && (
          <>
            <div className={styles.icon}>⏳</div>
            <h2 className={styles.title}>Verifying Payment</h2>
            <p className={styles.message}>Please wait while we verify your payment...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={styles.icon} style={{ color: 'green' }}>✅</div>
            <h2 className={styles.title}>Payment Successful!</h2>
            <p className={styles.message}>{message}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Return to Home
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className={styles.icon} style={{ color: 'red' }}>❌</div>
            <h2 className={styles.title}>Payment Failed</h2>
            <p className={styles.message}>{message}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className={`${styles.button} ${styles.buttonSecondary}`}
            >
              Try Again
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={styles.icon} style={{ color: 'orange' }}>⚠️</div>
            <h2 className={styles.title}>Error</h2>
            <p className={styles.message}>{message}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className={`${styles.button} ${styles.buttonDefault}`}
            >
              Return to Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}