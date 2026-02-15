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
                <div className={styles["program-card"]}>
                    <div className={styles["program-header"]}>
                        <h3 className={styles["program-title"]}>Strength Builder</h3>
                        <span className={styles["program-level"]}>Beginner</span>
                    </div>
                    <p className={styles["program-description"]}>12-week program focusing on foundational strength with progressive overload.</p>
                    <div className={styles["program-meta"]}>
                        <span><i className="fas fa-clock"></i> 45 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 4 days/week</span>
                    </div>
                    <div className={styles["program-progress"]}>
                        <div className={styles["progress-bar"]}>
                            <div className={styles["progress-fill"]} style={{width: '30%'}}></div>
                        </div>
                        <span>30% completion rate</span>
                    </div>
                </div>
                <div className={styles["program-card"]}>
                    <div className={styles["program-header"]}>
                        <h3 className={styles["program-title"]}>Cardio Burn</h3>
                        <span className={styles["program-level"]}>Intermediate</span>
                    </div>
                    <p className={styles["program-description"]}>High-intensity interval training designed to maximize fat loss and endurance.</p>
                    <div className={styles["program-meta"]}>
                        <span><i className="fas fa-clock"></i> 30 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 5 days/week</span>
                    </div>
                    <div className={styles["program-progress"]}>
                        <div className={styles["progress-bar"]}>
                            <div className={styles["progress-fill"]} style={{width: '65%'}}></div>
                        </div>
                        <span>65% completion rate</span>
                    </div>
                </div>
                <div className={styles["program-card"]}>
                    <div className={styles["program-header"]}>
                        <h3 className={styles["program-title"]}>MMA Conditioning</h3>
                        <span className={styles["program-level"]}>Advanced</span>
                    </div>
                    <p className={styles["program-description"]}>Fight-ready conditioning combining strength, agility, and endurance training.</p>
                    <div className={styles["program-meta"]}>
                        <span><i className="fas fa-clock"></i> 60 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 6 days/week</span>
                    </div>
                    <div className={styles["program-progress"]}>
                        <div className={styles["progress-bar"]}>
                            <div className={styles["progress-fill"]} style={{width: '45%'}}></div>
                        </div>
                        <span>45% completion rate</span>
                    </div>
                </div>
                <div className={styles["program-card"]}>
                    <div className={styles["program-header"]}>
                        <h3 className={styles["program-title"]}>Mindful Movement</h3>
                        <span className={styles["program-level"]}>All Levels</span>
                    </div>
                    <p className={styles["program-description"]}>Yoga and mobility flows to improve flexibility, balance, and mental focus.</p>
                    <div className={styles["program-meta"]}>
                        <span><i className="fas fa-clock"></i> 40 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 3 days/week</span>
                    </div>
                    <div className={styles["program-progress"]}>
                        <div className={styles["progress-bar"]}>
                            <div className={styles["progress-fill"]} style={{width: '80%'}}></div>
                        </div>
                        <span>80% completion rate</span>
                    </div>
                </div>
            </div>
        </div>
    </section>
  );
}

export default Programs