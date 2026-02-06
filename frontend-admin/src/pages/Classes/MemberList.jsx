import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axiosClient from "../../lib/axios";

function MemberList() {
  const { id } = useParams();
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchMembers = async () => {
      const res = await axiosClient.get(`/classes/${id}/members`);
      setMembers(res.data);
    };
    fetchMembers();
  }, [id]);

  return (
    <div className="content">
      <h2>Booked Members</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id}>
              <td>{m.full_name}</td>
              <td>{m.phone}</td>
              <td>{m.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default MemberList;
