import './SideBar.css'
import { NavLink } from 'react-router-dom'

function SideBar(){
  return (
    // <!-- Sidebar -->
    <aside className="sidebar">
        <div className="logo">Gym<span>Pro</span></div>
        <nav className="nav-menu">
            <NavLink to="/dashboard" className="nav-item">&#128202; Dashboard</NavLink>
            <NavLink to="/members" className="nav-item">&#128101; Members</NavLink>
            <NavLink to="/packages" className="nav-item">&#128230; Packages</NavLink>
            <NavLink to="/classes" className="nav-item">&#127947; Classes</NavLink>
            <NavLink to="/checkins" className="nav-item">&#9989; Check-ins</NavLink>
            <NavLink to="/profile" className="nav-item">&#128100; Profile</NavLink>
            </nav>
    </aside>
  );
}

export default SideBar