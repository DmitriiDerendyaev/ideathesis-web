import axios from 'axios';

// Базовые адреса сервисов
const AUTH_BASE_URL = 'http://localhost:8081';
const USER_BASE_URL = 'http://localhost:8082';
const TOPIC_BASE_URL = 'http://localhost:8084';

// Фабрика для создания axios-инстанса под сервис
export const getAxiosInstance = (service: 'auth' | 'user' | 'topic') => {
  let baseURL = AUTH_BASE_URL;
  if (service === 'user') baseURL = USER_BASE_URL;
  if (service === 'topic') baseURL = TOPIC_BASE_URL;
  const instance = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Перехватчик для добавления токена
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Перехватчик для обработки ошибок и обновления токена (только для auth)
  if (service === 'auth') {
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refreshToken');
            const response = await axios.post(`${AUTH_BASE_URL}/api/v1/refresh-token`, {
              refreshToken,
            });
            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return instance(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }
  return instance;
};

// Для обратной совместимости (auth по умолчанию)
const axiosInstance = getAxiosInstance('auth');
export default axiosInstance; 