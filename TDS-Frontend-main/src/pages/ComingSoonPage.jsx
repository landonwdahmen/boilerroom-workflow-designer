// Historical placeholder routes are retained without product-delivery promises.
import { Link } from 'react-router-dom';

export default function ComingSoonPage() {
  return <div className="min-h-screen bg-gray-50">
    <main className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white rounded-xl shadow-sm p-6 sm:p-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Page unavailable in this portfolio demo</h1>
        <p className="text-gray-700">This address does not provide an implemented portfolio feature. The local demonstration supports invitation-based access, scoped projects and saved graph designs.</p>
        <p className="text-gray-700">Graph execution and generated APIs are disabled. Review the local development guide for supported behavior and current limitations.</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/" className="text-[#F68B1F] underline">Back to Home</Link>
          <Link to="/documentation" className="text-[#F68B1F] underline">Local development guide</Link>
        </div>
      </div>
    </main>
  </div>;
}
