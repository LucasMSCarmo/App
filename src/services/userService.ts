import { api } from '@/src/libs/axios';

export type RemoteUser = {
  id: string;
  name: string;
  email: string;
};

export const userService = {
  async findByEmail(email: string): Promise<RemoteUser> {
    const response = await api.get('/users/by-email', {
      params: { email: email.trim().toLowerCase() },
    });
    const user = response.data?.user ?? response.data;
    return {
      id: String(user.id),
      name: String(user.name),
      email: String(user.email),
    };
  },
};
