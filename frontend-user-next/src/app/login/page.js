import '@/styles/auth.module.css';

function Login(){

  return(
    <div class="auth-container">
        <div class="auth-card">
            {/* <!-- Header --> */}
            <div class="auth-header">
                <a href="index.html" class="auth-logo">
                    <span class="auth-logo-icon">💪</span>
                    <span class="auth-logo-text">ELEVATE</span>
                </a>
                <h1 class="auth-title">Welcome Back</h1>
                <p class="auth-subtitle">Sign in to your account to continue your fitness journey</p>
            </div>

            {/* <!-- Body --> */}
            <div class="auth-body">
                {/* <!-- OAuth Section --> */}
                <div class="oauth-section">
                    <div class="oauth-buttons">
                        <a href="#" class="oauth-btn google">
                            <i class="fab fa-google oauth-icon"></i>
                            <span>Continue with Google</span>
                        </a>
                        <a href="#" class="oauth-btn facebook">
                            <i class="fab fa-facebook-f oauth-icon"></i>
                            <span>Continue with Facebook</span>
                        </a>
                        <a href="#" class="oauth-btn apple">
                            <i class="fab fa-apple oauth-icon"></i>
                            <span>Continue with Apple</span>
                        </a>
                    </div>
                </div>

                {/* <!-- Divider --> */}
                <div class="divider">
                    <span class="divider-text">Or continue with email</span>
                </div>

                {/* <!-- Success/Error Messages --> */}
                <div class="message info">
                    <i class="fas fa-info-circle message-icon"></i>
                    <div>Demo login: Use any email/password combination</div>
                </div>

                {/* <!-- Login Form --> */}
                <form class="auth-form" action="#">
                    <div class="form-group">
                        <label for="email" class="form-label">Email Address</label>
                        <input type="email" id="email" class="form-input" placeholder="you@example.com" required />
                    </div>

                    <div class="form-group">
                        <label for="password" class="form-label">Password</label>
                        <input type="password" id="password" class="form-input" placeholder="Enter your password" required />
                    </div>

                    <div class="form-options">
                        <label class="remember-me">
                            <input type="checkbox" class="checkbox" checked />
                            <span>Remember me</span>
                        </label>
                        <a href="#" class="forgot-password">Forgot password?</a>
                    </div>

                    <button type="submit" class="auth-submit">
                        Sign In to Your Account
                    </button>
                </form>

                {/* <!-- Alternative --> */}
                <div class="auth-alternative">
                    <p>New to Elevate Fitness?</p>
                    <a href="signup.html" class="auth-link">Create an account</a>
                </div>

                {/* <!-- Terms --> */}
                <div class="auth-terms">
                    By continuing, you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </div>
            </div>

            {/* <!-- Footer --> */}
            <div class="auth-footer">
                <div class="auth-footer-links">
                    <a href="index.html">Home</a>
                    <a href="#">Help Center</a>
                    <a href="#">Privacy</a>
                    <a href="#">Contact</a>
                </div>
                <div class="auth-footer-copyright">
                    © 2023 Elevate Fitness. All rights reserved.
                </div>
            </div>
        </div>
    </div>
  );

}

export default Login;