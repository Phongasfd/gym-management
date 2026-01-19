
function Classes(){

  return (
    // <!-- Content Area -->
    <div className="content">
        <div className="actions-row">
            <h2>Fitness Classes</h2>
            <button className="btn btn-primary">Schedule New Class</button>
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
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Morning Yoga</td>
                        <td>Sarah Johnson</td>
                        <td>Mon, Wed, Fri 6:00 AM</td>
                        <td>20</td>
                        <td>18</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>HIIT Training</td>
                        <td>Mike Chen</td>
                        <td>Tue, Thu 7:30 AM</td>
                        <td>15</td>
                        <td>15</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>Spin Class</td>
                        <td>Alex Rodriguez</td>
                        <td>Mon-Fri 9:00 AM</td>
                        <td>25</td>
                        <td>22</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>Strength Training</td>
                        <td>Robert Williams</td>
                        <td>Mon, Wed, Fri 10:30 AM</td>
                        <td>18</td>
                        <td>12</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>Pilates</td>
                        <td>Emma Wilson</td>
                        <td>Tue, Thu 5:00 PM</td>
                        <td>20</td>
                        <td>16</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>Zumba</td>
                        <td>Maria Garcia</td>
                        <td>Mon, Wed 6:30 PM</td>
                        <td>30</td>
                        <td>25</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>Boxing Fitness</td>
                        <td>David Lee</td>
                        <td>Tue, Thu 7:00 PM</td>
                        <td>15</td>
                        <td>14</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                    <tr>
                        <td>Meditation</td>
                        <td>Lisa Wong</td>
                        <td>Sat, Sun 8:00 AM</td>
                        <td>25</td>
                        <td>10</td>
                        <td><button className="btn btn-secondary btn-small">Manage</button></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );
}

export default Classes