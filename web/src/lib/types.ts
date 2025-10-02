export type Status = 'backlog' | 'todo' | 'in_progress' | 'in_review' | 'done';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type IssueType = 'bug' | 'task';
export type Role = 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarColor: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

export interface ProjectSummary {
  id: string;
  key: string;
  name: string;
  description: string;
  issueCount: number;
  memberCount: number;
  createdAt: string;
}

export interface ProjectMember extends UserSummary {
  role: Role;
}

export interface Project extends ProjectSummary {
  members: ProjectMember[];
}

export interface Issue {
  id: string;
  projectId: string;
  key: string;
  title: string;
  description: string;
  type: IssueType;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  reporterId: string;
  labels: string[];
  position: number;
  createdAt: string;
  updatedAt: string;
  assignee: UserSummary | null;
  reporter: UserSummary | null;
  commentCount: number;
  attachmentCount: number;
  project: { id: string; key: string; name: string } | null;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: UserSummary | null;
}

export interface Attachment {
  id: string;
  issueId: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
  uploadedBy: UserSummary | null;
}

export interface BoardColumn {
  status: Status;
  title: string;
  issues: Issue[];
}

export interface Stats {
  total: number;
  open: number;
  done: number;
  unassigned: number;
  byStatus: Record<Status, number>;
  byPriority: Record<Priority, number>;
  byType: Record<IssueType, number>;
  byAssignee: { id: string; name: string; avatarColor: string; open: number }[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const STATUSES: Status[] = ['backlog', 'todo', 'in_progress', 'in_review', 'done'];
export const PRIORITIES: Priority[] = ['low', 'medium', 'high', 'critical'];
export const ISSUE_TYPES: IssueType[] = ['bug', 'task'];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};
