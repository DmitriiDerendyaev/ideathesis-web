import { getAxiosInstance } from '../utils/axios.config';
import type { User } from '../types';

const axiosInstance = getAxiosInstance('user');

export const usersService = {
  async getEmployees(): Promise<User[]> {
    const response = await axiosInstance.get<User[]>('/api/employees');
    return response.data;
  },

  async getEmployeeByGuid(guid: string): Promise<User> {
    const response = await axiosInstance.get<User>(`/api/employees/${guid}`);
    return response.data;
  },

  async searchEmployees(fullName: string): Promise<User[]> {
    const response = await axiosInstance.get<User[]>(`/api/employees/search?fullName=${fullName}`);
    return response.data;
  },

  async getStudents(): Promise<User[]> {
    const response = await axiosInstance.get<User[]>('/api/students');
    return response.data;
  },

  async getStudentByGuid(guid: string): Promise<User> {
    const response = await axiosInstance.get<User>(`/api/students/${guid}`);
    return response.data;
  },
}; 