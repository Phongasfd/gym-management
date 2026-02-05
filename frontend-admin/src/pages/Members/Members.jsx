import axiosClient from '../../lib/axios';
import { useState, useEffect } from 'react';

function Members(){
    
    const [members, setMembers] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const limit = 10; 

    useEffect(() => {
        fetchMembers();
    }, [page]);

    const fetchMembers = async () => {
        const res = await axiosClient.get(
          `/members/overview?page=${page}&limit=${limit}`
        );
    
        setMembers(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
      };

      return (
        <div className="content">
          <div className="actions-row">
            <h2>All Members</h2>
            <button className="btn btn-primary">Add New Member</button>
          </div>
    
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Membership Package</th>
                  <th>Status</th>
                  <th>Expiry Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
    
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.packageName || "—"}</td>
                    <td>
                      <span className={`badge badge-${member.status}`}>
                        {member.status}
                      </span>
                    </td>
                    <td>{member.expiryDate?.slice(0, 10)}</td>
                    <td>
                      <button className="btn btn-secondary btn-small">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
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

export default Members