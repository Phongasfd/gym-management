

function Profile(){

  return (
    <div className="content">
                {/* <!-- User Information --> */}
                <div className="card mb-4">
                    <div className="profile-header">
                        <div className="profile-avatar">JS</div>
                        <div className="profile-info">
                            <h2>John Smith</h2>
                            <p><strong>Role:</strong> Gym Owner / Administrator</p>
                            <p><strong>Email:</strong> john.smith@gympro.com</p>
                            <p><strong>Phone:</strong> (555) 123-4567</p>
                            <p><strong>Joined:</strong> January 15, 2020</p>
                        </div>
                    </div>
                </div>

                {/* <!-- Change Password Form --> */}
                <div className="card">
                    <h2 className="mb-3">Change Password</h2>
                    
                    <form>
                        <div className="form-group">
                            <label for="current-password" className="form-label">Current Password</label>
                            <input type="password" id="current-password" className="form-control" placeholder="Enter current password" />
                        </div>

                        <div className="form-group">
                            <label for="new-password" className="form-label">New Password</label>
                            <input type="password" id="new-password" className="form-control" placeholder="Enter new password" />
                        </div>

                        <div className="form-group">
                            <label for="confirm-password" className="form-label">Confirm New Password</label>
                            <input type="password" id="confirm-password" className="form-control" placeholder="Confirm new password" />
                        </div>

                        <div className="form-group">
                            <button type="submit" className="btn btn-primary">Update Password</button>
                            <button type="reset" className="btn btn-secondary ml-2">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
  );
}

export default Profile