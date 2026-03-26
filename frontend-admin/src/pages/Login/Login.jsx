import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import axiosClient from '../../lib/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';



function Login(){
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axiosClient.post('/auth/staff-login', 
                { email, password },
                { withCredentials: true }
            );
            if(res.status === 200){
                setUser(res.data.user);
                navigate("/dashboard");
            }
        } catch(err){
            if(err.response){
                setError(err.response.data.message);
            }else{
                setError("Server error");
            }
        }
    };

    return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
            <div className="login-logo" data-icon="💪">💪</div>
            <h1>GymPro Management</h1>
            <p>Internal Admin Dashboard</p>
        </div>

        {/* <!-- Error Message Placeholder --> */}
        {error && <div className="error-message">
            {error}
        </div>}

        {/* <!-- Login Form --> */}
        <form>
            <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input type="email" id="email" className="form-control" placeholder="admin@gympro.com" 
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input type="password" id="password" className="form-control" placeholder="Enter your password" 
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            <div className="form-group">
                <button onClick={handleLogin} type="button" className="btn btn-primary w-100">Login to Dashboard</button>
            </div>
        </form>

        <div className="text-center mt-3">
            <p className="mb-0">For internal use only. Contact IT if you need access.</p>
        </div>
      </div>
    </div>
  );

}

export default Login