import { Redirect } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

export default function Index() {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return null;

  return isAuthenticated && user
    ? <Redirect href="/home" />
    : <Redirect href="/login" />;
}