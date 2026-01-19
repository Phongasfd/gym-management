import './Features.css'

function Features(){

  return(
    // <!-- Features Section -->
    <section className="features">
        <div className="container">
            <div className="section-header">
                <h2 className="section-title">Why Choose Our Platform</h2>
                <p className="section-subtitle">We've built a fitness ecosystem that adapts to your goals, schedule, and preferences.</p>
            </div>
            <div className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon">
                        <i className="fas fa-user-circle"></i>
                    </div>
                    <h3 className="feature-title">AI Personal Training</h3>
                    <p className="feature-description">Our algorithm creates custom workouts that evolve with your progress and adapt to your feedback.</p>
                    <a href="#" className="feature-link">Learn more <i className="fas fa-arrow-right"></i></a>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">
                        <i className="fas fa-dumbbell"></i>
                    </div>
                    <h3 className="feature-title">Smart Equipment</h3>
                    <p className="feature-description">Connected machines track your form, weight, and reps, syncing data directly to your dashboard.</p>
                    <a href="#" className="feature-link">Learn more <i className="fas fa-arrow-right"></i></a>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">
                        <i className="fas fa-apple-alt"></i>
                    </div>
                    <h3 className="feature-title">Nutrition AI</h3>
                    <p className="feature-description">Get personalized meal plans that align with your fitness goals and dietary preferences.</p>
                    <a href="#" className="feature-link">Learn more <i className="fas fa-arrow-right"></i></a>
                </div>
                <div className="feature-card">
                    <div className="feature-icon">
                        <i className="fas fa-lock-open"></i>
                    </div>
                    <h3 className="feature-title">24/7 Facility Access</h3>
                    <p className="feature-description">Use our mobile app to access any of our facilities anytime - no staff required.</p>
                    <a href="#" className="feature-link">Learn more <i className="fas fa-arrow-right"></i></a>
                </div>
            </div>
        </div>
    </section>
  );
}

export default Features