import './Hero.css'

function Hero(){

  return(
    // <!-- Hero Section -->
    <section className="hero">
        <div className="container">
            <div className="hero-content">
                <div className="hero-badge">
                    <span className="badge-text">LIMITED TIME OFFER</span>
                    <span className="badge-dot"></span>
                    <span className="badge-text">50% OFF FIRST MONTH</span>
                </div>
                <h1 className="hero-title">Build Your <span className="gradient-text">Strongest</span> Body</h1>
                <p className="hero-subtitle">Elevate Fitness combines cutting-edge technology with expert training to deliver personalized fitness journeys. Track progress, join live classNamees, and achieve results faster.</p>
                <div className="hero-cta">
                    <a href="#" className="btn btn-primary">Start Free Trial</a>
                    <a href="#" className="btn btn-secondary">
                        <i className="fas fa-play-circle"></i> Watch Demo
                    </a>
                </div>
                <div className="hero-stats">
                    <div className="stat">
                        <h3>10,000+</h3>
                        <p>Active Members</p>
                    </div>
                    <div className="stat">
                        <h3>98%</h3>
                        <p>Satisfaction Rate</p>
                    </div>
                    <div className="stat">
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
