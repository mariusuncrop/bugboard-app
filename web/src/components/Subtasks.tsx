import { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectPath } from '../lib/projects';
import type { Issue } from '../lib/types';
import { PriorityBadge, StatusBadge, TypeBadge } from './Badge';

interface Props {
  projectKey: string;
  children: Issue[];
  busy: boolean;
  error: string | null;
  onAdd: (title: string) => void;
  onDetach: (issueKey: string) => void;
}

export function Subtasks({ projectKey, children, busy, error, onAdd, onDetach }: Props) {
  const [title, setTitle] = useState('');

  const submit = () => {
    if (title.trim().length < 5) return;
    onAdd(title.trim());
    setTitle('');
  };

  const done = children.filter((child) => child.status === 'done').length;

  return (
    <div className="card" data-testid="subtasks">
      <h2>
        Subtasks{' '}
        <span className="muted" data-testid="subtask-progress">
          ({done}/{children.length})
        </span>
      </h2>

      <ul className="list" data-testid="subtask-list">
        {children.map((child) => (
          <li key={child.id} className="issue-link" data-testid={`subtask-${child.key}`}>
            <Link
              to={projectPath(projectKey, `/issues/${child.key}`)}
              className="issue-link__key"
              data-testid="subtask-key"
            >
              {child.key}
            </Link>
            <span className="issue-link__title">{child.title}</span>
            <TypeBadge type={child.type} />
            <StatusBadge status={child.status} />
            <PriorityBadge priority={child.priority} />
            <button
              type="button"
              className="link link--danger"
              data-testid={`detach-${child.key}`}
              onClick={() => onDetach(child.key)}
            >
              Detach
            </button>
          </li>
        ))}
        {children.length === 0 ? (
          <li className="muted" data-testid="subtasks-empty">
            No subtasks yet.
          </li>
        ) : null}
      </ul>

      <div className="filters" data-testid="add-subtask">
        <label className="field field--inline field--grow">
          <span className="sr-only">Subtask title</span>
          <input
            placeholder="What needs doing?"
            data-testid="subtask-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submit();
              }
            }}
          />
        </label>
        <button
          type="button"
          className="button button--primary"
          data-testid="add-subtask-button"
          disabled={busy || title.trim().length < 5}
          onClick={submit}
        >
          Add subtask
        </button>
      </div>

      {error ? (
        <p className="field__error" data-testid="subtask-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
