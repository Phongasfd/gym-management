
function Login(){

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
            <div className="login-logo" data-icon="💪">💪</div>
            <h1>GymPro Management</h1>
            <p>Internal Admin Dashboard</p>
        </div>

        {/* <!-- Error Message Placeholder --> */}
        <div className="error-message">
            Invalid credentials. Please try again.
        </div>

        {/* <!-- Login Form --> */}
        <form>
            <div className="form-group">
                <label for="email" className="form-label">Email Address</label>
                <input type="email" id="email" className="form-control" placeholder="admin@gympro.com" required />
            </div>

            <div className="form-group">
                <label for="password" className="form-label">Password</label>
                <input type="password" id="password" className="form-control" placeholder="Enter your password" required />
            </div>

            <div className="form-group">
                <button type="submit" className="btn btn-primary w-100">Login to Dashboard</button>
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