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

  async searchEmployeesBySubdivision(subdivisionName: string, fullName: string, page = 0, size = 5) {
    const response = await axiosInstance.get(`/api/employees/search-by-subdivision?subdivisionName=${encodeURIComponent(subdivisionName)}&fullName=${encodeURIComponent(fullName)}&page=${page}&size=${size}`);
    return response.data;
  },

  async generateCredentials(employeeGuid: string) {
    const response = await axiosInstance.post(`/api/employees/${employeeGuid}/generate-credentials`);
    return response.data;
  },

  async searchStudents(groupName: string, departmentName: string, fullName: string, page = 0, size = 15) {
    const params = new URLSearchParams();
    if (groupName) params.append('groupName', groupName);
    if (departmentName) params.append('departmentName', departmentName);
    if (fullName) params.append('fullName', fullName);
    params.append('page', page.toString());
    params.append('size', size.toString());
    
    const response = await axiosInstance.get(`/api/students/search?${params.toString()}`);
    return response.data;
  },
}; 