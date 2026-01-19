import {Routes, Route, Navigate} from 'react-router-dom'
import Home from './Home.jsx'

function AppRoutes(){

  return(
    <Routes>
      <Route path="/" element={<Navigate to="/home" replace />} />
      {/* Auto redirect */}
      <Route path="/home" element={<Home />} />
    </Routes>
  );
}

export default AppRoutes
