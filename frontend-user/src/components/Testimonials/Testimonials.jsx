import './Testimonials.css'

function Testimonials(){

  return(
    // <!-- Testimonials Section -->
    <section className="testimonials">
        <div className="container">
            <div className="section-header">
                <h2 className="section-title">Trusted by 10,000+ Members</h2>
                <p className="section-subtitle">See how our platform has transformed fitness journeys.</p>
            </div>
            <div className="testimonials-grid">
                <div className="testimonial-card">
                    <div className="testimonial-header">
                        <div className="testimonial-avatar">
                            <i className="fas fa-user"></i>
                        </div>
                        <div className="testimonial-info">
                            <h4 className="testimonial-name">Alex Morgan</h4>
                            <span className="testimonial-role">Software Engineer</span>
                        </div>
                    </div>
                    <p className="testimonial-text">"The AI training adapts to my inconsistent schedule better than any human trainer could. I've gained 8lbs of muscle in 3 months."</p>
                    <div className="testimonial-rating">
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                    </div>
                </div>
                <div className="testimonial-card">
                    <div className="testimonial-header">
                        <div className="testimonial-avatar">
                            <i className="fas fa-user"></i>
                        </div>
                        <div className="testimonial-info">
                            <h4 className="testimonial-name">Sarah Chen</h4>
                            <span className="testimonial-role">Marketing Director</span>
                        </div>
                    </div>
                    <p className="testimonial-text">"The 24/7 access fits my busy schedule perfectly. I can workout at 5am or 11pm with full facility access through the app."</p>
                    <div className="testimonial-rating">
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star"></i>
                        <i className="fas fa-star-half-alt"></i>
                    </div>
                </div>
                <div className="testimonial-card">
                    <div className="testimonial-header">
                        <div className="testimonial-avatar">
                            <i className="fas fa-user"></i>
                        </div>
                        <div className="testimonial-info">
                            <h4 className="testimonial-name">Marcus Johnson</h4>
                            <span className="testimonial-role">Professional Athlete</span>
                        </div>
                    </div>
                    <p className="testimonial-text">"The data tracking and analytics helped identify weaknesses in my training I didn't know existed. Game-changing platform."</p>
                    <div className="testimonial-rating">
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