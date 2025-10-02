import { store } from '../store.js';
import type { Attachment, Comment, Issue, Project, PublicUser, User } from '../types.js';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

const summarize = (user: User | undefined): UserSummary | null =>
  user ? { id: user.id, name: user.name, email: user.email, avatarColor: user.avatarColor } : null;

const findUser = (id: string | null): User | undefined =>
  id ? store.data.users.find((user) => user.id === id) : undefined;

export function projectDto(project: Project) {
  const { memberIds, ...rest } = project;
  return {
    ...rest,
    issueCount: store.data.issues.filter((issue) => issue.projectId === project.id).length,
    memberCount: memberIds.length,
  };
}

export function projectWithMembersDto(project: Project) {
  return {
    ...projectDto(project),
    members: project.memberIds
      .map((id) => store.data.users.find((user) => user.id === id))
      .filter((user): user is User => Boolean(user))
      .map((user) => ({ ...summarize(user)!, role: user.role })),
  };
}

export function issueDto(issue: Issue) {
  const project = store.data.projects.find((candidate) => candidate.id === issue.projectId);
  return {
    ...issue,
    project: project ? { id: project.id, key: project.key, name: project.name } : null,
    assignee: summarize(findUser(issue.assigneeId)),
    reporter: summarize(findUser(issue.reporterId)),
    commentCount: store.data.comments.filter((comment) => comment.issueId === issue.id).length,
    attachmentCount: store.data.attachments.filter((a) => a.issueId === issue.id).length,
  };
}

export function commentDto(comment: Comment) {
  return { ...comment, author: summarize(findUser(comment.authorId)) };
}

export function attachmentDto(attachment: Attachment) {
  const { data: _data, ...rest } = attachment;
  return {
    ...rest,
    url: `/api/attachments/${attachment.id}`,
    uploadedBy: summarize(findUser(attachment.uploadedById)),
  };
}

export const userDto = (user: PublicUser): PublicUser => user;
