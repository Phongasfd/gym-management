import HeaderBar from '../components/layout/HeaderBar.jsx'
import SideBar from '../components/layout/SideBar.jsx'
import { Outlet } from 'react-router-dom'

function MainLayout(){

  return (
    <div className="container">
      <SideBar />
      <main className="main-content">
        <HeaderBar />
        <Outlet />
      </main>

    </div>
  );
}

export default MainLayout 