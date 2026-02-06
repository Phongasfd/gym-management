import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosClient from '../../lib/axios'

function AddPackage(){
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const payload = {
      name,
      duration_days: Number(duration),
      description,
      price: Number(price),
    };

    try{
      await axiosClient.post('/packages', payload);
      navigate('/packages');
    }catch(err){
      setError(err?.response?.data?.message || 'Failed to create package');
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="content">
      <div className="actions-row">
        <h2>Create Membership Package</h2>
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-group-add">
          <label>Package Name</label>
          <input value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="form-group-add">
          <label>Duration (days)</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1} required />
        </div>

        <div className="form-group-add">
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="form-group-add">
          <label>Price</label>
          <input type="number" value={price} onChange={e => setPrice(e.target.value)} min={0} step="0.01" />
        </div>


        {error && <div className="error">{error}</div>}

        <div className="actions-row">
          <button className="btn btn-secondary" type="button" onClick={() => navigate('/packages')}>Cancel</button>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? 'Loading...' : 'Create Package'}</button>
        </div>
      </form>
    </div>
  )
}

export default AddPackage
