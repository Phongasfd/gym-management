import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // fetch user 

  useEffect(() => {
    let mounted = true;
  
    const load = async () => {
      try {
        const res = await axios.get('http://localhost:3000/api/auth/staff', {
          withCredentials: true,
        });
        if (mounted) setUser(res.data.user);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };
  
    load();
  
    return () => {
      mounted = false;
    };
  }, []);
  

  const logout = async() => {
    await axios.post('http://localhost:3000/api/auth/logout', {}, {
      withCredentials: true, // include cookies 
    });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);


