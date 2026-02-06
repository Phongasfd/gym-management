import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosClient from '../../lib/axios'

function AddClass(){
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name,
      coach_name: coachName,
      schedule_time: scheduleTime,
      end_time: endTime,
      capacity: Number(capacity)
    };

    try{
      await axiosClient.post('/classes', payload);
      navigate('/classes');
    }catch(err){
      setError(err?.response?.data?.message || 'Failed to schedule class');
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <div className="actions-row">
        <h2>Schedule New Class</h2>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group-add">
          <label>Class Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="form-group-add">
          <label>Trainer/Coach</label>
          <input value={coachName} onChange={e => setCoachName(e.target.value)} required />
        </div>

        <div className="form-group-add">
          <label>Schedule Date & Time</label>
          <input type="datetime-local" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} required />
        </div>

        <div className="form-group-add">
          <label>End Time</label>
          <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} required />
        </div>

        <div className="form-group-add">
          <label>Capacity</label>
          <input type="number" value={capacity} onChange={e => setCapacity(e.target.value)} min={1} required />
        </div>

        {error && <div className="error">{error}</div>}

        <div className="actions-row">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/classes')}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Schedule Class'}</button>
        </div>
      </form>
    </div>
  )
}

export default AddClass
