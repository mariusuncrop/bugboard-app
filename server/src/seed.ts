import type { Comment, Database, Issue, IssueType, Priority, Project, Status, User } from './types.js';

/**
 * The seed is fully deterministic — fixed ids, fixed timestamps, fixed order.
 * Tests (visual snapshots especially) depend on `POST /api/test/reset` putting
 * the database back into exactly this state, so nothing here may use
 * `Date.now()` or a random generator.
 */
const EPOCH = Date.parse('2026-01-05T09:00:00.000Z');
const HOUR = 3_600_000;

const at = (hoursFromEpoch: number): string => new Date(EPOCH + hoursFromEpoch * HOUR).toISOString();

export const SEED_USERS: User[] = [
  {
    id: 'usr_admin',
    email: 'admin@bugboard.dev',
    name: 'Ada Whitfield',
    password: 'Password123!',
    role: 'admin',
    // Avatar colours carry white initials, so each one clears 4.5:1 against white.
    avatarColor: '#4338ca',
  },
  {
    id: 'usr_dev',
    email: 'dev@bugboard.dev',
    name: 'Marco Reyes',
    password: 'Password123!',
    role: 'member',
    avatarColor: '#0369a1',
  },
  {
    id: 'usr_qa',
    email: 'qa@bugboard.dev',
    name: 'Priya Natarajan',
    password: 'Password123!',
    role: 'member',
    avatarColor: '#0f766e',
  },
  {
    id: 'usr_pm',
    email: 'pm@bugboard.dev',
    name: 'Jonas Lindqvist',
    password: 'Password123!',
    role: 'member',
    avatarColor: '#b45309',
  },
];

interface SeedProject {
  id: string;
  key: string;
  name: string;
  description: string;
  memberIds: string[];
}

/**
 * Membership is deliberately uneven: Marco and Priya cannot see Mobile App, and
 * Jonas cannot see Platform API. Without a user who is missing from something,
 * "you only see your projects" is not actually testable.
 */
const SEED_PROJECTS: SeedProject[] = [
  {
    id: 'prj_web',
    key: 'WEB',
    name: 'Web Storefront',
    description: 'The customer-facing shop: browsing, checkout and account pages.',
    memberIds: ['usr_admin', 'usr_dev', 'usr_qa', 'usr_pm'],
  },
  {
    id: 'prj_api',
    key: 'API',
    name: 'Platform API',
    description: 'The REST services behind the storefront and the mobile app.',
    memberIds: ['usr_admin', 'usr_dev', 'usr_qa'],
  },
  {
    id: 'prj_mob',
    key: 'MOB',
    name: 'Mobile App',
    description: 'iOS and Android clients.',
    memberIds: ['usr_admin', 'usr_pm'],
  },
];

interface SeedIssue {
  projectId: string;
  title: string;
  type: IssueType;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  reporterId: string;
  labels: string[];
  description: string;
}

