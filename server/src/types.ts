export const STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
export const ISSUE_TYPES = ['bug', 'task'] as const;
export const ROLES = ['admin', 'member'] as const;

export type Status = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];
export type IssueType = (typeof ISSUE_TYPES)[number];
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  /** Plain text on purpose: this is a demo fixture app, not a credential store. */
  password: string;
  role: Role;
  avatarColor: string;
}

export interface Project {
  id: string;
  /** Short uppercase code. Prefixes every issue key, and names the project in URLs. */
  key: string;
  name: string;
  description: string;
  /** Who may see the project's issues. Admins see every project regardless. */
  memberIds: string[];
  /** Next issue number. Each project counts from 1. */
  counter: number;
  createdAt: string;
}

export interface Issue {
  id: string;
  projectId: string;
  /** Project key and a per-project number, e.g. WEB-1. */
  key: string;
  title: string;
  description: string;
  type: IssueType;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  reporterId: string;
  labels: string[];
  /** Sort order inside a board column. Lower comes first. */
  position: number;
  /** Calendar date (YYYY-MM-DD), or null when the issue has no deadline. */
  dueOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  issueId: string;
  filename: string;
  mimeType: string;
  size: number;
  /** base64 payload — fine for a demo, never do this with real uploads. */
  data: string;
  uploadedById: string;
  createdAt: string;
}

export interface Database {
  users: User[];
  projects: Project[];
  issues: Issue[];
  comments: Comment[];
  attachments: Attachment[];
}

export type PublicUser = Omit<User, 'password'>;
