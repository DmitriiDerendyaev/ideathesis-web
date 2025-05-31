export interface User {
  guid: string;
  fullName: string;
  email: string;
  role: string;
}

export interface Topic {
  id: number;
  title: string;
  description: string;
  actuality: string;
  problems: string;
  recommendedSkills: string[];
  status: TopicStatus;
}

export enum TopicStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN'
}

export interface TopicComment {
  id: number;
  topicId: number;
  authorType: string;
  authorGuid: string;
  commentText: string;
  createdAt: string;
  parentCommentId?: number;
}

export interface TopicChangeLog {
  id: number;
  topicId: number;
  studentGuid: string;
  title: string;
  description: string;
  actuality: string;
  problems: string;
  status: TopicStatus;
  changeTime: string;
  skills: string[];
}

export interface PaginatedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
} 