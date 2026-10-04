
import React, { useState, useEffect } from 'react';
import { FOOTER_DATA } from '../FooterData';
import { LoggedInUser } from '../App';
import { isSupabaseConfigured, getSupabaseClient } from '../lib/supabaseClient';
import { Database } from 'lucide-react';

interface FooterProps {
  onNavClick: (page: any) => void;
  loggedInUser?: LoggedInUser | null;
  onOpenSupabaseTester?: () => void;
}

const Footer: React.FC<FooterProps> = ({ onNavClick, loggedInUser, onOpenSupabaseTester }) => {
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(() => isSupabaseConfigured());

  useEffect(() => {
    let isMounted = true;

    const checkLiveConnection = async () => {
      if (!isSupabaseConfigured()) {
        if (isMounted) setSupabaseConnected(false);
        return;
      }
      try {
        const client = getSupabaseClient();
        const { error } = await client.auth.getSession();
        if (isMounted) {
          setSupabaseConnected(!error);
        }
      } catch {
        if (isMounted) setSupabaseConnected(false);
      }
    };

    checkLiveConnection();

    const handleUpdate = () => {
      checkLiveConnection();
    };

    window.addEventListener('supabase-config-loaded', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('supabase-config-loaded', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);
  const roleLower = String(loggedInUser?.role || '').toLowerCase();
  const isAdmin = Boolean(loggedInUser && (roleLower === 'admin' || roleLower === 'super_admin'));
  const isMember = Boolean(loggedInUser && (roleLower === 'phdy_member' || roleLower === 'member' || roleLower === 'treasurer' || roleLower === 'tressurer' || roleLower === 'moderator'));
  const isTier1User = Boolean(loggedInUser && !isAdmin && !isMember);
  const isGuest = !loggedInUser;

  const siteMap: { id: string; label: string }[] = [];
  siteMap.push({ id: 'home', label: 'Home' });
  siteMap.push({ id: 'villagemap', label: 'Village Map' });

  if (isMember || isAdmin) {
    siteMap.push({ id: 'members', label: 'Members' });
  }

  if (isAdmin) {
    siteMap.push({ id: 'ourworks', label: 'Our Works' });
  }

  if (isTier1User || isMember || isAdmin) {
    siteMap.push({ id: 'accounting', label: 'Accounting' });
  }

  if (isMember || isAdmin) {
    siteMap.push({ id: 'internal', label: 'PHDY Internal' });
  }

  if (!isGuest) {
    siteMap.push({ id: 'dashboard', label: 'Tier Dashboard' });
  }

  if (isAdmin) {
    siteMap.push({ id: 'admin', label: 'Admin Portal' });
  }

  siteMap.push({ id: 'contact', label: 'Contact Us' });

  if (isGuest) {
    siteMap.push({ id: 'login', label: 'Sign In' });
  }

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
                    <a href={about.ELink} target="_blank" rel="noreferrer" className="hover:text-white transition-colors font-semibold">
                      Email: {about.email}
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

        <div className="mt-16 pt-8 border-t border-orange-400 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-bold text-gray-800">
            &copy; {new Date().getFullYear()} Pedda Harivanam Development Youth. All rights reserved.
          </p>

          <button
            type="button"
            onClick={() => {
              if (onOpenSupabaseTester) {
                onOpenSupabaseTester();
              } else {
                window.dispatchEvent(new CustomEvent('open-supabase-tester'));
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/95 hover:bg-white text-gray-800 text-xs font-semibold shadow-sm border border-orange-300 transition-all hover:shadow hover:scale-105 cursor-pointer"
            title="Click to test Supabase connection & database tables"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="flex items-center gap-1.5">
              <span>Supabase:</span>
              <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className={supabaseConnected ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                {supabaseConnected ? 'Connected' : 'Offline / Setup'}
              </span>
            </span>
            <span className="text-[10px] bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-mono font-bold ml-1">
              Test
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
