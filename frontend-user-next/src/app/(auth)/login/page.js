
function Login(){

  return(
    <div className="auth-container">
        <div className="auth-card">
            {/* <!-- Header --> */}
            <div className="auth-header">
                <a href="" className="auth-logo">
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
                        <a href="http://localhost:3000/api/auth/google" className="oauth-btn google">
                            <i className="fab fa-google oauth-icon"></i>
                            <span>Continue with Google</span>
                        </a>
                    </div>
                </div>

                {/* <!-- Divider --> */}
                <div className="divider">
                    <span className="divider-text">Or continue with email</span>
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
                            <input type="checkbox" className="checkbox"  />
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

            </div>

        </div>
    </div>
  );

}

export default Login;