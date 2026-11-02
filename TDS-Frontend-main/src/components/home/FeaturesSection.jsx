// src/components/home/FeaturesSection.js
import { 
  LockClosedIcon, 
  UserGroupIcon, 
  DocumentTextIcon, 
  CubeTransparentIcon
} from '@heroicons/react/24/outline';

function FeaturesSection() {
  const features = [
    {
      title: 'Invitation-based access',
      description: 'Email-bound invitations allow developer registration. Sign-in uses secure cookies and CSRF-protected writes.',
      icon: LockClosedIcon,
      color: 'bg-[#F68B1F]',
      link: '/documentation#access'
    },
    {
      title: 'Scoped projects',
      description: 'Administrators manage their organization’s projects. Developers may inspect only projects assigned to them.',
      icon: UserGroupIcon,
      color: 'bg-[#6D6E71]',
      link: '/documentation#access'
    },
    {
      title: 'Visual design',
      description: 'Six inert node categories describe graph designs. Administrators edit nodes and edges; assigned developers have read-only access.',
      icon: CubeTransparentIcon,
      color: 'bg-[#F68B1F]',
      link: '/documentation#graph-design'
    },
    {
      title: 'Explicit persistence',
      description: 'Save and reload validated graphs in PostgreSQL. Revision conflicts retain the unsaved draft instead of overwriting a newer save.',
      icon: DocumentTextIcon,
      color: 'bg-[#6D6E71]',
      link: '/documentation#graph-design'
    }
  ];

  return (
    <section id="features" className="py-24 bg-white overflow-hidden scroll-mt-28">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h5 className="uppercase text-[#F68B1F] font-semibold tracking-wider mb-3">Features</h5>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Verified local capabilities</h2>
          <p className="text-lg text-gray-600">
            A local academic portfolio demonstration of access control, project management and persisted graph design. No graph, SQL, HTTP or custom-code execution, or dynamic API generation.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden group">
              <div className="p-6">
                <div className={`${feature.color} w-12 h-12 rounded-xl flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
                <a href={feature.link} className="text-[#F68B1F] font-medium hover:text-[#E57D18] transition-colors duration-300">
                  Learn more →
                </a>
              </div>
              <div className={`h-1 ${feature.color} w-0 group-hover:w-full transition-all duration-300`}></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
