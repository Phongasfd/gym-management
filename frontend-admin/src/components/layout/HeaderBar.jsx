import './HeaderBar.css'
import { useLocation } from 'react-router-dom'

const titles = {
  "/dashboard": "Dashboard",
  "/members": "Members",
  "/packages": "Packages",
  "/classes": "Classes",
  "/checkins": "Check-ins",
  "/profile": "Profile",
};

function HeaderBar(){

  const { pathname } = useLocation();


  return(
    // <!-- Header -->
    <header className="header">
        <h1 className="page-title">{titles[pathname]}</h1>
        <div className="header-actions">
            <div className="user-info">
                <div className="user-avatar">JS</div>
                <div className="user-details">
                    <div className="user-name">John Smith</div>
                    <div className="user-role">Owner</div>
                </div>
            </div>
            <button className="btn btn-logout">Logout</button>
        </div>
    </header>
  );
}

export default HeaderBar 