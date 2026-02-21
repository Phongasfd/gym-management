"use client";

import styles from '@/styles/pricing.module.css';
import { useState, useEffect } from 'react';
import { createVNPayPayment } from '@/lib/api';

function Pricing(){
  const [paymentLoading, setPaymentLoading] = useState(null);

  const handlePayment = async (pkg) => {
    setPaymentLoading(pkg.id);
    try {
      const paymentUrl = await createVNPayPayment(pkg.price, `Payment for ${pkg.name}`);
      window.location.href = paymentUrl; // Redirect to VNPay
    } catch (err) {
      alert('Failed to initiate payment. Please try again.');
      console.error(err);
    } finally {
      setPaymentLoading(null);
    }
  };


  return(
    // <!-- Pricing Section -->
    <section id="pricing" className={styles.pricing} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Simple, Transparent Pricing</h2>
                <p className={styles["section-subtitle"]}>Choose the plan that fits your goals. All plans include access to our mobile app.</p>
            </div>
            <div className={styles["pricing-grid"]}>
                <div key='11111111-1111-1111-1111-111111111111' className={styles["pricing-card"]}>
                    
                            <div className={styles["pricing-header"]}>
                                <h3 className={styles["pricing-title"]}>Basic 1 Month</h3>
                                <div className={styles["pricing-price"]}>
                                    <span className={styles.price}>500.000 VND</span>
                                    <span className={styles.period}>/30 days</span>
                                </div>
                            </div>
                            <ul className={styles["pricing-features"]}>
                                <li><i className="fas fa-check"></i> Access to gym equipment only</li>
                                <li><i className="fas fa-check"></i> Duration: 30 days</li>
          
                            </ul>
                            <button 
        
                              className="btn btn-outline"
                            >
                              Get Started
                            </button>
                  </div>

                  <div key='22222222-2222-2222-2222-222222222222' className={`${styles["pricing-card"]} ${styles.featured}`}>
                        
                            <div className={styles["pricing-header"]}>
                                <div className={styles["pricing-badge"]}>MOST POPULAR</div>
                                <h3 className={styles["pricing-title"]}>Premium 3 Months</h3>
                                <div className={styles["pricing-price"]}>
                                    <span className={styles.price}>1.300.000 VND</span>
                                    <span className={styles.period}>/90 days</span>
                                </div>
                            </div>
                            <ul className={styles["pricing-features"]}>
                                <li><i className="fas fa-check"></i> Gym + Group classes</li>
                                <li><i className="fas fa-check"></i> Duration: 90 days</li>
          
                            </ul>
                            <button 
        
                              className="btn btn-primary"
                            >
                              Get Started
                            </button>
                  </div>

                  <div key='33333333-3333-3333-3333-333333333333' className={styles["pricing-card"]}>
                        
                            <div className={styles["pricing-header"]}>
                      
                                <h3 className={styles["pricing-title"]}>VIP 6 Months</h3>
                                <div className={styles["pricing-price"]}>
                                    <span className={styles.price}>2.400.000 VND</span>
                                    <span className={styles.period}>/180 days</span>
                                </div>
                            </div>
                            <ul className={styles["pricing-features"]}>
                                <li><i className="fas fa-check"></i> All access + Personal Trainer</li>
                                <li><i className="fas fa-check"></i> Duration: 180 days</li>
          
                            </ul>
                            <button 
        
                              className="btn btn-outline"
                            >
                              Get Started
                            </button>
                  </div>

                  <div key='44444444-4444-4444-4444-444444444444' className={styles["pricing-card"]}>
                        
                            <div className={styles["pricing-header"]}>
                      
                                <h3 className={styles["pricing-title"]}>Student Package</h3>
                                <div className={styles["pricing-price"]}>
                                    <span className={styles.price}>350.000 VND</span>
                                    <span className={styles.period}>/30 days</span>
                                </div>
                            </div>
                            <ul className={styles["pricing-features"]}>
                                <li><i className="fas fa-check"></i> Discounted gym access for students</li>
                                <li><i className="fas fa-check"></i> Duration: 30 days</li>
          
                            </ul>
                            <button 
        
                              className="btn btn-outline"
                            >
                              Get Started
                            </button>
                  </div>

                  
                
            </div>
        </div>
    </section>
  );
}

export default Pricing