import styles from '@/styles/testimonials.module.css'

function Testimonials(){

  return(
    // <!-- Testimonials Section -->
    <section id="testimonials" className={styles.testimonials} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Trusted by 10,000+ Members</h2>
                <p className={styles["section-subtitle"]}>See how our platform has transformed fitness journeys.</p>
            </div>
            <div className={styles["testimonials-grid"]}>
                <div className={styles["testimonial-card"]}>
                    <div className={styles["testimonial-header"]}>
                        <div className={styles["testimonial-avatar"]}>
                            <i className="fas fa-user"></i>
                        </div>
                        <div className={styles["testimonial-info"]}>
                            <h4 className={styles["testimonial-name"]}>Alex Morgan</h4>
                            <span className={styles["testimonial-role"]}>Software Engineer</span>
                        </div>
                    </div>
                    <p className={styles["testimonial-text"]}>"The AI training adapts to my inconsistent schedule better than any human trainer could. I've gained 8lbs of muscle in 3 months."</p>
                    <div className={styles["testimonial-rating"]}>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                    </div>
                </div>
                <div className={styles["testimonial-card"]}>
                    <div className={styles["testimonial-header"]}>
                        <div className={styles["testimonial-avatar"]}>
                            <i className="fas fa-user"></i>
                        </div>
                        <div className={styles["testimonial-info"]}>
                            <h4 className={styles["testimonial-name"]}>Sarah Chen</h4>
                            <span className={styles["testimonial-role"]}>Marketing Director</span>
                        </div>
                    </div>
                    <p className={styles["testimonial-text"]}>"The 24/7 access fits my busy schedule perfectly. I can workout at 5am or 11pm with full facility access through the app."</p>
                    <div className={styles["testimonial-rating"]}>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star-half-alt"></i>
                    </div>
                </div>
                <div className={styles["testimonial-card"]}>
                    <div className={styles["testimonial-header"]}>
                        <div className={styles["testimonial-avatar"]}>
                            <i className="fas fa-user"></i>
                        </div>
                        <div className={styles["testimonial-info"]}>
                            <h4 className={styles["testimonial-name"]}>Marcus Johnson</h4>
                            <span className={styles["testimonial-role"]}>Professional Athlete</span>
                        </div>
                    </div>
                    <p className={styles["testimonial-text"]}>"The data tracking and analytics helped identify weaknesses in my training I didn't know existed. Game-changing platform."</p>
                    <div className={styles["testimonial-rating"]}>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}

export default Testimonials