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

export interface Issue {
  id: string;
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
  issues: Issue[];
  comments: Comment[];
  attachments: Attachment[];
  counters: { bug: number; task: number };
}

export type PublicUser = Omit<User, 'password'>;
