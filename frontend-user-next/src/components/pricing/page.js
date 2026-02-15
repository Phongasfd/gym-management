import styles from '@/styles/pricing.module.css';

function Pricing(){

  return(
    // <!-- Pricing Section -->
    <section id="pricing" className={styles.pricing} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Simple, Transparent Pricing</h2>
                <p className={styles["section-subtitle"]}>Choose the plan that fits your goals. All plans include access to our mobile app.</p>
            </div>
            <div className={styles["pricing-grid"]}>
                <div className={styles["pricing-card"]}>
                    <div className={styles["pricing-header"]}>
                        <h3 className={styles["pricing-title"]}>Basic</h3>
                        <div className={styles["pricing-price"]}>
                            <span className={styles.price}>$29</span>
                            <span className={styles.period}>/month</span>
                        </div>
                    </div>
                    <ul className={styles["pricing-features"]}>
                        <li><i className="fas fa-check"></i> Access to 1 home facility</li>
                        <li><i className="fas fa-check"></i> Basic equipment usage</li>
                        <li><i className="fas fa-check"></i> Mobile app tracking</li>
                        <li><i className="fas fa-times"></i> Live virtual classes</li>
                        <li><i className="fas fa-times"></i> AI training plans</li>
                        <li><i className="fas fa-times"></i> Nutrition guidance</li>
                    </ul>
                    <a href="#" className={`btn btn-outline`}>Get Started</a>
                </div>
                <div className={`${styles["pricing-card"]} featured`}>
                    <div className={styles["pricing-badge"]}>MOST POPULAR</div>
                    <div className={styles["pricing-header"]}>
                        <h3 className={styles["pricing-title"]}>Pro</h3>
                        <div className={styles["pricing-price"]}>
                            <span className={styles.price}>$59</span>
                            <span className={styles.period}>/month</span>
                        </div>
                    </div>
                    <ul className={styles["pricing-features"]}>
                        <li><i className="fas fa-check"></i> Access to all facilities</li>
                        <li><i className="fas fa-check"></i> Premium equipment</li>
                        <li><i className="fas fa-check"></i> Advanced analytics</li>
                        <li><i className="fas fa-check"></i> Unlimited virtual classes</li>
                        <li><i className="fas fa-check"></i> AI training plans</li>
                        <li><i className="fas fa-times"></i> Nutrition guidance</li>
                    </ul>
                    <a href="#" className={`btn btn-primary`}>Start Free Trial</a>
                </div>
                <div className={styles["pricing-card"]}>
                    <div className={styles["pricing-header"]}>
                        <h3 className={styles["pricing-title"]}>Elite</h3>
                        <div className={styles["pricing-price"]}>
                            <span className={styles.price}>$99</span>
                            <span className={styles.period}>/month</span>
                        </div>
                    </div>
                    <ul className={styles["pricing-features"]}>
                        <li><i className="fas fa-check"></i> All Pro features</li>
                        <li><i className="fas fa-check"></i> 1-on-1 coaching sessions</li>
                        <li><i className="fas fa-check"></i> Custom meal plans</li>
                        <li><i className="fas fa-check"></i> Recovery & wellness</li>
                        <li><i className="fas fa-check"></i> Priority booking</li>
                        <li><i className="fas fa-check"></i> Guest passes</li>
                    </ul>
                    <a href="#" className={`btn btn-outline`}>Contact Sales</a>
                </div>
            </div>
        </div>
    </section>
  );
}

export default Pricing