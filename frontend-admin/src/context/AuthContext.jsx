import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const fetchUser = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/auth/me', {
        withCredentials: true, // include cookies 
      });
      setUser(res.data.user); 
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();  
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


