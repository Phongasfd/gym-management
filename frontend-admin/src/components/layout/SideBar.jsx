import './SideBar.css'
import { NavLink } from 'react-router-dom'

function SideBar(){
  return (
    // <!-- Sidebar -->
    <aside className="sidebar">
        <div className="logo">Gym<span>Pro</span></div>
        <nav className="nav-menu">
            <NavLink to="/dashboard" className="nav-item" data-icon="📊">Dashboard</NavLink>
            <NavLink to="/members" className="nav-item" data-icon="👥">Members</NavLink>
            <NavLink to="/packages" className="nav-item" data-icon="📦">Packages</NavLink>
            <NavLink to="/classes" className="nav-item" data-icon="💪">Classes</NavLink>
            <NavLink to="/checkins" className="nav-item" data-icon="✅">Check-ins</NavLink>
            <NavLink to="/profile" className="nav-item" data-icon="👤">Profile</NavLink>
        </nav>
    </aside>
  );
}

export default SideBar