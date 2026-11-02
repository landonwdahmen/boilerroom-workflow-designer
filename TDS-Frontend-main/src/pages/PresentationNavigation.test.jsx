import { vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import HomePage from './HomePage';
import DocumentationPage from './DocumentationPage';
import Navbar from '../components/navigation/Navbar';
import DashboardHeader from '../components/dashboard/shared/DashboardHeader';
import ProjectInformationPage from './TermsAndConditionsPage';
import ComingSoonPage from './ComingSoonPage';
import MemberDashboardPage from './MemberDashboardPage';
import { getAssignedProjects } from '../services/projects';

vi.mock('../hooks/useAuth');
vi.mock('../services/projects');
beforeEach(() => useAuth.mockReturnValue({ user: null, isLoading: false }));

test('homepage links target working app routes or existing documentation sections', () => {
  const home = render(<MemoryRouter><HomePage /></MemoryRouter>);
  const targets = screen.getAllByRole('link').map(link => link.getAttribute('href'));
  expect(targets).toContain('/documentation');
  expect(targets).toContain('/documentation#setup');
  expect(document.getElementById('features')).toBeInTheDocument();
  const routes = new Set(['/', '/login', '/signup', '/terms', '/documentation']);
  for (const href of targets) {
    const url = new URL(href, 'https://localhost:3000');
    expect(url.origin).toBe('https://localhost:3000');
    expect(routes.has(url.pathname)).toBe(true);
    if (url.pathname === '/' && url.hash) expect(document.getElementById(url.hash.slice(1))).toBeInTheDocument();
  }
  home.unmount();
  render(<MemoryRouter><DocumentationPage /></MemoryRouter>);
  for (const href of targets.filter(target => target.startsWith('/documentation#'))) {
    expect(document.getElementById(href.split('#')[1])).toBeInTheDocument();
  }
});

test('documentation navigation uses actual sections and does not link to unserved checkout files', () => {
  render(<MemoryRouter><DocumentationPage /></MemoryRouter>);
  for (const link of within(screen.getByRole('navigation', { name: 'Documentation sections' })).getAllByRole('link')) {
    expect(document.getElementById(link.getAttribute('href').slice(1))).toBeInTheDocument();
  }
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: 'Register with invitation' })).toHaveAttribute('href', '/signup');
  expect(screen.getByText('README.md', { selector: 'code' })).toBeInTheDocument();
  expect(screen.getAllByRole('link').some(link => /\.md(?:#|$)/.test(link.getAttribute('href')))).toBe(false);
});

test('legacy terms destination provides factual project information without a contract', () => {
  render(<MemoryRouter><ProjectInformationPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Project information' })).toBeInTheDocument();
  for (const name of ['Landon Dahmen', 'Zander Wysong', 'Telson Cowan', 'Jake McBride']) {
    expect(screen.getAllByText(new RegExp(name)).length).toBeGreaterThan(0);
  }
  expect(screen.getByRole('link', { name: 'Local development guide' })).toHaveAttribute('href', '/documentation');
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(screen.queryByText(/worldwide, non-exclusive/)).not.toBeInTheDocument();
});

test('unavailable page offers real navigation without inactive subscription controls', () => {
  render(<MemoryRouter><ComingSoonPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Page unavailable in this portfolio demo' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to Home' })).toHaveAttribute('href', '/');
  expect(screen.getByRole('link', { name: 'Local development guide' })).toHaveAttribute('href', '/documentation');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(screen.queryByText(/Coming Soon|Subscribe|Notify me/)).not.toBeInTheDocument();
});

test('developer dashboard retains assigned projects and states access scope instead of fabricated activity', async () => {
  useAuth.mockReturnValue({ user: { userId: 'synthetic-dev', role: 'developer', name: 'Synthetic Developer' } });
  getAssignedProjects.mockResolvedValue([{ id: '11111111-1111-4111-8111-111111111111', name: 'Synthetic assigned project',
    status: 'active', description: 'Synthetic design', assignedTo: 'synthetic-dev', createdAt: '2026-01-01T00:00:00Z' }]);
  render(<MemoryRouter><MemberDashboardPage /></MemoryRouter>);
  expect(await screen.findByText('Synthetic assigned project')).toBeInTheDocument();
  expect(getAssignedProjects).toHaveBeenCalledWith('synthetic-dev');
  expect(screen.getByText('Assigned projects only')).toBeInTheDocument();
  expect(screen.getByText('Read-only designs')).toBeInTheDocument();
  expect(screen.queryByText('Completed Tasks')).not.toBeInTheDocument();
  expect(screen.queryByText('Hours Logged')).not.toBeInTheDocument();
});

test.each([
  [null, null],
  ['administrator', '/admin-dashboard'],
  ['developer', '/member-dashboard']
])('navbar preserves role-specific access links for %s', (role, target) => {
  useAuth.mockReturnValue({ user: role ? { role, name: 'Synthetic User' } : null });
  render(<MemoryRouter><Navbar /></MemoryRouter>);
  if (target) {
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', target);
    expect(screen.queryByRole('link', { name: 'Sign Up' })).not.toBeInTheDocument();
  } else {
    expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Sign Up' })).toHaveAttribute('href', '/signup');
    expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  }
});

test('mobile documentation navigation closes the menu and reaches the real guide', async () => {
  render(<MemoryRouter><Navbar /><Routes><Route path="/" element={<p>Home route</p>} /><Route path="/documentation" element={<DocumentationPage />} /></Routes></MemoryRouter>);
  const toggle = screen.getByRole('button', { name: 'Toggle menu' });
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(within(document.getElementById('mobile-navigation')).getByRole('link', { name: 'Documentation' }));
  expect(await screen.findByRole('heading', { name: 'Local development documentation' })).toBeInTheDocument();
  await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'false'));
  expect(document.getElementById('mobile-navigation')).not.toBeInTheDocument();
});

test.each(['administrator', 'developer'])('dashboard header retains profile, refresh and logout for %s', role => {
  const logout = vi.fn(), refresh = vi.fn();
  useAuth.mockReturnValue({ user: { role, name: 'Synthetic User' }, logout });
  render(<MemoryRouter><DashboardHeader handleRefresh={refresh} /></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Boiler-Room — Workflow Design Demo' })).toHaveAttribute('href', role === 'administrator' ? '/admin-dashboard' : '/member-dashboard');
  expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
  fireEvent.click(screen.getByTitle('Refresh Data'));
  fireEvent.click(screen.getByTitle('Logout'));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(logout).toHaveBeenCalledTimes(1);
});
