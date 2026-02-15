
function SignUp(){

  return(
    <div className="auth-container">
        <div className="auth-card">
            {/* <!-- Header --> */}
            <div className="auth-header">
                <a href="" className="auth-logo">
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
                        <a href="http://localhost:3000/api/auth/google" className="oauth-btn google">
                            <i className="fab fa-google oauth-icon"></i>
                            <span>Sign up with Google</span>
                        </a>
                    </div>
                </div>

                {/* <!-- Divider --> */}
                <div className="divider">
                    <span className="divider-text">Or sign up with email</span>
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

                    <button type="submit" className="auth-submit">
                        Create Your Account
                    </button>
                </form>

                {/* <!-- Alternative --> */}
                <div className="auth-alternative">
                    <p>Already have an account?</p>
                    <a href="/login" className="auth-link">Sign in instead</a>
                </div>

            </div>

    
        </div>
    </div>
  );
}

export default SignUp;