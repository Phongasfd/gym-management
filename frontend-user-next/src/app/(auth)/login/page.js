"use client"; 

import { login } from '@/lib/api';
import { useState } from 'react';

function Login(){
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    let link = null;

    if(process.env.NODE_ENV === 'production') {
        link = 'http://54.169.157.109:3000/api/auth/google'; 
    }else {
        link = 'http://localhost:3000/api/auth/google';
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            const result = await login(email, password);
            // Redirect to main page or dashboard
            window.location.href = '/';
        } catch (err) {
            setError(err.msg || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return(
    <div className="auth-container">
        <div className="auth-card">
            {/* <!-- Header --> */}
            <div className="auth-header">
                <a href="" className="auth-logo">
                    <span className="auth-logo-icon"></span>
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
                        <a href={link} className="oauth-btn google">
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
                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email Address</label>
                        <input type="email" id="email" className="form-input" placeholder="you@example.com" 
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input type="password" id="password" className="form-input" placeholder="Enter your password" 
                        value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>

                    <div className="form-options">
                        <label className="remember-me">
                            <input type="checkbox" className="checkbox"  />
                            <span>Remember me</span>
                        </label>
                        <a href="/forgot-password" className="forgot-password">Forgot password?</a>
                    </div>

                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In to Your Account'}
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