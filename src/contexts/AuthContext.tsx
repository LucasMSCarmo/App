import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/src/services/authService';

type User = { id: string; name: string; email: string };

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const token = await AsyncStorage.getItem('@auth_token');
        const savedUser = await AsyncStorage.getItem('@user');

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      } catch (e) {
        console.log('Erro ao carregar sessão', e);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  async function login(email: string, password: string) {
    try {
      const { data } = await authService.login(email, password);
      await AsyncStorage.setItem('@auth_token', data.token);
      await AsyncStorage.setItem('@user', JSON.stringify(data.user));
      setUser(data.user);
    }
    catch (e) {
      console.log('Erro ao fazer login', JSON.stringify(e));
      throw e;
    }
  }

  async function register(name: string, email: string, password: string) {
    try {
      const { data } = await authService.register(name, email, password);
      await AsyncStorage.setItem('@auth_token', data.token);
      await AsyncStorage.setItem('@user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (e) {
      console.log('Erro ao fazer registro', e);
      throw e;
    }
  }

  async function logout() {
    try {
      await AsyncStorage.multiRemove(['@auth_token', '@user']);
      setUser(null);
    } catch (e) {
      console.log('Erro ao fazer logout', e);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);