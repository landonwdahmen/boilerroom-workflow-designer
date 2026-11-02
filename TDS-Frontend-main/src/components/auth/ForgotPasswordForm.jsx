import { Link } from 'react-router-dom';
export default function ForgotPasswordForm() {
  return <div className="max-w-lg mx-auto bg-white rounded-xl p-8 shadow">
    <h1 className="text-2xl font-bold">Password recovery unavailable</h1>
    <p className="my-4">This local portfolio application has no email or public password-recovery service. Signed-in users can change their own password from Profile → Security. Contact the local operator if you cannot sign in.</p>
    <Link to="/login" className="text-[#F68B1F]">Back to sign in</Link>
  </div>;
}
