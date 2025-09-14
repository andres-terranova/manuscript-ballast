import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MockUser {
  id: string;
  email: string;
}

interface AuthContextType {
  loggedIn: boolean;
  user: MockUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for authentication status
    const isAuthenticated = localStorage.getItem("ballast_authenticated");
    const userEmail = localStorage.getItem("ballast_user_email");
    
    if (isAuthenticated === "true" && userEmail) {
      setUser({ id: "mock-user-id", email: userEmail });
      setLoggedIn(true);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    // Mock authentication - accept demo credentials
    if (email === "demo@ballast.com" && password === "demo123") {
      const mockUser = { id: "mock-user-id", email };
      setUser(mockUser);
      setLoggedIn(true);
      localStorage.setItem("ballast_authenticated", "true");
      localStorage.setItem("ballast_user_email", email);
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    return false;
  };

  const logout = () => {
    setUser(null);
    setLoggedIn(false);
    localStorage.removeItem("ballast_authenticated");
    localStorage.removeItem("ballast_user_email");
  };

  return (
    <AuthContext.Provider value={{ loggedIn, user, login, logout, loading }}>
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