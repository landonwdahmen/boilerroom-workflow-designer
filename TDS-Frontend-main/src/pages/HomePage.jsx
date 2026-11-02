// src/pages/HomePage.js

import HeroSection from '../components/home/HeroSection';
import FeaturesSection from '../components/home/FeaturesSection';
import TestimonialsSection from '../components/home/TestimonialsSection';
import CallToActionSection from '../components/home/CallToActionSection';
import Navbar from '../components/navigation/Navbar';
import Footer from '../components/navigation/Footer';

function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="relative">
        <HeroSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CallToActionSection />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;