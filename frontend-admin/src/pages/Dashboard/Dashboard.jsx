import axiosClient from '../../lib/axios';
import { useEffect, useState } from 'react';



function Dashboard(){

    const [ activeCount, setActiveCount ] = useState(0);
    const [ todayClassesCount, setTodayClassesCount ] = useState(0);
    const [ todayClasses, setTodayClasses ] = useState([]);
    const [todayBookingsCount, setTodayBookingsCount ] = useState(0); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardStats = async () => {
          try {
            const [membersRes, classesRes] = await Promise.all([
              axiosClient.get('/members?count=active'),
              axiosClient.get('/classes/today'),
            ]);
      
            setActiveCount(membersRes.data.activeCount);
            setTodayClassesCount(classesRes.data.count);
            setTodayClasses(classesRes.data.classes);
            setTodayBookingsCount(classesRes.data.totalBookingsToday);
            
          } catch (error) {
            console.error('Error fetching dashboard stats:', error);
          } finally {
            setLoading(false);
          }
        };
      
        fetchDashboardStats();
      }, []);
      
    
 
    return (
    // <!-- Content Area -->
            <div className="content">
                {/* <!-- Stats Cards --> */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon members"></div>
                        <div className="stat-details">
                            <h3>{loading ? 'Loading...' : activeCount}</h3>
                            <p>Active Members</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon classes"></div>
                        <div className="stat-details">
                            <h3>{loading ? 'Loading...' : todayClassesCount}</h3>
                            <p>Today's Classes</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon bookings"></div>
                        <div className="stat-details">
                            <h3>{loading ? 'Loading...' : todayBookingsCount}</h3>
                            <p>Today's Bookings</p>
                        </div>
                    </div>
                </div>

                {/* <!-- Today's Classes Table --> */}
                <div className="card">
                    <div className="card-header">
                        <h2>Today's Classes</h2>
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
                        {loading ? (
                            <tr>
                            <td colSpan="5" style={{ textAlign: 'center' }}>
                                Loading...
                            </td>
                            </tr>
                        ) : todayClasses.length === 0 ? (
                            <tr>
                            <td colSpan="5" style={{ textAlign: 'center' }}>
                                No classes today
                            </td>
                            </tr>
                        ) : (
                            todayClasses.map((cls) => (
                            <tr key={cls.id}>
                                <td>{cls.name}</td>
                                <td>{cls.coach_name || '—'}</td>
                                <td>
                                {new Date(cls.schedule_time).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                                {' - '}
                                {new Date(cls.end_time).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                                </td>
                                <td>{cls.capacity}</td>
                                <td>{cls.bookedSlots ?? 0}</td>
                            </tr>
                            ))
                        )}
                        </tbody>

                        </table>
                    </div>
                </div>
            </div>
  );
}

export default Dashboard 