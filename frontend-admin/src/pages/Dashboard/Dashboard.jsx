
function Dashboard(){

  return (
    // <!-- Content Area -->
            <div className="content">
                {/* <!-- Stats Cards --> */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon members" data-icon="👥">👥</div>
                        <div className="stat-details">
                            <h3>328</h3>
                            <p>Active Members</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon classes" data-icon="💪">💪</div>
                        <div className="stat-details">
                            <h3>12</h3>
                            <p>Today's Classes</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bookings" data-icon="📅">📅</div>
                        <div className="stat-details">
                            <h3>84</h3>
                            <p>Today's Bookings</p>
                        </div>
                    </div>
                </div>

                {/* <!-- Today's Classes Table --> */}
                <div className="card">
                    <div className="card-header">
                        <h2>Today's Classes</h2>
                        <div className="text-right">
                            <span className="badge badge-active">Active: 8</span>
                            <span className="ml-2 badge badge-pending">Upcoming: 4</span>
                        </div>
                    </div>
                    
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Class Name</th>
                                    <th>Trainer</th>
                                    <th>Time</th>
                                    <th>Capacity</th>
                                    <th>Booked Slots</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Morning Yoga</td>
                                    <td>Sarah Johnson</td>
                                    <td>6:00 AM - 7:00 AM</td>
                                    <td>20</td>
                                    <td>18</td>
                                </tr>
                                <tr>
                                    <td>HIIT Training</td>
                                    <td>Mike Chen</td>
                                    <td>7:30 AM - 8:30 AM</td>
                                    <td>15</td>
                                    <td>15</td>
                                </tr>
                                <tr>
                                    <td>Spin Class</td>
                                    <td>Alex Rodriguez</td>
                                    <td>9:00 AM - 10:00 AM</td>
                                    <td>25</td>
                                    <td>22</td>
                                </tr>
                                <tr>
                                    <td>Strength Training</td>
                                    <td>Robert Williams</td>
                                    <td>10:30 AM - 11:30 AM</td>
                                    <td>18</td>
                                    <td>12</td>
                                </tr>
                                <tr>
                                    <td>Pilates</td>
                                    <td>Emma Wilson</td>
                                    <td>5:00 PM - 6:00 PM</td>
                                    <td>20</td>
                                    <td>16</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
  );
}

export default Dashboard 