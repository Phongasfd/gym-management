import { useAuth } from '../../context/AuthContext.jsx';
import { useState } from 'react';
// import axios from 'axios'; 
import axiosClient from '../../lib/axios';



function Profile(){
    
    const { user } = useAuth();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();

        if(newPassword !== confirm){
            alert('New password and confirm password do not match');
            return; // stop
        }

        try {   
            const res = await axiosClient.patch('/staff/update-password', {
                currentPassword,
                newPassword,
                confirm
            }, {withCredentials: true});
            alert('Password updated successfully');

            setCurrentPassword('');
            setNewPassword('');
            setConfirm('');

        } catch (error) {
            alert(error.response?.data?.msg || 'Update password failed');
        }
        

    };


    
    return (
    <div className="content">
                {/* <!-- User Information --> */}
                <div className="card mb-4">
                    <div className="profile-header">
                        <div className="profile-avatar">JS</div>
                        <div className="profile-info">
                            <h2>{user?.full_name || "John Smith"}</h2>
                            <p><strong>Role:</strong> {user?.role || "Gym Owner / Administrator"}</p>
                            <p><strong>Email:</strong> {user?.email || "john.smith@gympro.com"}</p>
                        </div>
                    </div>
                </div>

                {/* <!-- Change Password Form --> */}
                <div className="card">
                    <h2 className="mb-3">Change Password</h2>
                    
                    <form>
                        <div className="form-group">
                            <label for="current-password" className="form-label">Current Password</label>
                            <input value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" id="current-password" className="form-control" placeholder="Enter current password" />
                        </div>

                        <div className="form-group">
                            <label for="new-password" className="form-label">New Password</label>
                            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" id="new-password" className="form-control" placeholder="Enter new password" />
                        </div>

                        <div className="form-group">
                            <label for="confirm-password" className="form-label">Confirm New Password</label>
                            <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" id="confirm-password" className="form-control" placeholder="Confirm new password" />
                        </div>

                        <div className="form-group">
                            <button onClick={handleUpdate} type="button" className="btn btn-primary">Update Password</button>
                            <button onClick={() => {
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirm(''); 
                            }} type="button" className="btn btn-secondary ml-2">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
  );
}

export default Profile