const SEED_ISSUES: SeedIssue[] = [
  {
    projectId: 'prj_web',
    title: 'Checkout total ignores the applied discount code',
    type: 'bug',
    status: 'in_progress',
    priority: 'critical',
    assigneeId: 'usr_dev',
    reporterId: 'usr_qa',
    labels: ['api', 'regression'],
    description:
      'Applying a valid discount code updates the line items but the order total still shows the undiscounted amount. Reproduced on staging with code SPRING20.',
  },
  {
    projectId: 'prj_api',
    title: 'Session expires after 5 minutes instead of 8 hours',
    type: 'bug',
    status: 'in_progress',
    priority: 'critical',
    assigneeId: 'usr_dev',
    reporterId: 'usr_pm',
    labels: ['auth'],
    description: 'Token TTL looks like it is being read as minutes somewhere in the session refresh path.',
  },
  {
    projectId: 'prj_web',
    title: 'Board columns lose scroll position after drag and drop',
    type: 'bug',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'usr_dev',
    reporterId: 'usr_qa',
    labels: ['ui'],
    description: 'Dropping a card at the bottom of a long column scrolls the column back to the top.',
  },
  {
    projectId: 'prj_api',
    title: 'Issue search returns no results for partial keys',
    type: 'bug',
    status: 'todo',
    priority: 'high',
    assigneeId: 'usr_qa',
    reporterId: 'usr_pm',
    labels: ['api'],
    description: 'Searching for "BUG-1" should match BUG-1, BUG-12 and BUG-13. Currently only exact keys match.',
  },
  {
    projectId: 'prj_api',
    title: 'Attachment upload fails silently over 2 MB',
    type: 'bug',
    status: 'backlog',
    priority: 'high',
    assigneeId: null,
    reporterId: 'usr_qa',
    labels: ['api', 'ui'],
    description: 'The request is rejected by the server but the UI shows no error toast.',
  },
  {
    projectId: 'prj_web',
    title: 'Priority filter resets when navigating back from an issue',
    type: 'bug',
    status: 'backlog',
    priority: 'low',
    assigneeId: null,
    reporterId: 'usr_qa',
    labels: ['ui'],
    description: 'Filters should be held in the query string so the back button restores them.',
  },
  {
    projectId: 'prj_api',
    title: 'Dashboard stats endpoint times out under load',
    type: 'bug',
    status: 'in_review',
    priority: 'high',
    assigneeId: 'usr_dev',
    reporterId: 'usr_pm',
    labels: ['performance', 'api'],
    description: 'p95 is above 3s once the project has more than 5k issues.',
  },
  {
    projectId: 'prj_web',
    title: 'Colour contrast on the status badges fails WCAG AA',
    type: 'bug',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'usr_qa',
    reporterId: 'usr_qa',
    labels: ['accessibility', 'ui'],
    description: 'The "done" badge measures 3.1:1 against the card background.',
  },
  {
    projectId: 'prj_mob',
    title: 'Comment box loses focus while typing on mobile Safari',
    type: 'bug',
    status: 'backlog',
    priority: 'medium',
    assigneeId: null,
    reporterId: 'usr_pm',
    labels: ['mobile', 'ui'],
    description: 'Only reproducible on iOS when the on-screen keyboard opens.',
  },
  {
    projectId: 'prj_api',
    title: 'Deleting an issue leaves its comments behind',
    type: 'bug',
    status: 'done',
    priority: 'high',
    assigneeId: 'usr_dev',
    reporterId: 'usr_admin',
    labels: ['api', 'data'],
    description: 'Orphaned comment rows accumulate after every delete.',
  },
  {
    projectId: 'prj_web',
    title: 'Empty board column shows a stray comma',
    type: 'bug',
    status: 'done',
    priority: 'low',
    assigneeId: 'usr_dev',
    reporterId: 'usr_qa',
    labels: ['ui'],
    description: 'Rendering artefact from joining an empty labels array.',
  },
  {
    projectId: 'prj_web',
    title: 'Login form submits twice on a double click',
    type: 'bug',
    status: 'done',
    priority: 'medium',
    assigneeId: 'usr_dev',
    reporterId: 'usr_qa',
    labels: ['auth', 'ui'],
    description: 'The submit button needs to be disabled while the request is in flight.',
  },
  {
    projectId: 'prj_web',
    title: 'Add keyboard shortcuts for moving a card between columns',
    type: 'task',
    status: 'backlog',
    priority: 'low',
    assigneeId: null,
    reporterId: 'usr_pm',
    labels: ['accessibility', 'ui'],
    description: 'Drag and drop is currently the only way to change status from the board.',
  },
  {
    projectId: 'prj_api',
    title: 'Expose an OpenAPI document for the REST API',
    type: 'task',
    status: 'done',
    priority: 'medium',
    assigneeId: 'usr_dev',
    reporterId: 'usr_admin',
    labels: ['api', 'docs'],
    description: 'Served at /api/openapi.yaml so client generators and contract tests can consume it.',
  },
  {
    projectId: 'prj_web',
    title: 'Add a bulk status update to the issue list',
    type: 'task',
    status: 'backlog',
    priority: 'medium',
    assigneeId: null,
    reporterId: 'usr_pm',
    labels: ['ui'],
    description: 'Select several rows, then move them all to one status.',
  },
  {
    projectId: 'prj_api',
    title: 'Paginate the issue list server side',
    type: 'task',
    status: 'done',
    priority: 'high',
    assigneeId: 'usr_dev',
    reporterId: 'usr_admin',
    labels: ['api', 'performance'],
    description: 'GET /api/issues now takes page and pageSize and returns a total count.',
  },
  {
    projectId: 'prj_api',
    title: 'Seed the demo database from a fixed fixture',
    type: 'task',
    status: 'done',
    priority: 'high',
    assigneeId: 'usr_qa',
    reporterId: 'usr_qa',
    labels: ['data'],
    description: 'Deterministic seed data so visual snapshots stay stable.',
  },
  {
    projectId: 'prj_web',
    title: 'Add a dark theme toggle to the header',
    type: 'task',
    status: 'in_review',
    priority: 'low',
    assigneeId: 'usr_qa',
    reporterId: 'usr_pm',
    labels: ['ui'],
    description: 'Preference is stored in localStorage and restored on load.',
  },
  {
    projectId: 'prj_mob',
    title: 'Write a runbook for restoring the demo environment',
    type: 'task',
    status: 'todo',
    priority: 'low',
    assigneeId: 'usr_pm',
    reporterId: 'usr_admin',
    labels: ['docs'],
    description: 'Cover the reset endpoint, the seed script and the docker compose workflow.',
  },
  {
    projectId: 'prj_api',
    title: 'Support filtering issues by label',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'usr_dev',
    reporterId: 'usr_qa',
    labels: ['api', 'ui'],
    description: 'Multiple labels should combine as OR.',
  },
  {
    projectId: 'prj_api',
    title: 'Restrict issue deletion to admins',
    type: 'task',
    status: 'done',
    priority: 'high',
    assigneeId: 'usr_dev',
    reporterId: 'usr_admin',
    labels: ['auth', 'api'],
    description: 'Members receive 403 with a FORBIDDEN error code.',
  },
  {
    projectId: 'prj_web',
    title: 'Add an activity feed to the issue detail page',
    type: 'task',
    status: 'backlog',
    priority: 'low',
    assigneeId: null,
    reporterId: 'usr_pm',
    labels: ['ui'],
    description: 'Show status changes and assignments alongside comments.',
  },
  {
    projectId: 'prj_api',
    title: 'Instrument the API with request timing logs',
    type: 'task',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: 'usr_dev',
    reporterId: 'usr_admin',
    labels: ['performance'],
    description: 'Log method, path, status and duration for every request.',
  },
  {
    projectId: 'prj_web',
    title: 'Add a confirmation dialog before deleting an issue',
    type: 'task',
    status: 'done',
    priority: 'medium',
    assigneeId: 'usr_qa',
    reporterId: 'usr_pm',
    labels: ['ui'],
    description: 'Destructive actions should never be one click away.',
  },
  {
    projectId: 'prj_mob',
    title: 'Make the board usable at 375px wide',
    type: 'task',
    status: 'in_review',
    priority: 'medium',
    assigneeId: 'usr_qa',
    reporterId: 'usr_pm',
    labels: ['mobile', 'ui'],
    description: 'Columns scroll horizontally instead of squashing.',
  },
  {
    projectId: 'prj_mob',
    title: 'Publish the Playwright HTML report to GitHub Pages',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'usr_qa',
    reporterId: 'usr_qa',
    labels: ['docs'],
    description: 'So a failing run can be inspected without downloading artefacts.',
  },
];

