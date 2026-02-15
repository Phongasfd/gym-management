

function SignUp(){

  return(
    <div className="auth-container">
        <div className="auth-card">
            {/* <!-- Header --> */}
            <div className="auth-header">
                <a href="index.html" className="auth-logo">
                    <span className="auth-logo-icon">💪</span>
                    <span className="auth-logo-text">ELEVATE</span>
                </a>
                <h1 className="auth-title">Start Your Journey</h1>
                <p className="auth-subtitle">Create your account and join our fitness community</p>
            </div>

            {/* <!-- Body --> */}
            <div className="auth-body">
                {/* <!-- OAuth Section --> */}
                <div className="oauth-section">
                    <div className="oauth-buttons">
                        <a href="#" className="oauth-btn google">
                            <i className="fab fa-google oauth-icon"></i>
                            <span>Sign up with Google</span>
                        </a>
                        <a href="#" className="oauth-btn facebook">
                            <i className="fab fa-facebook-f oauth-icon"></i>
                            <span>Sign up with Facebook</span>
                        </a>
                        <a href="#" className="oauth-btn apple">
                            <i className="fab fa-apple oauth-icon"></i>
                            <span>Sign up with Apple</span>
                        </a>
                    </div>
                </div>

                {/* <!-- Divider --> */}
                <div className="divider">
                    <span className="divider-text">Or sign up with email</span>
                </div>

                {/* <!-- Success/Error Messages --> */}
                <div className="message info">
                    <i className="fas fa-info-circle message-icon"></i>
                    <div>Demo signup: No real registration required</div>
                </div>

                {/* <!-- Signup Form --> */}
                <form className="auth-form" action="#">
                    <div className="form-group">
                        <label htmlFor="fullName" className="form-label">Full Name</label>
                        <input type="text" id="fullName" className="form-input" placeholder="Enter your full name" required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupEmail" className="form-label">Email Address</label>
                        <input type="email" id="signupEmail" className="form-input" placeholder="you@example.com" required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupPassword" className="form-label">Password</label>
                        <input type="password" id="signupPassword" className="form-input" placeholder="Create a strong password" required />
                        <div className="form-error">
                            <i className="fas fa-exclamation-circle"></i>
                            Password must be at least 8 characters
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <input type="password" id="confirmPassword" className="form-input" placeholder="Confirm your password" required />
                    </div>

                    <div className="form-group">
                        <label className="remember-me">
                            <input type="checkbox" className="checkbox" required />
                            <span>I agree to receive fitness tips and updates via email</span>
                        </label>
                    </div>

                    <div className="form-group">
                        <label className="remember-me">
                            <input type="checkbox" className="checkbox" required />
                            <span>I accept the <a href="#">Terms of Service</a> and <a>Privacy Policy</a></span>
                        </label>
                    </div>

                    <button type="submit" className="auth-submit">
                        Create Your Account
                    </button>
                </form>

                {/* <!-- Alternative --> */}
                <div className="auth-alternative">
                    <p>Already have an account?</p>
                    <a href="login.html" className="auth-link">Sign in instead</a>
                </div>

                {/* <!-- Benefits --> */}
                <div className="message success">
                    <i className="fas fa-check-circle message-icon"></i>
                    <div>
                        <strong>Join Elevate Fitness and get:</strong><br />
                        • Free 7-day trial • Personalized workout plans<br />
                        • Nutrition guidance • 24/7 facility access
                    </div>
                </div>
            </div>

            {/* <!-- Footer --> */}
            <div className="auth-footer">
                <div className="auth-footer-links">
                    <a href="index.html">Home</a>
                    <a href="#">Programs</a>
                    <a href="#">Pricing</a>
                    <a href="#">Contact</a>
                </div>
                <div className="auth-footer-copyright">
                    © 2023 Elevate Fitness. All rights reserved.
                </div>
            </div>
        </div>
    </div>
  );
}

export default SignUp;