import { api } from '@/src/libs/axios';

type UpdateProfilePayload = {
  name?: string;
  email?: string;
};

type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
};

async function requestWithFallback<T>(
  requests: (() => Promise<T>)[],
): Promise<T> {
  let lastError: unknown;

  for (const request of requests) {
    try {
      return await request();
    } catch (error: any) {
      lastError = error;
      const status = error?.response?.status;

      if (status !== 404 && status !== 405) {
        throw error;
      }
    }
  }

  throw lastError;
}

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post('/auth/register', { name, email, password }),

  me: () =>
    requestWithFallback([
      () => api.get('/auth/me'),
      () => api.get('/users/me'),
    ]),

  updateProfile: (payload: UpdateProfilePayload) =>
    requestWithFallback([
      () => api.patch('/auth/me', payload),
      () => api.patch('/users/me', payload),
      () => api.put('/auth/me', payload),
      () => api.put('/users/me', payload),
    ]),

  changePassword: (payload: ChangePasswordPayload) =>
    requestWithFallback([
      () => api.patch('/auth/password', payload),
      () => api.patch('/auth/me/password', payload),
      () => api.patch('/users/me/password', payload),
      () => api.put('/auth/password', payload),
    ]),
};
