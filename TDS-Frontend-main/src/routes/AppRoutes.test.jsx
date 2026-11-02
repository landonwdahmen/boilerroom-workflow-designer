import { vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
const editor = vi.hoisted(() => ({ loads: 0, finish: null }));
vi.mock('../pages/ProjectPlaygroundPageV2', () => {
  editor.loads++;
  return new Promise(resolve => { editor.finish = () => resolve({ default: () => <p>Loaded synthetic editor</p> }); });
});

function mount() {
  return render(<MemoryRouter initialEntries={['/playground/synthetic']}><AppRoutes /></MemoryRouter>);
}

test('anonymous editor navigation redirects without loading the editor module', async () => {
  useAuth.mockReturnValue({ user: null, isLoading: false });
  mount();
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(editor.loads).toBe(0);
});

test('pending session does not start loading the protected editor', () => {
  useAuth.mockReturnValue({ user: null, isLoading: true });
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('Checking session');
  expect(editor.loads).toBe(0);
});

test('authorized editor navigation has a bounded loading state and resolves the lazy route', async () => {
  useAuth.mockReturnValue({ user: { userId: 'synthetic-dev', role: 'developer' }, isLoading: false });
  mount();
  expect(screen.getByRole('status')).toHaveTextContent('Loading editor');
  await waitFor(() => expect(editor.finish).toBeTypeOf('function'));
  await act(async () => editor.finish());
  expect(await screen.findByText('Loaded synthetic editor')).toBeInTheDocument();
  expect(editor.loads).toBe(1);
});
