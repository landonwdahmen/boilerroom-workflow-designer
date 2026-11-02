// src/components/home/HeroSection.js
import { Link } from 'react-router-dom';
import { ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

function HeroSection() {
  const benefits = [
    'Invitation-based registration and organization-scoped projects',
    'Administrator editing and assigned-developer read-only access',
    'Six visual graph node types for design only',
    'Explicit graph saving, reloading and revision conflicts',
    'Local demonstration with automated regression tests'
  ];

  return (
    <section className="relative pt-28 pb-24 overflow-hidden bg-gradient-to-br from-[#F68B1F] to-[#6D6E71]">
      {/* Decorative circles */}
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white opacity-5 rounded-full"></div>
      <div className="absolute top-16 -right-24 w-72 h-72 bg-white opacity-5 rounded-full"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full">
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-10 [mask-image:radial-gradient(farthest-side_at_center,white,transparent)]"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="text-white max-w-xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Visual graph design, backed by a local API.
            </h1>
            <p className="text-xl mb-8 text-white">
              Explore a senior-design portfolio application with invitation-based access, organization-scoped projects and saved graph designs.
            </p>
            <p className="text-base mb-8 text-white">Graph, SQL, HTTP and custom-code execution, and dynamic API generation, are disabled.</p>
            
            <div className="mb-10">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center mb-3">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-white" />
                  <span className="text-white">{benefit}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="/documentation#setup"
                className="px-8 py-3 bg-white text-[#F68B1F] font-semibold rounded-full hover:bg-gray-100 transition duration-300 ease-in-out shadow-lg text-center"
              >
                Local setup and demo
                <ArrowRightIcon className="h-5 w-5 ml-2 inline-block" />
              </a>
              <Link
                to="/login"
                className="px-8 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-[#F68B1F] transition duration-300 ease-in-out text-center group"
              >
                Sign In
                <ArrowRightIcon className="h-5 w-5 ml-2 inline-block group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </div>
          
          {/* Decorative illustration, not an application screenshot. */}
          <div className="hidden lg:block relative" aria-hidden="true">
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent rounded-xl blur-xl"></div>
            <div className="relative bg-white/10 backdrop-blur-sm border border-white/30 rounded-xl shadow-2xl overflow-hidden">
              <div className="p-1 bg-gradient-to-b from-white/20 to-white/5 rounded-t-xl">
                <div className="flex space-x-1.5 px-3 py-2">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 flex justify-between items-center">
                  <div className="h-8 w-36 bg-white/20 rounded-md"></div>
                  <div className="h-8 w-10 bg-white/20 rounded-md"></div>
                </div>
                <div className="space-y-3">
                  <div className="h-6 w-3/4 bg-white/20 rounded-md"></div>
                  <div className="h-20 bg-white/10 rounded-md"></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 bg-white/10 rounded-md"></div>
                    <div className="h-16 bg-white/10 rounded-md"></div>
                    <div className="h-16 bg-white/10 rounded-md"></div>
                  </div>
                  <div className="h-32 bg-white/10 rounded-md"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
