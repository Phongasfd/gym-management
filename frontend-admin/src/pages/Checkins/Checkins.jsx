import axiosClient from '../../lib/axios';
import { useState, useEffect } from 'react';


function Checkins(){

    const [checkins, setCheckins] = useState([]);

    useEffect(() => {
        const fetchCheckins = async () => {
            try {
                const response = await axiosClient.get('/members/overview');
                setCheckins(response.data.data);
            } catch (error) {
                console.error('Error fetching check-ins:', error);
            }
        };

        fetchCheckins();
    }, []);
    
    return (
    // <!-- Content Area -->
            <div className="content">
                <div className="card mb-4">
                    <h2 className="mb-2">Quick Check-in</h2>
                    <div className="search-bar">
                        <input type="text" className="form-control" placeholder="Search member by name, ID, or phone number" />
                        <button className="search-btn">Search</button>
                    </div>
                </div>

                <h2 className="mb-2">Recent Check-ins</h2>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Member Name</th>
                                <th>Last Check-in</th>
                                <th>Today's Check-ins</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {checkins.map((member) => (
                                <tr key={member.id}>
                                    <td>{member.name}</td>
                                    <td>{member.lastCheckin ? new Date(member.lastCheckin.time).toLocaleString() : 'No Check-ins'}</td>
                                    <td>{member.lastCheckin && new Date(member.lastCheckin.time).toDateString() === new Date().toDateString() ? 1 : 0}</td>
                                    <td>{member.lastCheckin && new Date(member.lastCheckin.time).toDateString() === new Date().toDateString() ?
                                        <span className="badge badge-active">Checked In</span> :
                                        <span className="badge badge-pending">Not Today</span>
                                    }</td>
                                    <td>
                                        {member.lastCheckin && new Date(member.lastCheckin.time).toDateString() === new Date().toDateString() ?
                                            <button className="btn btn-secondary btn-small">Details</button> :
                                            <button className="btn btn-primary btn-small">Check-in</button>
                                        }   
                                    </td>
                                </tr>
                            ))}
                            
                        </tbody>
                    </table>
                </div>
            </div>
  );
}

export default Checkins