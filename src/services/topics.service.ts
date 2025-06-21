import { getAxiosInstance } from '../utils/axios.config';
const axiosInstance = getAxiosInstance('topic');
import type { Topic, TopicComment, TopicChangeLog, PaginatedResponse, TopicStatus } from '../types';

export const topicsService = {
  async getTopicById(topicId: number): Promise<Topic> {
    const response = await axiosInstance.get<Topic>(`/api/topics/${topicId}`);
    return response.data;
  },

  async getTopicHistory(topicId: number): Promise<TopicChangeLog[]> {
    const response = await axiosInstance.get<TopicChangeLog[]>(`/api/topics/${topicId}/history`);
    return response.data;
  },

  async getTopicComments(topicId: number): Promise<TopicComment[]> {
    const response = await axiosInstance.get<TopicComment[]>(`/api/topics/${topicId}/comments`);
    return response.data;
  },

  async addComment(topicId: number, commentText: string, teacherGuid: string): Promise<TopicComment> {
    const response = await axiosInstance.post<TopicComment>(
      `/api/topics/${topicId}/comments`,
      { commentText },
      { headers: { 'X-Teacher-Guid': teacherGuid } }
    );
    return response.data;
  },

  async updateTopicStatus(topicId: number, status: TopicStatus): Promise<string> {
    const response = await axiosInstance.post<string>('/api/topics/status', {
      topicId,
      status,
    });
    return response.data;
  },

  async updateTopicStatusWithStudent(topicId: number, status: TopicStatus, studentGuid: string): Promise<string> {
    const response = await axiosInstance.post<string>('/api/topics/status', {
      topicId,
      status,
    }, {
      headers: { 'X-Student-Guid': studentGuid }
    });
    return response.data;
  },

  async getPendingTopics(teacherGuid: string): Promise<Topic[]> {
    const response = await axiosInstance.get(`/api/topics/teachers/${teacherGuid}/topics/pending`);
    return response.data.map((item: any) => item.topic);
  },

  async getPendingTopicsRaw(teacherGuid: string): Promise<{ topic: Topic; studentGuid: string; createdAt?: string }[]> {
    const response = await axiosInstance.get(`/api/topics/teachers/${teacherGuid}/topics/pending`);
    return response.data.map((item: any) => ({
      topic: item.topic,
      studentGuid: item.studentGuid,
      createdAt: item.createdAt || undefined,
    }));
  },

  async getStudentTopics(studentGuid: string, page: number = 0, size: number = 10): Promise<PaginatedResponse<Topic>> {
    const response = await axiosInstance.get<PaginatedResponse<Topic>>(
      `/api/topics/students/${studentGuid}/topics/generated?page=${page}&size=${size}`
    );
    return response.data;
  },

  async getAllTopicsForTeacher(teacherGuid: string) {
    const response = await axiosInstance.get(`/api/topics/teachers/${teacherGuid}/topics`);
    return response.data;
  },
}; 