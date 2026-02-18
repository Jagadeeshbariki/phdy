
import React from 'react';
import { FOOTER_DATA } from '../FooterData';

interface FooterProps {
  onNavClick: (page: any) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavClick }) => {
  const siteMap = [
    { id: 'home', label: 'Home' },
    { id: 'members', label: 'Members' },
    { id: 'ourworks', label: 'Our Works' },
    { id: 'accounting', label: 'Accounting' },
    { id: 'contact', label: 'Contact Us' },
    { id: 'admin', label: 'Sign In' }
  ];

  return (
    <footer className="bg-[#ffa600d2] text-gray-900 py-12 px-4 border-t border-orange-400">
      <div className="max-w-7xl mx-auto">
        {FOOTER_DATA.map((data, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            
            {/* Site Map Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 underline decoration-gray-900 underline-offset-8">Site Map</h2>
              <ul className="space-y-3">
                {siteMap.map((tab) => (
                  <li key={tab.id}>
                    <button 
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        onNavClick(tab.id);
                      }}
                      className="hover:text-white hover:translate-x-1 transition-all font-semibold text-gray-800"
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Our Details Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 underline decoration-gray-900 underline-offset-8">Our Details</h2>
              {data.AboutUs.map((about, i) => (
                <div key={i} className="space-y-4">
                  <p>
                    <a href={about.PLink} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      Phone: {about.Phone}
                    </a>
                  </p>
                  <p>
                    <a href={about.ILink} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      Instagram: {about.Instagram}
                    </a>
                  </p>
                  <p>
                    <a href={about.YLink} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      YouTube: {about.YouTube}
                    </a>
                  </p>
                </div>
              ))}
            </div>

            {/* External Links Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 underline decoration-gray-900 underline-offset-8">External Links</h2>
              <div className="space-y-4">
                {data.ExternalLinks.map((eLink, i) => (
                  <p key={i}>
                    <a href={eLink.Link} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      {eLink.Name}
                    </a>
                  </p>
                ))}
              </div>
            </div>

            {/* About Developer Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 underline decoration-gray-900 underline-offset-8">About Developer</h2>
              {data.AboutDeveloper.map((dev, i) => (
                <div key={i} className="space-y-4">
                  <p>
                    <a href={dev.Link} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      {dev.Name}
                    </a>
                  </p>
                  <p>
                    <a href={dev.WhatsAppLink} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      WhatsApp: {dev.Phone}
                    </a>
                  </p>
                  <p>
                    <a href={dev.MailLink} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      Mail: {dev.Mail}
                    </a>
                  </p>
                </div>
              ))}
            </div>

          </div>
        ))}

        <div className="mt-16 pt-8 border-t border-orange-400 text-center">
          <p className="text-sm font-bold text-gray-800">
            &copy; {new Date().getFullYear()} Pedda Harivanam Development Youth. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
