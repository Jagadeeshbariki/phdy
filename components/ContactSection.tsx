import React from 'react';
import { CONTACT_SOCIAL_LINKS } from '../ContactData';
import { Mail, MapPin, Phone, Clock, Globe, ShieldCheck, HeartHandshake, ExternalLink } from 'lucide-react';

const ContactSection: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-orange-500/10 mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl pointer-events-none"></div>

        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider mb-4">
            <HeartHandshake className="w-4 h-4 text-amber-200" />
            <span>Community Youth Organization</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Pedda Harivanam Development Youth (PHDY)
          </h2>

          <p className="text-orange-100 text-sm sm:text-base leading-relaxed">
            We are dedicated to the progress, educational empowerment, and infrastructure development of Pedda Harivanam village. Reach out to our organizing committee through any of our official channels.
          </p>
        </div>
      </div>

      {/* Grid: Contact Information Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* Email Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <Mail className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
              Official Email
            </span>
            <h3 className="text-base font-black text-gray-900 tracking-tight mb-2">
              Email Us Directly
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              For administrative inquiries, proposals, and official correspondence.
            </p>
          </div>

          <a 
            href="mailto:peddaharivanamdevelopmentyouth@gmail.com"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 break-all inline-flex items-center gap-1.5"
          >
            <span>peddaharivanamdevelopmentyouth@gmail.com</span>
            <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          </a>
        </div>

        {/* Location Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <MapPin className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
              Village Headquarters
            </span>
            <h3 className="text-base font-black text-gray-900 tracking-tight mb-2">
              Our Location
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed font-medium">
              Pedda Harivanam Village,<br />
              Adoni Mandal, Kurnool District,<br />
              Andhra Pradesh, India – 518313
            </p>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 text-[11px] font-bold text-gray-400">
            Gram Panchayat • Kurnool District
          </div>
        </div>

        {/* Association Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
              Organization
            </span>
            <h3 className="text-base font-black text-gray-900 tracking-tight mb-2">
              PHDY Association
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Youth empowerment, social welfare, village GIS mapping, and transparent public accounting initiatives.
            </p>
          </div>

          <div className="pt-4 mt-2 border-t border-gray-100 flex items-center gap-1.5 text-xs font-black text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active Community Body</span>
          </div>
        </div>
      </div>

      {/* Social Media Channels */}
      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
        <div className="text-center max-w-xl mx-auto mb-8">
          <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">
            Connect With Us Online
          </h3>
          <p className="text-xs text-gray-500">
            Follow our official social media handles for latest event updates, photo galleries, and youth announcements.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {CONTACT_SOCIAL_LINKS.map((link, idx) => (
            <a
              key={idx}
              href={link.URLofsocialMedia}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 rounded-2xl transition-all group shadow-sm text-center"
            >
              <img 
                src={link.LogoURL} 
                alt={link.Name} 
                className="w-10 h-10 object-contain mb-2 group-hover:scale-110 transition-transform" 
              />
              <span className="font-bold text-xs text-gray-800 group-hover:text-orange-600 transition-colors">
                {link.Name}
              </span>
            </a>
          ))}
        </div>
      </div>

    </div>
  );
};

export default ContactSection;
