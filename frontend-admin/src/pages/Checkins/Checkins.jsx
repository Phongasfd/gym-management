import axiosClient from '../../lib/axios';
import { useState, useEffect } from 'react';


function Checkins(){

    const [checkins, setCheckins] = useState([]);
    const [searchInput, setSearchInput] = useState('');

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 10;

    const filteredCheckins = checkins.filter(member => {
        const search = searchInput.toLowerCase();
        return (
            member.name.toLowerCase().includes(search) ||
            (member.phone && member.phone.includes(search))
        ); // return the member if name or phone matches search
    });

    useEffect(() => {
        const fetchCheckins = async () => {
            try {
                const response = await axiosClient.get(`/members/overview?page=${page}&limit=${limit}`);
    
                setCheckins(response.data.data);
                setTotalPages(response.data.pagination.totalPages);
            } catch (error) {
                console.error('Error fetching check-ins:', error);
            }
        };

        fetchCheckins();
    }, [page]);


    
    return (
    // <!-- Content Area -->
            <div className="content">
                <div className="card mb-4">
                    <h2 className="mb-2">Quick Check-in</h2>
                    <div className="search-bar">
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Search member by name or phone"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                        />
                        <button className="search-btn" onClick={() => setSearchInput(searchInput)}>Search</button>
                    </div>
                </div>

                <h2 className="mb-2">Recent Check-ins</h2>
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Member Name</th>
                                <th>Last Check-in</th>
                                <th>Phone</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCheckins.length > 0 ? (
                                filteredCheckins.map((member) => (
                                    <tr key={member.id}>
                                        <td>{member.name}</td>
                                        <td>{member.lastCheckin ? new Date(member.lastCheckin.time).toLocaleString() : 'No Check-ins'}</td>
                                        <td>{member.phone}</td>
                                        <td>{member.lastCheckin && new Date(member.lastCheckin.time).toDateString() === new Date().toDateString() ?
                                            <span className="badge badge-active">Checked In</span> :
                                            <span className="badge badge-pending">Not Today</span>
                                        }</td>
                                        <td>
                                            {member.lastCheckin && new Date(member.lastCheckin.time).toDateString() === new Date().toDateString() ?
                                                <button className="btn btn-secondary btn-small">Details</button> :
                                                <button className="btn btn-primary btn-small">Check-in</button>
                                            }   
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center">No members found matching your search</td>
                                </tr>
                            )}
                            
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="pagination">
                    <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    >
                    Prev
                    </button>
            
                    <span>
                    Page {page} / {totalPages}
                    </span>
            
                    <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    >
                    Next
                    </button>
                </div>
            </div>
  );
}

export default Checkins