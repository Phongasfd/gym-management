import './Pricing.css'

function Pricing(){

  return(
    // <!-- Pricing Section -->
    <section className="pricing">
        <div className="container">
            <div className="section-header">
                <h2 className="section-title">Simple, Transparent Pricing</h2>
                <p className="section-subtitle">Choose the plan that fits your goals. All plans include access to our mobile app.</p>
            </div>
            <div className="pricing-grid">
                <div className="pricing-card">
                    <div className="pricing-header">
                        <h3 className="pricing-title">Basic</h3>
                        <div className="pricing-price">
                            <span className="price">$29</span>
                            <span className="period">/month</span>
                        </div>
                    </div>
                    <ul className="pricing-features">
                        <li><i className="fas fa-check"></i> Access to 1 home facility</li>
                        <li><i className="fas fa-check"></i> Basic equipment usage</li>
                        <li><i className="fas fa-check"></i> Mobile app tracking</li>
                        <li><i className="fas fa-times"></i> Live virtual classes</li>
                        <li><i className="fas fa-times"></i> AI training plans</li>
                        <li><i className="fas fa-times"></i> Nutrition guidance</li>
                    </ul>
                    <a href="#" className="btn btn-outline">Get Started</a>
                </div>
                <div className="pricing-card featured">
                    <div className="pricing-badge">MOST POPULAR</div>
                    <div className="pricing-header">
                        <h3 className="pricing-title">Pro</h3>
                        <div className="pricing-price">
                            <span className="price">$59</span>
                            <span className="period">/month</span>
                        </div>
                    </div>
                    <ul className="pricing-features">
                        <li><i className="fas fa-check"></i> Access to all facilities</li>
                        <li><i className="fas fa-check"></i> Premium equipment</li>
                        <li><i className="fas fa-check"></i> Advanced analytics</li>
                        <li><i className="fas fa-check"></i> Unlimited virtual classes</li>
                        <li><i className="fas fa-check"></i> AI training plans</li>
                        <li><i className="fas fa-times"></i> Nutrition guidance</li>
                    </ul>
                    <a href="#" className="btn btn-primary">Start Free Trial</a>
                </div>
                <div className="pricing-card">
                    <div className="pricing-header">
                        <h3 className="pricing-title">Elite</h3>
                        <div className="pricing-price">
                            <span className="price">$99</span>
                            <span className="period">/month</span>
                        </div>
                    </div>
                    <ul className="pricing-features">
                        <li><i className="fas fa-check"></i> All Pro features</li>
                        <li><i className="fas fa-check"></i> 1-on-1 coaching sessions</li>
                        <li><i className="fas fa-check"></i> Custom meal plans</li>
                        <li><i className="fas fa-check"></i> Recovery & wellness</li>
                        <li><i className="fas fa-check"></i> Priority booking</li>
                        <li><i className="fas fa-check"></i> Guest passes</li>
                    </ul>
                    <a href="#" className="btn btn-outline">Contact Sales</a>
                </div>
            </div>
        </div>
    </section>
  );
}

export default Pricing