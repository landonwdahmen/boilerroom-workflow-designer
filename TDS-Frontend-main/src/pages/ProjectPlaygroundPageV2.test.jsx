import { vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import Editor from './ProjectPlaygroundPageV2';
import { useAuth } from '../hooks/useAuth';
import { getProjectById } from '../services/projects';
import { getGraph, saveGraph } from '../services/graphs';
import { emptyGraph, createNode } from '../components/playground/graphState';
vi.mock('../hooks/useAuth');
vi.mock('../services/projects');
vi.mock('../services/graphs', async () => ({ ...await vi.importActual('../services/graphs'), getGraph: vi.fn(), saveGraph: vi.fn() }));
// Access lifecycle unit test: geometry/rendering is verified separately in real Edge.
vi.mock('reactflow', async () => ({ ...await vi.importActual('reactflow'),
  default: ({ children }) => <div data-testid="canvas">{children}</div>,
  ReactFlowProvider: ({ children }) => children, Controls: () => null, MiniMap: () => null, Background: () => null
}));
const admin = { userId: 'synthetic-admin', role: 'administrator', organizationId: 'synthetic-org' };
const project = { id: 'synthetic-project', name: 'Synthetic Project', organizationId: 'synthetic-org', assignedTo: 'synthetic-dev' };
function mount() {
  return render(<MemoryRouter initialEntries={['/playground/synthetic-project']}>
    <Link to="/playground/foreign">Other project</Link>
    <Routes><Route path="/playground/:projectId" element={<Editor />} /><Route path="/login" element={<p>Sign in required</p>} /></Routes>
  </MemoryRouter>);
}
beforeEach(() => { useAuth.mockReturnValue({ user: admin }); getProjectById.mockResolvedValue(project);
  getGraph.mockResolvedValue({ revision: 0, state: emptyGraph() }); });
test('anonymous users cannot obtain editor data', async () => {
  useAuth.mockReturnValue({ user: null }); mount();
  expect(await screen.findByText('Sign in required')).toBeInTheDocument();
  expect(getProjectById).not.toHaveBeenCalled();
});
test('admin may edit only after backend-scoped project lookup', async () => {
  mount();
  expect(screen.queryByTestId('canvas')).toBeNull();
  await screen.findByTestId('canvas');
  fireEvent.click(screen.getByRole('button', { name: 'Add API Trigger' }));
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Synthetic edited' } });
  expect(screen.getByLabelText('Label')).toHaveValue('Synthetic edited');
  expect(getProjectById).toHaveBeenCalledWith('synthetic-project');
});
test('assigned developer receives read-only editor and cannot add a node', async () => {
  useAuth.mockReturnValue({ user: { ...admin, userId: 'synthetic-dev', role: 'developer' } }); mount();
  await screen.findByTestId('canvas');
  expect(screen.getByRole('button', { name: 'Add API Trigger' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add API Trigger' }));
  expect(screen.queryByLabelText('Label')).toBeNull();
});
test.each([{ ...project, organizationId: 'other' }, { ...project, assignedTo: 'other' }])('developer rejects foreign or unassigned project response', async value => {
  useAuth.mockReturnValue({ user: { ...admin, userId: 'synthetic-dev', role: 'developer' } });
  getProjectById.mockResolvedValue(value); mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  expect(screen.queryByTestId('canvas')).toBeNull();
});
test('route change immediately hides the old project while the new lookup is pending', async () => {
  mount(); await screen.findByTestId('canvas');
  let reject;
  getProjectById.mockImplementation(() => new Promise((resolve, fail) => { reject = fail; }));
  fireEvent.click(screen.getByText('Other project'));
  expect(screen.queryByTestId('canvas')).toBeNull();
  expect(screen.getByRole('status')).toHaveTextContent('Checking project access');
  await act(async () => reject(new Error('Project unavailable.')));
  expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
});
test('graph loading blocks editing until the real graph lookup completes', async () => {
  let complete; getGraph.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  mount(); await screen.findByText('Loading saved graph…');
  expect(screen.queryByTestId('canvas')).toBeNull();
  expect(screen.getByRole('button', { name: 'Add API Trigger' })).toBeDisabled();
  await act(async () => complete({ revision: 2, state: { nodes: [createNode('apiTrigger','saved',{ x: 12,y: 34 })], edges: [], error: '' } }));
  expect(screen.getByText('Saved graph — revision 2.')).toBeInTheDocument();
});
test('explicit save reports saving then persisted revision; selection does not mark dirty', async () => {
  mount(); await screen.findByTestId('canvas');
  expect(screen.getByRole('button', { name: 'Save graph' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Add API Trigger' }));
  expect(screen.getByText('Unsaved changes — not persisted.')).toBeInTheDocument();
  let complete; saveGraph.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: 'Save graph' }));
  expect(screen.getByText('Saving or loading graph…')).toBeInTheDocument();
  expect(screen.getByLabelText('Label')).toHaveAttribute('readonly');
  await act(async () => complete({ revision: 1 }));
  expect(screen.getByText('Saved graph — revision 1.')).toBeInTheDocument();
  expect(saveGraph).toHaveBeenCalledWith(project.id, 0, expect.objectContaining({ nodes: expect.any(Array) }));
});
test('stale save retains draft and requires explicit confirmed reload', async () => {
  mount(); await screen.findByTestId('canvas');
  fireEvent.click(screen.getByRole('button', { name: 'Add API Trigger' }));
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Synthetic retained conflict' } });
  saveGraph.mockRejectedValue(Object.assign(new Error('Conflict'), { status: 409 }));
  fireEvent.click(screen.getByRole('button', { name: 'Save graph' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save conflict');
  expect(screen.getByLabelText('Label')).toHaveValue('Synthetic retained conflict');
  expect(screen.getByRole('button', { name: 'Save graph' })).toBeDisabled();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Reload saved graph' }));
  expect(getGraph).toHaveBeenCalledTimes(1);
  confirm.mockReturnValue(true);
  getGraph.mockResolvedValue({ revision: 3, state: emptyGraph() });
  fireEvent.click(screen.getByRole('button', { name: 'Reload saved graph' }));
  await screen.findByText('Saved graph — revision 3.');
  expect(screen.queryByLabelText('Label')).toBeNull(); confirm.mockRestore();
});
test('invalid response/load failure is visible and editing stays disabled', async () => {
  getGraph.mockRejectedValue(new Error('The API returned an invalid or unsupported saved graph. No graph was loaded.'));
  mount(); expect(await screen.findByRole('alert')).toHaveTextContent('invalid or unsupported');
  expect(screen.queryByTestId('canvas')).toBeNull();
  expect(screen.getByRole('button', { name: 'Add API Trigger' })).toBeDisabled();
});
test('failed save retains dirty content and does not fabricate a persisted revision', async () => {
  mount(); await screen.findByTestId('canvas');
  fireEvent.click(screen.getByRole('button', { name: 'Add API Trigger' }));
  saveGraph.mockRejectedValue(new Error('Local API unavailable.'));
  fireEvent.click(screen.getByRole('button', { name: 'Save graph' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('draft is retained');
  expect(screen.getByText('Unsaved changes — not persisted.')).toBeInTheDocument();
  const beforeUnload = new Event('beforeunload', { cancelable: true }); fireEvent(window, beforeUnload);
  expect(beforeUnload.defaultPrevented).toBe(true);
});
test('focus rechecks access without losing a valid local draft; revoked access removes it', async () => {
  mount(); await screen.findByTestId('canvas');
  fireEvent.click(screen.getByRole('button', { name: 'Add API Trigger' }));
  fireEvent.change(screen.getByLabelText('Label'), { target: { value: 'Synthetic retained draft' } });
  let finish;
  getProjectById.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  fireEvent(window, new Event('focus'));
  expect(screen.getByRole('button', { name: 'Add API Trigger' })).toBeDisabled();
  await act(async () => finish(project));
  expect(screen.getByLabelText('Label')).toHaveValue('Synthetic retained draft');
  getProjectById.mockRejectedValue(new Error('Project unavailable.'));
  fireEvent(window, new Event('focus'));
  expect(await screen.findByRole('alert')).toHaveTextContent('unavailable');
  expect(screen.queryByTestId('canvas')).toBeNull();
});
