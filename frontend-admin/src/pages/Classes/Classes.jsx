import axiosClient from "../../lib/axios";
import {useState, useEffect} from "react";
import { useNavigate } from 'react-router-dom';

function Classes(){
    const navigate = useNavigate();

    const [classes, setClasses] = useState([]);

    useEffect(() => {
        const fetchClasses = async () => {
            // paginated: { data, nextCursor }, at most 100 a page. Follow the cursor: with one page
            // only, every class after the 100th (the newest ones) was missing from the list.
            const all = [];
            let cursor;
            do {
                const res = await axiosClient.get('/classes', { params: { limit: 100, cursor } });
                all.push(...res.data.data);
                cursor = res.data.nextCursor;
            } while (cursor);
            setClasses(all);
        };
        fetchClasses();

    }, []);
    
    return (
    // <!-- Content Area -->
    <div className="content">
        <div className="actions-row">
            <h2>Fitness Classes</h2>
            <button className="btn btn-primary" onClick={() => navigate('/classes/add')}>Schedule New Class</button>
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
                        <th>Waitlist</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {classes.map(cls => (
                        <tr key={cls.id}>
                            <td>{cls.name}</td>
                            <td>{cls.coach_name}</td>
                            <td>{cls.schedule_time ? new Date(cls.schedule_time).toLocaleString() : 'TBD'}</td>
                            <td>{cls.capacity}</td>
                            <td>{cls.bookedSlots}</td>
                            <td>{cls.waitlistCount}</td>
                            <td><button onClick={() => navigate(`/classes/${cls.id}`)} className="btn btn-secondary btn-small">Manage</button></td>
                        </tr>
                    ))}
                   
                </tbody>
            </table>
        </div>
    </div>
  );
}

export default Classes