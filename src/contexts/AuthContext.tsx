import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  loggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user was previously logged in
    const wasLoggedIn = localStorage.getItem('ballast_authenticated') === 'true';
    setLoggedIn(wasLoggedIn);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simple validation - any email and password works
    if (email && password) {
      setLoggedIn(true);
      localStorage.setItem('ballast_authenticated', 'true');
      return true;
    }
    return false;
  };

  const logout = () => {
    setLoggedIn(false);
    localStorage.removeItem('ballast_authenticated');
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};