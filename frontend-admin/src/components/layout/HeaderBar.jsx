import './HeaderBar.css'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx' 
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();

  const { user, setUser, loading, logout} = useAuth();
  if(loading) return null; // block rendering


  return(
    // <!-- Header -->
    <header className="header">
        <h1 className="page-title">{titles[pathname]}</h1>
        <div className="header-actions">
          {user? (
            <>
            <div className="user-info">
              <div className="user-avatar">JS</div>
              <div className="user-details">
                <div className="user-name">{user.full_name}</div>
                <div className="user-role">{user.role}</div>
              </div>
            </div>
            <button onClick={() => {
              setUser(null);
              logout();
            }} className="btn btn-logout">Logout</button>
            </>
          ) : (
            <>
            <div className="user-info">
              <div className="user-avatar">JS</div>
              <div className="user-details">
                <div className="user-name">Anonymous</div>
                <div className="user-role">Guest</div>
              </div>
            </div>
            <button onClick={() => {navigate("/login")}} className="btn btn-logout">Log In</button>
            </>
          )}

        </div>
    </header>
  );
}

export default HeaderBar 