import '@/styles/header.module.css'; 

function Header(){

  return(
    // <!-- Header / Navigation -->
    <header className="header">
        <div className="container">
            <nav className="navbar">
                <a href="#" className="logo">
                    <span className="logo-icon">💪</span>
                    <span className="logo-text">ELEVATE</span>
                </a>
                
                <input type="checkbox" id="menu-toggle" className="menu-toggle" />
                <label htmlFor="menu-toggle" className="menu-button">
                    <span className="menu-line"></span>
                    <span className="menu-line"></span>
                    <span className="menu-line"></span>
                </label>
                
                <ul className="nav-links">
                    <li><a href="#" className="nav-link active">Home</a></li>
                    <li><a href="#" className="nav-link">Programs</a></li>
                    <li><a href="#" className="nav-link">Pricing</a></li>
                    <li><a href="#" className="nav-link">About</a></li>
                    <li><a href="#" className="nav-link">Contact</a></li>
                    <li><a href="login.html" className="nav-link cta-nav">Login <i className="fas fa-arrow-right"></i></a></li>
                </ul>
            </nav>
        </div>
    </header>
  );
}

export default Header