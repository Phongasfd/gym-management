import axiosClient from "../../lib/axios";
import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom'


function Packages(){
    const navigate = useNavigate()

    const [packages, setPackages] = useState([]);
    // bumped after a delete/deactivate to load the list again
    const [version, setVersion] = useState(0);

    useEffect(() => {
        let cancelled = false;
        // staff also see deactivated packages; paginated: { data, nextCursor }
        axiosClient.get('/packages?include_inactive=true&limit=100').then((res) => {
            if (!cancelled) setPackages(res.data.data);
        });
        return () => { cancelled = true; };
    }, [version]);

    const deletePackage = async (pkg) => {
        try {
            await axiosClient.delete(`/packages/${pkg.id}`);
        } catch (err) {
            // 409 PACKAGE_IN_USE: members bought it, so deactivate instead of deleting
            if (err?.response?.data?.code === 'PACKAGE_IN_USE') {
                if (!window.confirm(`${pkg.name} has subscriptions and cannot be deleted. Deactivate it instead?`)) return;
                await axiosClient.patch(`/packages/${pkg.id}`, { is_active: false });
            } else {
                alert(err?.response?.data?.message || 'Failed to delete package');
                return;
            }
        }
        setVersion((v) => v + 1);
    };
    
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
                                    <td><button onClick={() => deletePackage(pkg)} className="btn btn-secondary btn-small">Delete</button></td>
                                </tr>
                            ))}
                            
                        </tbody>
                    </table>
                </div>
            </div>
  );
}

export default Packages 