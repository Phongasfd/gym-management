
import styles from '@/styles/programs.module.css';

function Programs(){
  return(
    // <!-- Programs Section -->
    <section id="programs" className={styles.programs} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Specialized Training Programs</h2>
                <p className={styles["section-subtitle"]}>Select from our expertly designed programs or create your own hybrid routine.</p>
            </div>
            <div className={styles["programs-grid"]}>
              <a href='/member'> 
                        <div key='aaaaaaa1-aaaa-aaaa-aaaa-aaaaaaaaaaa1' className={styles["program-card"]}>
                            <div className={styles["program-header"]}>
                                <h3 className={styles["program-title"]}>Morning Yoga</h3>
                                <span className={styles["program-level"]}>All Levels</span>
                            </div>
                            <p className={styles["program-description"]}>Join this class to improve your fitness.</p>
                            <div className={styles["program-meta"]}>
                                <span><i className="fas fa-clock"></i> 60 min</span>
                            </div>
                        </div>
                  </a>
                
                  <a href='/member'> 
                        <div key='aaaaaaa2-aaaa-aaaa-aaaa-aaaaaaaaaaa2' className={styles["program-card"]}>
                            <div className={styles["program-header"]}>
                                <h3 className={styles["program-title"]}>HIIT Training</h3>
                                <span className={styles["program-level"]}>All Levels</span>
                            </div>
                            <p className={styles["program-description"]}>Join this class to improve your fitness.</p>
                            <div className={styles["program-meta"]}>
                                <span><i className="fas fa-clock"></i> 60 min</span>
                            </div>
                        </div>
                  </a>

                  <a href='/member'> 
                        <div key='aaaaaaa3-aaaa-aaaa-aaaa-aaaaaaaaaaa3' className={styles["program-card"]}>
                            <div className={styles["program-header"]}>
                                <h3 className={styles["program-title"]}>Boxing</h3>
                                <span className={styles["program-level"]}>All Levels</span>
                            </div>
                            <p className={styles["program-description"]}>Join this class to improve your fitness.</p>
                            <div className={styles["program-meta"]}>
                                <span><i className="fas fa-clock"></i> 60 min</span>
                            </div>
                        </div>
                  </a>

                  <a href='/member'> 
                        <div key='aaaaaaa4-aaaa-aaaa-aaaa-aaaaaaaaaaa4' className={styles["program-card"]}>
                            <div className={styles["program-header"]}>
                                <h3 className={styles["program-title"]}>Karate</h3>
                                <span className={styles["program-level"]}>All Levels</span>
                            </div>
                            <p className={styles["program-description"]}>Join this class to improve your fitness.</p>
                            <div className={styles["program-meta"]}>
                                <span><i className="fas fa-clock"></i> 60 min</span>
                            </div>
                        </div>
                  </a>
                
            </div>
        </div>
    </section>
  );
}

export default Programs