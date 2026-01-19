import './Programs.css'

function Programs(){

  return(
    // <!-- Programs Section -->
    <section className="programs">
        <div className="container">
            <div className="section-header">
                <h2 className="section-title">Specialized Training Programs</h2>
                <p className="section-subtitle">Select from our expertly designed programs or create your own hybrid routine.</p>
            </div>
            <div className="programs-grid">
                <div className="program-card">
                    <div className="program-header">
                        <h3 className="program-title">Strength Builder</h3>
                        <span className="program-level">Beginner</span>
                    </div>
                    <p className="program-description">12-week program focusing on foundational strength with progressive overload.</p>
                    <div className="program-meta">
                        <span><i className="fas fa-clock"></i> 45 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 4 days/week</span>
                    </div>
                    <div className="program-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '30%'}}></div>
                        </div>
                        <span>30% completion rate</span>
                    </div>
                </div>
                <div className="program-card">
                    <div className="program-header">
                        <h3 className="program-title">Cardio Burn</h3>
                        <span className="program-level">Intermediate</span>
                    </div>
                    <p className="program-description">High-intensity interval training designed to maximize fat loss and endurance.</p>
                    <div className="program-meta">
                        <span><i className="fas fa-clock"></i> 30 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 5 days/week</span>
                    </div>
                    <div className="program-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '65%'}}></div>
                        </div>
                        <span>65% completion rate</span>
                    </div>
                </div>
                <div className="program-card">
                    <div className="program-header">
                        <h3 className="program-title">MMA Conditioning</h3>
                        <span className="program-level">Advanced</span>
                    </div>
                    <p className="program-description">Fight-ready conditioning combining strength, agility, and endurance training.</p>
                    <div className="program-meta">
                        <span><i className="fas fa-clock"></i> 60 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 6 days/week</span>
                    </div>
                    <div className="program-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '45%'}}></div>
                        </div>
                        <span>45% completion rate</span>
                    </div>
                </div>
                <div className="program-card">
                    <div className="program-header">
                        <h3 className="program-title">Mindful Movement</h3>
                        <span className="program-level">All Levels</span>
                    </div>
                    <p className="program-description">Yoga and mobility flows to improve flexibility, balance, and mental focus.</p>
                    <div className="program-meta">
                        <span><i className="fas fa-clock"></i> 40 min/day</span>
                        <span><i className="fas fa-calendar-alt"></i> 3 days/week</span>
                    </div>
                    <div className="program-progress">
                        <div className="progress-bar">
                            <div className="progress-fill" style={{width: '80%'}}></div>
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