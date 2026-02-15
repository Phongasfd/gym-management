
function Login(){

  return(
    <div className="auth-container">
        <div className="auth-card">
            {/* <!-- Header --> */}
            <div className="auth-header">
                <a href="index.html" className="auth-logo">
                    <span className="auth-logo-icon">💪</span>
                    <span className="auth-logo-text">ELEVATE</span>
                </a>
                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Sign in to your account to continue your fitness journey</p>
            </div>

            {/* <!-- Body --> */}
            <div className="auth-body">
                {/* <!-- OAuth Section --> */}
                <div className="oauth-section">
                    <div className="oauth-buttons">
                        <a href="#" className="oauth-btn google">
                            <i className="fab fa-google oauth-icon"></i>
                            <span>Continue with Google</span>
                        </a>
                        <a href="#" className="oauth-btn facebook">
                            <i className="fab fa-facebook-f oauth-icon"></i>
                            <span>Continue with Facebook</span>
                        </a>
                        <a href="#" className="oauth-btn apple">
                            <i className="fab fa-apple oauth-icon"></i>
                            <span>Continue with Apple</span>
                        </a>
                    </div>
                </div>

                {/* <!-- Divider --> */}
                <div className="divider">
                    <span className="divider-text">Or continue with email</span>
                </div>

                {/* <!-- Success/Error Messages --> */}
                <div className="message info">
                    <i className="fas fa-info-circle message-icon"></i>
                    <div>Demo login: Use any email/password combination</div>
                </div>

                {/* <!-- Login Form --> */}
                <form className="auth-form" action="#">
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email Address</label>
                        <input type="email" id="email" className="form-input" placeholder="you@example.com" required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input type="password" id="password" className="form-input" placeholder="Enter your password" required />
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" className="checkbox" checked />
                            <span>Remember me</span>
                        </label>
                        <a href="#" className="forgot-password">Forgot password?</a>
                    </div>

                    <button type="submit" className="auth-submit">
                        Sign In to Your Account
                    </button>
                </form>

                {/* <!-- Alternative --> */}
                <div className="auth-alternative">
                    <p>New to Elevate Fitness?</p>
                    <a href="/signup" className="auth-link">Create an account</a>
                </div>

                {/* <!-- Terms --> */}
                <div className="auth-terms">
                    By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </div>
            </div>

            {/* <!-- Footer --> */}
            <div className="auth-footer">
                <div className="auth-footer-links">
                    <a href="index.html">Home</a>
                    <a href="#">Help Center</a>
                    <a href="#">Privacy</a>
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

export default Login;