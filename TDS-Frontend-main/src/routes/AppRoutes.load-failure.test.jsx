import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { useAuth } from '../hooks/useAuth';

vi.mock('../hooks/useAuth');
vi.mock('../pages/ProjectPlaygroundPageV2', () => { throw new Error('Synthetic module unavailable'); });

test('an unavailable editor module shows an explicit recovery message inside the protected route', async () => {
  useAuth.mockReturnValue({ user: { userId: 'synthetic-admin', role: 'administrator' }, isLoading: false });
  render(<MemoryRouter initialEntries={['/playground/synthetic']}><AppRoutes /></MemoryRouter>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Editor could not be loaded. Reload the page');
  expect(screen.queryByRole('status')).toBeNull();
});
