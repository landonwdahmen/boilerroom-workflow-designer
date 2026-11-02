// Historical /terms filename and URL retained for compatibility; project information only.
import { Link } from 'react-router-dom';

export default function ProjectInformationPage() {
  return <div className="min-h-screen bg-gray-50">
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link to="/" className="text-[#F68B1F] underline">Back to Home</Link>
      <article className="bg-white rounded-lg shadow-sm p-6 sm:p-8 mt-6 space-y-6 text-gray-700">
        <h1 className="text-3xl font-bold text-gray-900">Project information</h1>
        <p className="font-semibold">Boiler-Room — Workflow Design Demo</p>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Academic background</h2>
          <p>The original 2024–2025 South Dakota State University senior-design project was developed by Landon Dahmen, Zander Wysong, Telson Cowan and Jake McBride, associated with Triode Data Systems.</p>
          <p className="mt-3">Landon Dahmen independently completed the October 2026 recovery, security improvements, tooling migrations, testing, graph persistence and portfolio modernization. Those improvements are separate from the original four-person implementation. No sponsor endorsement is implied.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Local demonstration scope</h2>
          <p>This academic portfolio application is intended for local use with synthetic data. It demonstrates invitation-based access, organization-scoped projects, administrator editing and assigned-developer read-only access.</p>
          <p className="mt-3">The visual graph editor stores design metadata through explicit saving and reloading. Workflows, graph-driven HTTP requests, SQL, custom code and generated APIs do not execute. The application API handles authentication, project management and graph persistence.</p>
        </section>
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Repository and third-party information</h2>
          <p>Repository licensing and third-party component notices are handled separately in <code>README.md</code> and <code>THIRD_PARTY_NOTICES.md</code> in the local checkout. Source availability does not automatically grant a broad first-party open-source license.</p>
          <p className="mt-3">This page provides project context and limitations. It makes no contractual terms, privacy promises or intellectual-property grants.</p>
        </section>
        <Link to="/documentation" className="inline-block text-[#F68B1F] underline">Local development guide</Link>
      </article>
    </main>
  </div>;
}
