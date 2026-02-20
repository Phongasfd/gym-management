"use client";

import styles from '@/styles/pricing.module.css';
import { useState, useEffect } from 'react';
import { fetchPackages } from '@/lib/api';

function Pricing(){
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const data = await fetchPackages();
        setPackages(data);
      } catch (err) {
        setError('Failed to load packages');
      } finally {
        setLoading(false);
      }
    };
    loadPackages();
   
  }, []);

  if (loading) return <div>Loading pricing...</div>;
  if (error) return <div>{error}</div>;

  return(
    // <!-- Pricing Section -->
    <section id="pricing" className={styles.pricing} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Simple, Transparent Pricing</h2>
                <p className={styles["section-subtitle"]}>Choose the plan that fits your goals. All plans include access to our mobile app.</p>
            </div>
            <div className={styles["pricing-grid"]}>
                {packages.map((pkg, index) => (
                    <div key={pkg.id} className={`${styles["pricing-card"]} ${index === 1 ? 'featured' : ''}`}>
                        {index === 1 && <div className={styles["pricing-badge"]}>MOST POPULAR</div>}
                        <div className={styles["pricing-header"]}>
                            <h3 className={styles["pricing-title"]}>{pkg.name}</h3>
                            <div className={styles["pricing-price"]}>
                                <span className={styles.price}>{pkg.price} VND</span>
                                <span className={styles.period}>/{pkg.duration_days} days</span>
                            </div>
                        </div>
                        <ul className={styles["pricing-features"]}>
                            <li><i className="fas fa-check"></i> {pkg.description}</li>
                            <li><i className="fas fa-check"></i> Duration: {pkg.duration_days} days</li>
                            {/* Add more features based on package */}
                        </ul>
                        <a href="#" className={`btn ${index === 1 ? 'btn-primary' : 'btn-outline'}`}>Get Started</a>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}

export default Pricing