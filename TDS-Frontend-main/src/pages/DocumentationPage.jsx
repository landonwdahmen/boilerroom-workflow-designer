import { Link } from 'react-router-dom';
import { BookOpenIcon, LockClosedIcon, CubeTransparentIcon, DocumentCheckIcon } from '@heroicons/react/24/outline';

function DocumentationPage() {
  const sections = [
    { title: 'Local setup', id: 'setup', icon: BookOpenIcon },
    { title: 'Accounts and permissions', id: 'access', icon: LockClosedIcon },
    { title: 'Graph design and persistence', id: 'graph-design', icon: CubeTransparentIcon },
    { title: 'Testing and limitations', id: 'testing', icon: DocumentCheckIcon }
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="text-[#F68B1F] underline">Back to Home</Link>
        <div className="text-center my-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Local development documentation</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Boiler-Room — Workflow Design Demo is an academic portfolio application for scoped projects and saved graph designs.</p>
          <p className="text-gray-600 max-w-3xl mx-auto mt-4">Graph, SQL, HTTP and custom-code execution, and dynamic API generation, are disabled. This project does not generate or execute APIs from graphs.</p>
        </div>

        <nav aria-label="Documentation sections" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {sections.map(section => (
            <a key={section.id} href={'#' + section.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow text-[#F68B1F]">
              <section.icon className="h-8 w-8 mb-3" aria-hidden="true" />
              <span className="font-semibold">{section.title}</span>
            </a>
          ))}
        </nav>

        <div className="space-y-8 text-gray-700">
          <section id="capabilities" className="bg-white rounded-xl shadow-sm p-6 sm:p-8 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Verified local capabilities</h2>
            <p>Invitation-based registration, organization-scoped projects, administrator editing, assigned-developer read-only access, and explicit graph save/reload with revision conflict handling.</p>
            <p className="mt-3">This is a locally tested demonstration. No commercial deployment, enterprise adoption, real-time collaboration, cloud scaling or product support service is claimed.</p>
          </section>

          <section id="setup" className="bg-white rounded-xl shadow-sm p-6 sm:p-8 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Local setup and demo</h2>
            <p>The verified local environment uses Windows, PowerShell 7.2+, .NET 10, Node.js 22.14.0/npm 10.9.2, Docker Desktop in Linux mode and normally trusted localhost HTTPS.</p>
            <ol className="list-decimal pl-6 space-y-3 mt-4">
              <li>In your local checkout, read <code>README.md</code> and <code>database/README.md</code> for the full setup and existing-database safeguards.</li>
              <li>Restore the reviewed dependencies using <code>scripts/Test-Frontend.ps1 -Task Restore</code> and <code>scripts/Test-Backend.ps1 -Task Restore</code>. Keep lifecycle hooks disabled and preserve dependency pins.</li>
              <li>Follow the documented private-environment and PostgreSQL setup. Preserve existing volumes and records; never reset the development database for a demonstration.</li>
              <li>Use <code>FRONTEND_INTEGRATION.md</code> for normal certificate export/trust. Build first, then run <code>scripts/Start-LocalApi.ps1</code> and <code>scripts/Start-LocalFrontend.ps1</code> in separate PowerShell terminals.</li>
              <li>Read <code>DEMO.md</code> and <code>TESTING.md</code> for the guarded disposable-database rehearsal. Use synthetic identities and keep fixture credentials private.</li>
            </ol>
            <p className="mt-4">These filenames refer to your local checkout; they are not files served by this website. The frontend uses HTTPS localhost port 3000 and the API uses HTTPS localhost port 8836. Do not expose either service publicly or bypass TLS checks.</p>
          </section>

          <section id="access" className="bg-white rounded-xl shadow-sm p-6 sm:p-8 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Accounts and permissions</h2>
            <p>A local operator provisions a synthetic organization and administrator with the existing interactive <code>tools/LocalAdministrator</code> tool. It writes to the configured database, so verify its target first. Public signup cannot create administrators.</p>
            <p className="mt-3">Administrators issue email-bound, expiring, single-use developer invitations and create projects with an assignment. Developers register with the matching email and private code, then sign in explicitly. Administrators manage their own organization; developers see only assigned projects and inspect their graphs read-only. Backend checks enforce these boundaries.</p>
            <p className="mt-3">Sign-in uses secure cookies; writes require CSRF validation. Normal sessions expire after 30 minutes and end on API restart. Logout revokes the current session, and password changes revoke all of that user’s sessions. Password recovery is unavailable. Read <code>database/AUTHENTICATION.md</code> for the actual contract.</p>
            <div className="flex flex-col sm:flex-row gap-4 mt-5">
              <Link to="/login" className="text-[#F68B1F] underline">Sign in</Link>
              <Link to="/signup" className="text-[#F68B1F] underline">Register with invitation</Link>
            </div>
          </section>

          <section id="graph-design" className="bg-white rounded-xl shadow-sm p-6 sm:p-8 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Graph design and persistence</h2>
            <p>Open Playground from an assigned project. The six design-only types are API Trigger, HTTP Request, Database Query, Custom Logic, Send Response and SQL Table. Administrators edit nodes and edges; assigned developers inspect the saved graph.</p>
            <p className="mt-3">Click Save graph explicitly, observe its saved revision, then reload or reopen the project to verify PostgreSQL JSONB persistence. Editing alone does not save. A stale revision returns a conflict and retains the local draft; Reload saved graph requires an explicit decision to discard that draft.</p>
            <p className="mt-3">Graph-driven requests, SQL, custom code and dynamic API generation do not run. Nonempty excluded code/query/body/parameters are rejected; never enter credentials or confidential data into node metadata. Read <code>EDITOR_SECURITY.md</code> and <code>database/GRAPH_PERSISTENCE.md</code> in the checkout.</p>
          </section>

          <section id="testing" className="bg-white rounded-xl shadow-sm p-6 sm:p-8 scroll-mt-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Testing and limitations</h2>
            <p>Use <code>TESTING.md</code> for frontend tests/lint/build, xUnit tests, isolated PostgreSQL checks, security/graph probes and real Edge workflows. Database fixture suites run sequentially against disposable resources, with ownership checks and cleanup. Do not use development records as test fixtures.</p>
            <p className="mt-3">GitHub Actions definitions were validated locally; no GitHub-hosted CI run is claimed. Local verification is not production security certification. Workflow execution, distributed sessions, project reassignment and password recovery are outside the implemented scope.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DocumentationPage;
