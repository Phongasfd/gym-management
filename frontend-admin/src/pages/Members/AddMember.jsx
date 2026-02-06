import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosClient from '../../lib/axios'

function AddMember(){
  const navigate = useNavigate()

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [date_of_birth, setDateOfBirth] = useState('');
  const [pkg, setPkg] = useState('');
  const [packages, setPackages] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPackages = async () => {
      const res = await axiosClient.get('/packages');
      setPackages(res.data || []);
    }
    fetchPackages();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      full_name,
      email,
      phone,
      gender,
      date_of_birth,

      // packageName: pkg || null,
    };

    try{
      await axiosClient.post('/members', payload);
      // await axiosClient.post('/subscriptions'); 

      navigate('/members');
    }catch(err){
      setError(err?.response?.data?.message || 'Failed to create member');
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="content">
      <div className="actions-row">
        <h2>Add New Member</h2>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group-add">
          <label>Full Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="form-group-add">
          <label>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" />
        </div>

        <div className="form-group-add">
          <label>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} />
        </div>

        <div className="form-group-add">
          <label>Gender</label>
          <select value={gender} onChange={e => setGender(e.target.value)}>
            <option value="">— Select —</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>

        <div className="form-group-add">
          <label>Date of Birth</label>
          <input type="date" value={date_of_birth} onChange={e => setDateOfBirth(e.target.value)} />
        </div>

        <div className="form-group-add">
          <label>Package</label>
          <select value={pkg} onChange={e => setPkg(e.target.value)}>
            <option value="">— None —</option>
            {packages.map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="actions-row">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/members')}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Create Member'}</button>
        </div>
      </form>
    </div>
  )
}

export default AddMember
