import styles from '@/styles/features.module.css';

function Features(){

  return(
    // <!-- Features Section -->
    <section id="features" className={styles.features} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Why Choose Our Platform</h2>
                <p className={styles["section-subtitle"]}>We've built a fitness ecosystem that adapts to your goals, schedule, and preferences.</p>
            </div>
            <div className={styles["features-grid"]}>
                <div className={styles["feature-card"]}>
                    <div className={styles["feature-icon"]}>
                        <i className="fas fa-user-circle"></i>
                    </div>
                    <h3 className={styles["feature-title"]}>AI Personal Training</h3>
                    <p className={styles["feature-description"]}>Our algorithm creates custom workouts that evolve with your progress and adapt to your feedback.</p>
                  
                </div>
                <div className={styles["feature-card"]}>
                    <div className={styles["feature-icon"]}>
                        <i className="fas fa-dumbbell"></i>
                    </div>
                    <h3 className={styles["feature-title"]}>Smart Equipment</h3>
                    <p className={styles["feature-description"]}>Connected machines track your form, weight, and reps, syncing data directly to your dashboard.</p>
                    
                </div>
                <div className={styles["feature-card"]}>
                    <div className={styles["feature-icon"]}>
                        <i className="fas fa-apple-alt"></i>
                    </div>
                    <h3 className={styles["feature-title"]}>Nutrition AI</h3>
                    <p className={styles["feature-description"]}>Get personalized meal plans that align with your fitness goals and dietary preferences.</p>
                   
                </div>
                <div className={styles["feature-card"]}>
                    <div className={styles["feature-icon"]}>
                        <i className="fas fa-lock-open"></i>
                    </div>
                    <h3 className={styles["feature-title"]}>24/7 Facility Access</h3>
                    <p className={styles["feature-description"]}>Use our mobile app to access any of our facilities anytime - no staff required.</p>
                   
                </div>
            </div>
        </div>
    </section>
  );
}

export default Features