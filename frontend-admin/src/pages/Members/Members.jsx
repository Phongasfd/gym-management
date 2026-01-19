
function Members(){

  return (
    // <!-- Content Area -->
            <div className="content">
                <div className="actions-row">
                    <h2>All Members</h2>
                    <button className="btn btn-primary">Add New Member</button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Member Name</th>
                                <th>Membership Package</th>
                                <th>Status</th>
                                <th>Expiry Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Michael Johnson</td>
                                <td>Premium Annual</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td>2024-12-15</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>Sarah Williams</td>
                                <td>Standard Monthly</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td>2024-06-30</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>Robert Chen</td>
                                <td>Student Plan</td>
                                <td><span className="badge badge-pending">Pending</span></td>
                                <td>2024-08-20</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>Jennifer Davis</td>
                                <td>Premium Annual</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td>2025-02-10</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>David Miller</td>
                                <td>Basic Quarterly</td>
                                <td><span className="badge badge-expired">Expired</span></td>
                                <td>2024-03-15</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>Emma Wilson</td>
                                <td>Corporate Plan</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td>2024-11-30</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>James Brown</td>
                                <td>Premium Annual</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td>2024-10-05</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                            <tr>
                                <td>Patricia Taylor</td>
                                <td>Senior Citizen</td>
                                <td><span className="badge badge-pending">Pending</span></td>
                                <td>2024-09-15</td>
                                <td><button className="btn btn-secondary btn-small">View</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
  );
}

export default Members