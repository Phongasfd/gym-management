import axiosClient from "../../lib/axios";
import {useState, useEffect} from "react";
import { useNavigate } from 'react-router-dom';

function Classes(){
    const navigate = useNavigate();

    const [classes, setClasses] = useState([]);

    useEffect(() => {
        const fetchClasses = async () => {
            const res = await axiosClient.get('/classes');
            setClasses(res.data);
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
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {classes.map(cls => (
                        <tr key={cls.id}>
                            <td>{cls.name}</td>
                            <td>{cls.coach_name}</td>
                            <td>{cls.schedule_time.slice(0,10)}</td>
                            <td>{cls.capacity}</td>
                            <td>{cls._count.bookings}</td>
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