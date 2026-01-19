

function Packages(){

  return (
    <div className="content">
                <div className="actions-row">
                    <h2>Membership Packages</h2>
                    <button className="btn btn-primary">Create New Package</button>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Package Name</th>
                                <th>Duration</th>
                                <th>Sessions</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Basic Monthly</td>
                                <td>1 Month</td>
                                <td>12 sessions/month</td>
                                <td>$49.99</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Standard Quarterly</td>
                                <td>3 Months</td>
                                <td>40 sessions total</td>
                                <td>$129.99</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Premium Annual</td>
                                <td>12 Months</td>
                                <td>Unlimited</td>
                                <td>$499.99</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Student Plan</td>
                                <td>4 Months</td>
                                <td>48 sessions total</td>
                                <td>$159.99</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Senior Citizen</td>
                                <td>6 Months</td>
                                <td>60 sessions total</td>
                                <td>$199.99</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Corporate Plan</td>
                                <td>12 Months</td>
                                <td>Unlimited</td>
                                <td>$399.99</td>
                                <td><span className="badge badge-active">Active</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Weekend Only</td>
                                <td>3 Months</td>
                                <td>24 sessions total</td>
                                <td>$89.99</td>
                                <td><span className="badge badge-pending">Pending</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                            <tr>
                                <td>Early Bird Special</td>
                                <td>1 Month</td>
                                <td>20 sessions/month</td>
                                <td>$39.99</td>
                                <td><span className="badge badge-expired">Expired</span></td>
                                <td><button className="btn btn-secondary btn-small">Edit</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
  );
}

export default Packages 