import { getAxiosInstance } from '../utils/axios.config';
import type { AuthTokens, User } from '../types';

const axiosInstance = getAxiosInstance('auth');

export const authService = {
  async login(username: string, password: string): Promise<AuthTokens & { user?: User }> {
    const response = await axiosInstance.post('/api/v1/bot-login', {
      ulogin: username,
      upassword: password,
    });
    return response.data;
  },

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await axiosInstance.post<AuthTokens>('/api/v1/refresh-token', {
      refreshToken,
    });
    return response.data;
  },
}; 