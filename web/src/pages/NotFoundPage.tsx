import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="page" data-testid="not-found-page">
      <h1>Page not found</h1>
      <p className="muted">That URL does not match anything in BugBoard.</p>
      <Link to="/board" className="button button--primary">
        Go to the board
      </Link>
    </section>
  );
}
