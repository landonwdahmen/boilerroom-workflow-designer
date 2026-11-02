import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, passwordIsValid } from '../../services/auth';

function SignupForm() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', accessCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const change = (event) => setForm(previous => ({ ...previous, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim() || !passwordIsValid(form.password)) {
      setError('Enter your name and a password of at least 12 characters and at most 72 UTF-8 bytes.'); return;
    }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (!/^[a-f0-9]{64}$/.test(form.accessCode.trim())) { setError('Enter the 64-character invitation code from your administrator.'); return; }
    setBusy(true);
    try {
      await register(form);
      setForm({ name: '', email: '', password: '', confirmPassword: '', accessCode: '' });
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (failure) {
      setError(failure.status === 400 ?
        'Check your fields and invitation. It must match your email, be unused, and not expired (24 hours). If correct, refresh and try again.' : failure.message);
    } finally { setBusy(false); }
  };
  return <div className="w-full max-w-xl mx-auto bg-white rounded-xl shadow-lg p-8 text-left">
    <h1 className="text-2xl font-bold text-gray-900">Join with an invitation</h1>
    <p className="my-4 text-gray-600">Developer accounts require an email-bound invitation from your organization administrator. A local operator provisions administrators.</p>
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="p-3 bg-red-50 text-red-700">{error}</p>}
      <label className="block">Full name<input id="name" name="name" value={form.name} onChange={change} required maxLength={100} autoComplete="name" className="block w-full border p-3 rounded-lg" /></label>
      <label className="block">Email address<input id="email" name="email" type="email" value={form.email} onChange={change} required maxLength={254} autoComplete="email" className="block w-full border p-3 rounded-lg" /></label>
      <label className="block">Password<input id="password" name="password" type="password" value={form.password} onChange={change} required minLength={12} maxLength={72} autoComplete="new-password" className="block w-full border p-3 rounded-lg" /></label>
      <p className="text-sm text-gray-600">At least 12 characters, at most 72 UTF-8 bytes. Spaces are preserved.</p>
      <label className="block">Confirm password<input name="confirmPassword" type="password" value={form.confirmPassword} onChange={change} required autoComplete="new-password" className="block w-full border p-3 rounded-lg" /></label>
      <label className="block">Invitation code<input name="accessCode" type="password" value={form.accessCode} onChange={change} required minLength={64} maxLength={64} autoComplete="off" className="block w-full border p-3 rounded-lg" /></label>
      <p className="text-sm text-gray-600"><Link to="/terms" className="text-[#F68B1F] underline">Project information</Link> describes the local demonstration and separate repository notices.</p>
      <button type="submit" disabled={busy} className="w-full bg-[#F68B1F] text-white rounded-lg p-3 disabled:opacity-50">{busy ? 'Creating account…' : 'Create developer account'}</button>
      <Link to="/login" className="block text-[#F68B1F]">Already registered? Sign in</Link>
    </form>
  </div>;
}
export default SignupForm;
