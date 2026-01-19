

function Checkins(){
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
                            <tr>
                                <td>Michael Johnson</td>
                                <td>Today, 7:45 AM</td>
                                <td>1</td>
                                <td><span className="badge badge-active">Checked In</span></td>
                                <td><button className="btn btn-secondary btn-small">Details</button></td>
                            </tr>
                            <tr>
                                <td>Sarah Williams</td>
                                <td>Today, 8:30 AM</td>
                                <td>1</td>
                                <td><span className="badge badge-active">Checked In</span></td>
                                <td><button className="btn btn-secondary btn-small">Details</button></td>
                            </tr>
                            <tr>
                                <td>Robert Chen</td>
                                <td>Yesterday, 6:15 PM</td>
                                <td>0</td>
                                <td><span className="badge badge-pending">Not Today</span></td>
                                <td><button className="btn btn-primary btn-small">Check-in</button></td>
                            </tr>
                            <tr>
                                <td>Jennifer Davis</td>
                                <td>Today, 9:00 AM</td>
                                <td>1</td>
                                <td><span className="badge badge-active">Checked In</span></td>
                                <td><button className="btn btn-secondary btn-small">Details</button></td>
                            </tr>
                            <tr>
                                <td>David Miller</td>
                                <td>2 days ago</td>
                                <td>0</td>
                                <td><span className="badge badge-expired">Expired</span></td>
                                <td><button className="btn btn-secondary btn-small">Details</button></td>
                            </tr>
                            <tr>
                                <td>Emma Wilson</td>
                                <td>Today, 5:30 PM</td>
                                <td>1</td>
                                <td><span className="badge badge-active">Checked In</span></td>
                                <td><button className="btn btn-secondary btn-small">Details</button></td>
                            </tr>
                            <tr>
                                <td>James Brown</td>
                                <td>Today, 10:00 AM</td>
                                <td>1</td>
                                <td><span className="badge badge-active">Checked In</span></td>
                                <td><button className="btn btn-secondary btn-small">Details</button></td>
                            </tr>
                            <tr>
                                <td>Patricia Taylor</td>
                                <td>Yesterday, 4:45 PM</td>
                                <td>0</td>
                                <td><span className="badge badge-pending">Not Today</span></td>
                                <td><button className="btn btn-primary btn-small">Check-in</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
  );
}

export default Checkins