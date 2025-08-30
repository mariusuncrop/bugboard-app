import { useCallback, useEffect, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, request } from '../lib/api';
import { useToast } from '../lib/toast';
import { PRIORITIES, PRIORITY_LABELS, STATUS_LABELS, type BoardColumn, type Issue, type Status, type UserSummary } from '../lib/types';
import { Avatar } from '../components/Avatar';
import { Label, PriorityBadge, TypeBadge } from '../components/Badge';
import { Spinner } from '../components/Spinner';

export function BoardPage() {
  const { notify } = useToast();
  const [columns, setColumns] = useState<BoardColumn[] | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('');
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<Status | null>(null);

  const loadBoard = useCallback(async () => {
    const response = await request<{ columns: BoardColumn[] }>('/board', {
      query: { assigneeId, priority },
    });
    setColumns(response.columns);
  }, [assigneeId, priority]);

  useEffect(() => {
    setColumns(null);
    loadBoard().catch(() => notify('Could not load the board.', 'error'));
  }, [loadBoard, notify]);

  useEffect(() => {
    request<{ items: UserSummary[] }>('/users')
      .then((response) => setUsers(response.items))
      .catch(() => undefined);
  }, []);

  const move = async (issue: Issue, status: Status, position: number) => {
    if (issue.status === status && issue.position === position) return;
    try {
      await request(`/issues/${issue.key}/move`, { method: 'POST', body: { status, position } });
      await loadBoard();
      notify(`${issue.key} moved to ${STATUS_LABELS[status]}.`);
    } catch (error) {
      notify(error instanceof ApiError ? error.message : 'Could not move the issue.', 'error');
    }
  };

  const onDrop = (event: DragEvent, status: Status, position: number) => {
    event.preventDefault();
    event.stopPropagation();
    setDropTarget(null);
    setDragging(null);
    const key = event.dataTransfer.getData('text/plain');
    const issue = columns?.flatMap((column) => column.issues).find((candidate) => candidate.key === key);
    if (issue) void move(issue, status, position);
  };

  return (
    <section className="page" data-testid="board-page">
      <header className="page__header">
        <div>
          <h1>Board</h1>
          <p className="muted">Drag a card between columns, or use the move control on each card.</p>
        </div>

        <div className="filters" data-testid="board-filters">
          <label className="field field--inline">
            <span>Assignee</span>
            <select
              data-testid="board-filter-assignee"
              value={assigneeId}
              onChange={(event) => setAssigneeId(event.target.value)}
            >
              <option value="">Everyone</option>
              <option value="unassigned">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field field--inline">
            <span>Priority</span>
            <select
              data-testid="board-filter-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              <option value="">Any</option>
              {PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {!columns ? (
        <Spinner label="Loading board" testId="board-loading" />
      ) : (
        <div className="board" data-testid="board">
          {columns.map((column) => (
            <div
              key={column.status}
              className={`column${dropTarget === column.status ? ' column--drop' : ''}`}
              data-testid={`column-${column.status}`}
              data-status={column.status}
              onDragOver={(event) => {
                event.preventDefault();
                setDropTarget(column.status);
              }}
              onDragLeave={() => setDropTarget((current) => (current === column.status ? null : current))}
              onDrop={(event) => onDrop(event, column.status, column.issues.length)}
            >
              <header className="column__header">
                <h2>{column.title}</h2>
                <span className="column__count" data-testid={`column-count-${column.status}`}>
                  {column.issues.length}
                </span>
              </header>

              <div className="column__body">
                {column.issues.length === 0 ? (
                  <p className="column__empty" data-testid={`column-empty-${column.status}`}>
                    Nothing here
                  </p>
                ) : null}

                {column.issues.map((issue, index) => (
                  <article
                    key={issue.id}
                    className={`card issue-card${dragging === issue.key ? ' issue-card--dragging' : ''}`}
                    data-testid={`issue-card-${issue.key}`}
                    data-issue-key={issue.key}
                    data-status={issue.status}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.setData('text/plain', issue.key);
                      event.dataTransfer.effectAllowed = 'move';
                      setDragging(issue.key);
                    }}
                    onDragEnd={() => setDragging(null)}
                    onDrop={(event) => onDrop(event, column.status, index)}
                  >
                    <div className="issue-card__top">
                      <Link to={`/issues/${issue.key}`} className="issue-card__key" data-testid="issue-card-key">
                        {issue.key}
                      </Link>
                      <TypeBadge type={issue.type} />
                    </div>

                    <Link to={`/issues/${issue.key}`} className="issue-card__title" data-testid="issue-card-title">
                      {issue.title}
                    </Link>

                    {issue.labels.length ? (
                      <div className="chips">
                        {issue.labels.map((label) => (
                          <Label key={label} value={label} />
                        ))}
                      </div>
                    ) : null}

                    <footer className="issue-card__footer">
                      <PriorityBadge priority={issue.priority} />
                      <div className="issue-card__meta">
                        {issue.commentCount > 0 ? (
                          <span data-testid="issue-card-comments" title={`${issue.commentCount} comments`}>
                            💬 {issue.commentCount}
                          </span>
                        ) : null}
                        <Avatar user={issue.assignee} />
                      </div>
                    </footer>

                    {/* Keyboard-accessible equivalent of the drag gesture. */}
                    <label className="issue-card__move">
                      <span className="sr-only">Move {issue.key} to another column</span>
                      <select
                        data-testid={`move-${issue.key}`}
                        aria-label={`Move ${issue.key} to another column`}
                        value={issue.status}
                        onChange={(event) => void move(issue, event.target.value as Status, 0)}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
