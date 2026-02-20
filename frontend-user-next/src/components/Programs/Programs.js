"use client";

import styles from '@/styles/programs.module.css';
import { useState, useEffect } from 'react';
import { fetchClasses } from '@/lib/api';

function Programs(){
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const data = await fetchClasses();
        setClasses(data);
      } catch (err) {
        setError('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  if (loading) return <div>Loading programs...</div>;
  if (error) return <div>{error}</div>;

  return(
    // <!-- Programs Section -->
    <section id="programs" className={styles.programs} style={{scrollMarginTop: '80px'}}>
        <div className="container">
            <div className={styles["section-header"]}>
                <h2 className={styles["section-title"]}>Specialized Training Programs</h2>
                <p className={styles["section-subtitle"]}>Select from our expertly designed programs or create your own hybrid routine.</p>
            </div>
            <div className={styles["programs-grid"]}>
                {classes.map((cls) => (
                    <div key={cls.id} className={styles["program-card"]}>
                        <div className={styles["program-header"]}>
                            <h3 className={styles["program-title"]}>{cls.name}</h3>
                            <span className={styles["program-level"]}>{cls.level || 'All Levels'}</span>
                        </div>
                        <p className={styles["program-description"]}>{cls.description || 'Join this class to improve your fitness.'}</p>
                        <div className={styles["program-meta"]}>
                            <span><i className="fas fa-clock"></i> {cls.duration || '60'} min</span>
                            <span><i className="fas fa-calendar-alt"></i> {new Date(cls.schedule_time).toLocaleDateString()}</span>
                        </div>
                        <div className={styles["program-progress"]}>
                            <div className={styles["progress-bar"]}>
                                <div className={styles["progress-fill"]} style={{width: `${Math.min(cls._count?.bookings || 0, 100)}%`}}></div>
                            </div>
                            <span>{cls._count?.bookings || 0} bookings</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </section>
  );
}

export default Programs