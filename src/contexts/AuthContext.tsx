import { syncNow } from '@/src/database/sync';
import { authService } from '@/src/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { database } from '../database';

type User = { id: string; name: string; email: string };

type UpdateProfilePayload = {
  name?: string;
  email?: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

type AuthContextData = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const persistUser = useCallback(async (nextUser: User) => {
    await AsyncStorage.setItem('@user', JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const getUserFromResponse = useCallback((data: any, fallback?: User | null): User => {
    const responseUser = data?.user ?? data;
    return {
      id: String(responseUser?.id ?? fallback?.id ?? ''),
      name: String(responseUser?.name ?? fallback?.name ?? ''),
      email: String(responseUser?.email ?? fallback?.email ?? ''),
    };
  }, []);

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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await authService.login(email, password);
      await AsyncStorage.setItem('@auth_token', data.token);
      await persistUser(getUserFromResponse(data));
      await syncNow();
    }
    catch (e) {
      console.log('Erro ao fazer login', JSON.stringify(e));
      throw e;
    }
  }, [getUserFromResponse, persistUser]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    try {
      const { data } = await authService.register(name, email, password);
      await AsyncStorage.setItem('@auth_token', data.token);
      await persistUser(getUserFromResponse(data));
    } catch (e) {
      console.log('Erro ao fazer registro', e);
      throw e;
    }
  }, [getUserFromResponse, persistUser]);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      setUser(null);
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      router.replace('/login');
    } catch (e) {
      console.log('Erro ao fazer logout', e);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await authService.me();
    const nextUser = getUserFromResponse(data);
    await persistUser(nextUser);
  }, [getUserFromResponse, persistUser]);

  const updateProfile = useCallback(async (payload: UpdateProfilePayload) => {
    const { data } = await authService.updateProfile(payload);
    const responseUser = getUserFromResponse(data, user);
    const sentUserFields: UpdateProfilePayload = {};

    if (payload.name !== undefined) sentUserFields.name = payload.name;
    if (payload.email !== undefined) sentUserFields.email = payload.email;

    const nextUser: User = { ...responseUser, ...sentUserFields };

    if (data?.token) {
      await AsyncStorage.setItem('@auth_token', data.token);
    }

    await persistUser(nextUser);
  }, [getUserFromResponse, persistUser, user]);

  const changePassword = useCallback(async (payload: ChangePasswordPayload) => {
    await authService.changePassword(payload);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
      changePassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
