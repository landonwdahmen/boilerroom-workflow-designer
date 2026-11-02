// src/components/home/CallToActionSection.js
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

function CallToActionSection() {
  const features = [
    'Synthetic data for local demonstrations',
    'Invitation-based developer registration',
    'Graph save, reload and conflict handling',
    'Automated tests in disposable databases'
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-gradient-to-br from-[#F68B1F] to-[#6D6E71]">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-10"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white rounded-full opacity-5"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white rounded-full opacity-5"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Run the local academic portfolio demonstration</h2>
          <p className="text-lg md:text-xl mb-10 text-white opacity-90">
            Review setup, tests and current limitations before starting. Graph designs are saved as metadata; execution and dynamic API generation are disabled.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-10">
            <a
              href="/documentation#setup"
              className="px-8 py-4 bg-white text-[#F68B1F] font-semibold rounded-full hover:bg-gray-100 transition duration-300 ease-in-out shadow-lg text-center inline-flex items-center justify-center"
            >
              Local setup and demo
              <ArrowRightIcon className="h-5 w-5 ml-2" />
            </a>
            <Link
              to="/login"
              className="px-8 py-4 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-[#F68B1F] transition duration-300 ease-in-out text-center inline-flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">What the local demonstration covers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center text-white">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-white" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-sm text-white/80">
            <p>Read the <Link to="/documentation" className="underline hover:text-white">local development guide</Link> for setup, permissions and demonstration steps.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CallToActionSection;
