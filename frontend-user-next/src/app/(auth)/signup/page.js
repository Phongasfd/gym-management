"use client";  

import { useState, useEffect } from 'react';
import { signup } from '@/lib/api';

function SignUp(){

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); 

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if(confirm !== password){
            setError('Confirm password does not match');
            setLoading(false);
            return;
        }


        try {
            const result = await signup(fullName, phone, email, gender, dateOfBirth, password);
            // Redirect to main page or dashboard
            window.location.href = '/login';
        } catch (err) {
            setError(err.msg || 'Signup failed');
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
                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
                    <div className="form-group">
                        <label htmlFor="fullName" className="form-label">Full Name</label>
                        <input type="text" id="fullName" className="form-input" placeholder="Enter your full name" 
                        value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupEmail" className="form-label">Email Address</label>
                        <input type="email" id="signupEmail" className="form-input" placeholder="you@example.com" 
                        value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>


                    <div className="form-group">
                        <label htmlFor="phone" className="form-label">Phone</label>
                        <input type="tel" id="phone" className="form-input" 
                        value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Gender</label>
                        <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-input">
                            <option value="">— Select —</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="dob" className="form-label">Date of Birth</label>
                        <input type="date" id="dob" className="form-input"
                        value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
                    </div>

                    <div className="form-group">
                        <label htmlFor="signupPassword" className="form-label">Password</label>
                        <input type="password" id="signupPassword" className="form-input" placeholder="Create a strong password" 
                        value={password} onChange={(e) => setPassword(e.target.value)} required />
                        {password.length > 0 && password.length < 8 && (
                            <div className="form-error">
                                <i className="fas fa-exclamation-circle"></i>
                                Password must be at least 8 characters
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <input type="password" id="confirmPassword" className="form-input" placeholder="Confirm your password" 
                        value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                    </div>


                    <button type="submit" className="auth-submit" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Your Account'}
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