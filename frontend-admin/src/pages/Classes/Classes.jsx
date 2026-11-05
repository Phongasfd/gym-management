import axiosClient from "../../lib/axios";
import {useState, useEffect} from "react";
import { useNavigate } from 'react-router-dom';

function Classes(){
    const navigate = useNavigate();

    const [classes, setClasses] = useState([]);

    useEffect(() => {
        const fetchClasses = async () => {
            // paginated: { data, nextCursor }
            const res = await axiosClient.get('/classes?limit=100');
            setClasses(res.data.data);
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