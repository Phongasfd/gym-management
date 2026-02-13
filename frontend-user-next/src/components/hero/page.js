import styles from '@/styles/hero.module.css';

function Hero(){

  return(
    // <!-- Hero Section -->
    <section className={styles.hero}>
        <div className="container">
            <div className={styles["hero-content"]}>
                <div className={styles["hero-badge"]}>
                    <span className={styles["badge-text"]}>LIMITED TIME OFFER</span>
                    <span className={styles["badge-dot"]}></span>
                    <span className={styles["badge-text"]}>50% OFF FIRST MONTH</span>
                </div>
                <h1 className={styles["hero-title"]}>Build Your <span className="gradient-text">Strongest</span> Body</h1>
                <p className={styles["hero-subtitle"]}>Elevate Fitness combines cutting-edge technology with expert training to deliver personalized fitness journeys. Track progress, join live classNamees, and achieve results faster.</p>
                <div className={styles["hero-cta"]}>
                    <a href="#" className={`btn btn-primary`}>Start Free Trial</a>
                    <a href="#" className={`btn btn-secondary`}>
                        <i className="fas fa-play-circle"></i> Watch Demo
                    </a>
                </div>
                <div className={styles["hero-stats"]}>
                    <div className={styles.stat}>
                        <h3>10,000+</h3>
                        <p>Active Members</p>
                    </div>
                    <div className={styles.stat}>
                        <h3>98%</h3>
                        <p>Satisfaction Rate</p>
                    </div>
                    <div className={styles.stat}>
                        <h3>24/7</h3>
                        <p>Virtual Access</p>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}

export default Hero
