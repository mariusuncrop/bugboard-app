import { useState } from 'react';
import { Link } from 'react-router-dom';
import { projectPath } from '../lib/projects';
import { LINK_TYPES, LINK_TYPE_LABELS, type IssueLink, type LinkType } from '../lib/types';
import { StatusBadge, TypeBadge } from './Badge';

interface Props {
  projectKey: string;
  links: IssueLink[];
  busy: boolean;
  error: string | null;
  onAdd: (type: LinkType, target: string) => void;
  onRemove: (id: string) => void;
}

export function IssueLinks({ projectKey, links, busy, error, onAdd, onRemove }: Props) {
  const [type, setType] = useState<LinkType>('relates');
  const [target, setTarget] = useState('');

  const submit = () => {
    if (!target.trim()) return;
    onAdd(type, target.trim().toUpperCase());
    setTarget('');
  };

  return (
    <div className="card" data-testid="issue-links">
      <h2>
        Linked issues <span className="muted">({links.length})</span>
      </h2>

      <ul className="list" data-testid="link-list">
        {links.map((link) => (
          <li key={link.id} className="issue-link" data-testid={`link-${link.issue?.key}`}>
            {/* The wording comes from the server, so both ends read correctly:
                one side blocks, the other is blocked by. */}
            <span className="issue-link__wording" data-testid="link-wording">
              {link.wording}
            </span>
            {link.issue ? (
              <>
                <Link
                  to={projectPath(projectKey, `/issues/${link.issue.key}`)}
                  className="issue-link__key"
                  data-testid="link-key"
                >
                  {link.issue.key}
                </Link>
                <span className="issue-link__title">{link.issue.title}</span>
                <TypeBadge type={link.issue.type} />
                <StatusBadge status={link.issue.status} />
              </>
            ) : null}
            <button
              type="button"
              className="link link--danger"
              data-testid={`unlink-${link.issue?.key}`}
              onClick={() => onRemove(link.id)}
            >
              Unlink
            </button>
          </li>
        ))}
        {links.length === 0 ? (
          <li className="muted" data-testid="links-empty">
            Nothing linked yet.
          </li>
        ) : null}
      </ul>

      <div className="filters" data-testid="add-link">
        <label className="field field--inline">
          <span className="sr-only">Link type</span>
          <select data-testid="link-type" value={type} onChange={(event) => setType(event.target.value as LinkType)}>
            {LINK_TYPES.map((value) => (
              <option key={value} value={value}>
                {LINK_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="field field--inline field--grow">
          <span className="sr-only">Issue key to link</span>
          <input
            placeholder="WEB-4"
            data-testid="link-target"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
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
          data-testid="add-link-button"
          disabled={busy || target.trim() === ''}
          onClick={submit}
        >
          Link
        </button>
      </div>

      {error ? (
        <p className="field__error" data-testid="link-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