interface SeedComment {
  issueIndex: number;
  authorId: string;
  body: string;
}

const SEED_COMMENTS: SeedComment[] = [
  { issueIndex: 0, authorId: 'usr_dev', body: 'Reproduced locally. The discount is applied after the total is computed.' },
  { issueIndex: 0, authorId: 'usr_qa', body: 'Also happens with percentage codes, not just fixed amounts.' },
  { issueIndex: 1, authorId: 'usr_pm', body: 'Three customers reported this today — raising to critical.' },
  { issueIndex: 3, authorId: 'usr_qa', body: 'Worth covering with an API test once the matching rule is decided.' },
  { issueIndex: 6, authorId: 'usr_dev', body: 'Adding an index on status brings p95 down to 400ms.' },
];

export function buildSeedDatabase(): Database {
  const projects: Project[] = SEED_PROJECTS.map((seed) => ({
    ...seed,
    memberIds: [...seed.memberIds],
    counter: 0,
    createdAt: at(0),
  }));

  const byId = new Map(projects.map((project) => [project.id, project]));

  const issues: Issue[] = SEED_ISSUES.map((seed, index) => {
    const project = byId.get(seed.projectId)!;
    project.counter += 1;
    const createdAt = at(index * 5);
    return {
      id: `iss_${String(index + 1).padStart(3, '0')}`,
      projectId: project.id,
      key: `${project.key}-${project.counter}`,
      title: seed.title,
      description: seed.description,
      type: seed.type,
      status: seed.status,
      priority: seed.priority,
      assigneeId: seed.assigneeId,
      reporterId: seed.reporterId,
      labels: seed.labels,
      position: index,
      createdAt,
      updatedAt: at(index * 5 + 2),
    };
  });

  const comments: Comment[] = SEED_COMMENTS.map((seed, index) => ({
    id: `cmt_${String(index + 1).padStart(3, '0')}`,
    issueId: issues[seed.issueIndex]!.id,
    authorId: seed.authorId,
    body: seed.body,
    createdAt: at(seed.issueIndex * 5 + 3 + index),
  }));

  return {
    users: SEED_USERS.map((user) => ({ ...user })),
    projects,
    issues,
    comments,
    attachments: [],
  };
}
