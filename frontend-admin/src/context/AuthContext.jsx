import { createContext, useContext, useEffect, useState } from 'react';
// import axios from 'axios';
import axiosClient from "../lib/axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // fetch user 

  useEffect(() => {
    let mounted = true;
  
    const load = async () => {
      try {
        // try to refresh tokens first
        await axiosClient.get('/auth/refresh-token', { withCredentials: true }).catch(() => {});
        const res = await axiosClient.get('/auth/staff', {
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
    await axiosClient.post('/auth/logout', {}, {
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


