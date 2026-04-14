import axiosClient from "../../lib/axios";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'


function Packages(){
    const navigate = useNavigate()

    const [packages, setPackages] = useState([]);
    
    
    useEffect(() => {
        const fetchPackages = async () => {
        const res = await axiosClient.get('/packages');
        setPackages(res.data);
        };

        fetchPackages();

    }, []);
    
    return (
    <div className="content">
                <div className="actions-row">
                    <h2>Membership Packages</h2>
                    <button className="btn btn-primary" onClick={() => navigate('/packages/add')}>Create New Package</button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Package Name</th>
                                <th>Duration</th>
                                <th>Description</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map(pkg => (
                                <tr key={pkg.id}>
                                    <td>{pkg.name}</td>
                                    <td>{pkg.duration_days} Days</td>
                                    <td>{pkg.description}</td>
                                    <td>${pkg.price}</td>
                                    <td><span className={`badge badge-${pkg.is_active ? 'active' : 'inactive'}`}>{pkg.is_active ? 'Active' : 'Inactive'}</span></td>
                                    <td><button onClick={() => axiosClient.delete(`/packages/${pkg.id}`)} className="btn btn-secondary btn-small">Delete</button></td>
                                </tr>
                            ))}
                            
                        </tbody>
                    </table>
                </div>
            </div>
  );
}

export default Packages 