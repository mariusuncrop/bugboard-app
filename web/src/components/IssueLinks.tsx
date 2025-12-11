import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IssuePicker } from './IssuePicker';
import { projectPath } from '../lib/projects';
import { LINK_TYPES, LINK_TYPE_LABELS, type IssueLink, type LinkType } from '../lib/types';
import { StatusBadge, TypeBadge } from './Badge';

interface Props {
  projectKey: string;
  /** The issue being looked at — never offered as its own link target. */
  issueKey: string;
  links: IssueLink[];
  busy: boolean;
  error: string | null;
  onAdd: (type: LinkType, target: string) => void;
  onRemove: (id: string) => void;
}

export function IssueLinks({ projectKey, issueKey, links, busy, error, onAdd, onRemove }: Props) {
  const [type, setType] = useState<LinkType>('relates');

  // Neither the issue itself nor anything already linked is worth offering.
  const exclude = [issueKey, ...links.map((link) => link.issue?.key ?? '')];

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
        <IssuePicker
          projectKey={projectKey}
          exclude={exclude}
          testId="link-target"
          placeholder="Search by key or title"
          onPick={(issue) => onAdd(type, issue.key)}
        />
      </div>

      {error ? (
        <p className="field__error" data-testid="link-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
