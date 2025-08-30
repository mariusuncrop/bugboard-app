import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, request, tokenStore } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatBytes, formatDateTime } from '../lib/format';
import { useToast } from '../lib/toast';
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Attachment,
  type Comment,
  type Issue,
  type UserSummary,
} from '../lib/types';
import { Avatar } from '../components/Avatar';
import { Label, PriorityBadge, StatusBadge, TypeBadge } from '../components/Badge';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Spinner } from '../components/Spinner';

export function IssueDetailPage() {
  const { key = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notify } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const [issueResponse, commentResponse, attachmentResponse] = await Promise.all([
      request<{ issue: Issue }>(`/issues/${key}`),
      request<{ items: Comment[] }>(`/issues/${key}/comments`),
      request<{ items: Attachment[] }>(`/issues/${key}/attachments`),
    ]);
    setIssue(issueResponse.issue);
    setComments(commentResponse.items);
    setAttachments(attachmentResponse.items);
  }, [key]);

  useEffect(() => {
    setIssue(null);
    setNotFound(false);
    load().catch((error) => {
      if (error instanceof ApiError && error.status === 404) setNotFound(true);
      else notify('Could not load the issue.', 'error');
    });
  }, [load, notify]);

  useEffect(() => {
    request<{ items: UserSummary[] }>('/users')
      .then((response) => setUsers(response.items))
      .catch(() => undefined);
  }, []);

  const patch = async (body: Record<string, unknown>, message: string) => {
    try {
      const response = await request<{ issue: Issue }>(`/issues/${key}`, { method: 'PATCH', body });
      setIssue(response.issue);
      notify(message);
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Update failed.', 'error');
    }
  };

  const addComment = async (event: FormEvent) => {
    event.preventDefault();
    setCommentError(null);
    if (commentBody.trim().length < 2) {
      setCommentError('A comment needs at least 2 characters.');
      return;
    }

    setPosting(true);
    try {
      const response = await request<{ comment: Comment }>(`/issues/${key}/comments`, {
        method: 'POST',
        body: { body: commentBody.trim() },
      });
      setComments((current) => [...current, response.comment]);
      setCommentBody('');
      notify('Comment added.');
    } catch (error) {
      setCommentError(error instanceof ApiError ? error.message : 'Could not post the comment.');
    } finally {
      setPosting(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await request<void>(`/comments/${id}`, { method: 'DELETE' });
      setComments((current) => current.filter((comment) => comment.id !== id));
      notify('Comment deleted.');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Could not delete the comment.', 'error');
    }
  };

  const uploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`/api/issues/${key}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenStore.get() ?? ''}` },
        body: formData,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error?.details?.[0]?.message ?? payload?.error?.message ?? 'Upload failed.');
      }
      setAttachments((current) => [...current, payload.attachment]);
      notify(`${file.name} uploaded.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Upload failed.', 'error');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removeAttachment = async (id: string) => {
    try {
      await request<void>(`/attachments/${id}`, { method: 'DELETE' });
      setAttachments((current) => current.filter((attachment) => attachment.id !== id));
      notify('Attachment removed.');
    } catch {
      notify('Could not remove the attachment.', 'error');
    }
  };

  const deleteIssue = async () => {
    setDeleting(true);
    try {
      await request<void>(`/issues/${key}`, { method: 'DELETE' });
      notify(`${key} deleted.`);
      navigate('/issues');
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Could not delete the issue.', 'error');
      setConfirmingDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (notFound) {
    return (
      <section className="page" data-testid="issue-not-found">
        <h1>Issue not found</h1>
        <p className="muted">
          No issue matches <code>{key}</code>.
        </p>
        <Link to="/issues" className="button button--ghost">
          Back to issues
        </Link>
      </section>
    );
  }

  if (!issue) return <Spinner label="Loading issue" testId="issue-loading" />;

  return (
    <section className="page page--detail" data-testid="issue-detail">
      <header className="page__header">
        <div>
          <p className="breadcrumb">
            <Link to="/issues" data-testid="back-to-issues">
              Issues
            </Link>{' '}
            / <span data-testid="issue-key">{issue.key}</span>
          </p>
          <h1 data-testid="issue-title">{issue.title}</h1>
          <p className="muted" data-testid="issue-reported">
            Reported by {issue.reporter?.name ?? 'unknown'} · {formatDateTime(issue.createdAt)}
          </p>
        </div>

        {user?.role === 'admin' ? (
          <button
            type="button"
            className="button button--danger"
            data-testid="delete-issue"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete issue
          </button>
        ) : (
          <p className="muted" data-testid="delete-issue-hint">
            Only admins can delete issues.
          </p>
        )}
      </header>

      <div className="detail">
        <div className="detail__main">
          <div className="card">
            <h2>Description</h2>
            <p data-testid="issue-description">{issue.description || 'No description provided.'}</p>
            {issue.labels.length ? (
              <div className="chips" data-testid="issue-labels">
                {issue.labels.map((label) => (
                  <Label key={label} value={label} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="card">
            <h2>
              Attachments <span className="muted">({attachments.length})</span>
            </h2>
            <ul className="list" data-testid="attachment-list">
              {attachments.map((attachment) => (
                <li key={attachment.id} data-testid={`attachment-${attachment.filename}`}>
                  <a href={attachment.url} target="_blank" rel="noreferrer" data-testid="attachment-link">
                    {attachment.filename}
                  </a>
                  <span className="muted"> · {formatBytes(attachment.size)}</span>
                  <button
                    type="button"
                    className="link link--danger"
                    data-testid={`remove-attachment-${attachment.filename}`}
                    onClick={() => void removeAttachment(attachment.id)}
                  >
                    Remove
                  </button>
                </li>
              ))}
              {attachments.length === 0 ? (
                <li className="muted" data-testid="attachments-empty">
                  Nothing attached yet.
                </li>
              ) : null}
            </ul>

            <label className="field">
              <span>Add a file (max 2 MB)</span>
              <input ref={fileInput} type="file" data-testid="attachment-input" onChange={uploadFile} />
            </label>
            {uploading ? <Spinner label="Uploading" testId="attachment-uploading" /> : null}
          </div>

          <div className="card">
            <h2>
              Comments <span className="muted">({comments.length})</span>
            </h2>

            <ul className="comments" data-testid="comment-list">
              {comments.map((comment) => (
                <li key={comment.id} className="comment" data-testid={`comment-${comment.id}`}>
                  <Avatar user={comment.author} />
                  <div>
                    <p className="comment__meta">
                      <strong data-testid="comment-author">{comment.author?.name ?? 'Unknown'}</strong>
                      <span className="muted"> · {formatDateTime(comment.createdAt)}</span>
                    </p>
                    <p data-testid="comment-body">{comment.body}</p>
                  </div>
                  {comment.authorId === user?.id || user?.role === 'admin' ? (
                    <button
                      type="button"
                      className="link link--danger"
                      data-testid={`delete-comment-${comment.id}`}
                      onClick={() => void removeComment(comment.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </li>
              ))}
              {comments.length === 0 ? (
                <li className="muted" data-testid="comments-empty">
                  No comments yet.
                </li>
              ) : null}
            </ul>

            <form className="form" data-testid="comment-form" onSubmit={addComment} noValidate>
              <div className="field">
                <label htmlFor="comment">Add a comment</label>
                <textarea
                  id="comment"
                  rows={3}
                  data-testid="comment-body"
                  value={commentBody}
                  onChange={(event) => setCommentBody(event.target.value)}
                />
                {commentError ? (
                  <p className="field__error" data-testid="error-comment">
                    {commentError}
                  </p>
                ) : null}
              </div>
              <button type="submit" className="button button--primary" data-testid="comment-submit" disabled={posting}>
                {posting ? 'Posting…' : 'Comment'}
              </button>
            </form>
          </div>
        </div>

        <aside className="detail__side card" data-testid="issue-side">
          <div className="field">
            <span className="field__label">Type</span>
            <TypeBadge type={issue.type} />
          </div>

          <div className="field">
            <label htmlFor="status-select">Status</label>
            <select
              id="status-select"
              data-testid="issue-status-select"
              value={issue.status}
              onChange={(event) => void patch({ status: event.target.value }, 'Status updated.')}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
            <StatusBadge status={issue.status} />
          </div>

          <div className="field">
            <label htmlFor="priority-select">Priority</label>
            <select
              id="priority-select"
              data-testid="issue-priority-select"
              value={issue.priority}
              onChange={(event) => void patch({ priority: event.target.value }, 'Priority updated.')}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
            <PriorityBadge priority={issue.priority} />
          </div>

          <div className="field">
            <label htmlFor="assignee-select">Assignee</label>
            <select
              id="assignee-select"
              data-testid="issue-assignee-select"
              value={issue.assigneeId ?? ''}
              onChange={(event) => void patch({ assigneeId: event.target.value || null }, 'Assignee updated.')}
            >
              <option value="">Unassigned</option>
              {users.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
            <span className="assignee" data-testid="issue-assignee">
              <Avatar user={issue.assignee} />
              <span>{issue.assignee?.name ?? 'Unassigned'}</span>
            </span>
          </div>

          <p className="muted" data-testid="issue-updated">
            Updated {formatDateTime(issue.updatedAt)}
          </p>
        </aside>
      </div>

      {confirmingDelete ? (
        <ConfirmDialog
          title={`Delete ${issue.key}?`}
          message="This removes the issue along with its comments and attachments. It cannot be undone."
          busy={deleting}
          onConfirm={() => void deleteIssue()}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </section>
  );
}
