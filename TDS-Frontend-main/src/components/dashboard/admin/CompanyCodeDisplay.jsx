// The historical company-code panel now issues real, email-bound invitations.
import { useState } from 'react';
import { inviteDeveloper } from '../../../services/auth';

export default function CompanyCodeDisplay() {
  const [email, setEmail] = useState('');
  const [invitation, setInvitation] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setError(''); setInvitation(null); setBusy(true);
    try { setInvitation({ ...await inviteDeveloper(email), email: email.trim().toLowerCase() }); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return <section className="max-w-md text-left p-4 bg-orange-50 rounded-lg">
    <h2 className="font-semibold">Invite a developer</h2>
    <form onSubmit={submit} className="space-y-2 mt-2">
      <label className="block">Invitation email<input type="email" name="invitationEmail" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} className="w-full border rounded p-2" /></label>
      <button disabled={busy} type="submit" className="bg-[#F68B1F] text-white rounded p-2 disabled:opacity-50">{busy ? 'Issuing…' : 'Issue invitation'}</button>
    </form>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {invitation && <div className="mt-3 space-y-2">
      <p>One use, only for {invitation.email}. Expires {new Date(invitation.expiresAt).toLocaleString()}.</p>
      <p>This code is shown once. Share it privately; it cannot be retrieved after leaving this page.</p>
      <label className="block">One-time invitation code<textarea aria-label="One-time invitation code" readOnly value={invitation.accessCode} className="w-full border rounded p-2 font-mono" /></label>
      <button type="button" className="underline" onClick={() => setInvitation(null)}>Dismiss code</button>
    </div>}
  </section>;
}
