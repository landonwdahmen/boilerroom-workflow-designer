import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="text-2xl font-bold text-white">Boiler-Room — Workflow Design Demo</Link>
            <p className="mt-4 text-gray-400">Academic portfolio demonstration of scoped projects and saved graph designs. Execution is disabled.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">Local guide</h3>
            <ul className="mt-4 space-y-4 text-gray-400">
              <li><a href="/documentation#capabilities" className="hover:text-white">Capabilities</a></li>
              <li><a href="/documentation#setup" className="hover:text-white">Setup and demo</a></li>
              <li><a href="/documentation#graph-design" className="hover:text-white">Graph persistence</a></li>
              <li><a href="/documentation#testing" className="hover:text-white">Testing and limitations</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">Application</h3>
            <ul className="mt-4 space-y-4 text-gray-400">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
              <li><Link to="/signup" className="hover:text-white">Register with invitation</Link></li>
              <li><Link to="/terms" className="hover:text-white">Project information</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wider uppercase">Academic history</h3>
            <p className="mt-4 text-gray-400">Original 2024–2025 South Dakota State University senior-design team: Landon Dahmen, Zander Wysong, Telson Cowan and Jake McBride.</p>
            <p className="mt-4 text-gray-400">Original project associated with Triode Data Systems. No sponsor endorsement of this portfolio demonstration is implied.</p>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800">
          <p className="text-base text-gray-400 text-center">Independent October 2026 portfolio modernization by Landon Dahmen, separate from the original team implementation.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
