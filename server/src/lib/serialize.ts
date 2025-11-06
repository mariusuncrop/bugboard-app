import { store } from '../store.js';
import { dueState, daysUntil } from './dates.js';
import { ancestorsOf } from './projects.js';
import type { Attachment, Comment, Issue, IssueLink, LinkType, Project, PublicUser, User } from '../types.js';

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
    parent: (() => {
      const parent = issue.parentId
        ? store.data.issues.find((candidate) => candidate.id === issue.parentId)
        : undefined;
      return parent ? { id: parent.id, key: parent.key, title: parent.title, status: parent.status } : null;
    })(),
    ancestors: ancestorsOf(issue).map((ancestor) => ({ id: ancestor.id, key: ancestor.key, title: ancestor.title })),
    childCount: store.data.issues.filter((candidate) => candidate.parentId === issue.id).length,
    dueState: dueState(issue.dueOn),
    daysUntilDue: issue.dueOn ? daysUntil(issue.dueOn) : null,
    assignee: summarize(findUser(issue.assigneeId)),
    reporter: summarize(findUser(issue.reporterId)),
    commentCount: store.data.comments.filter((comment) => comment.issueId === issue.id).length,
    linkCount: store.data.links.filter((link) => link.fromIssueId === issue.id || link.toIssueId === issue.id).length,
    attachmentCount: store.data.attachments.filter((a) => a.issueId === issue.id).length,
  };
}

/** How a link reads from one end. "blocks" is the only type whose direction matters. */
const WORDING: Record<LinkType, { outward: string; inward: string }> = {
  relates: { outward: 'relates to', inward: 'relates to' },
  blocks: { outward: 'blocks', inward: 'is blocked by' },
  duplicates: { outward: 'duplicates', inward: 'is duplicated by' },
};

export function linkDto(link: IssueLink, fromPerspectiveOf: string) {
  const outward = link.fromIssueId === fromPerspectiveOf;
  const otherId = outward ? link.toIssueId : link.fromIssueId;
  const other = store.data.issues.find((issue) => issue.id === otherId);

  return {
    id: link.id,
    type: link.type,
    direction: outward ? 'outward' : 'inward',
    wording: WORDING[link.type][outward ? 'outward' : 'inward'],
    issue: other
      ? { id: other.id, key: other.key, title: other.title, status: other.status, type: other.type }
      : null,
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
