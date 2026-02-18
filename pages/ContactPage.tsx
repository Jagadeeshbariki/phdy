
import React from 'react';
import ContactSection from '../components/ContactSection';

const ContactPage: React.FC = () => {
  return (
    <div className="animate-fadeIn py-16 px-4 min-h-[70vh] flex items-center">
      <div className="max-w-7xl mx-auto w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Get In Touch</h1>
          <div className="w-24 h-1.5 bg-orange-600 mx-auto rounded-full"></div>
        </div>
        <ContactSection />
      </div>
    </div>
  );
};

export default ContactPage;
