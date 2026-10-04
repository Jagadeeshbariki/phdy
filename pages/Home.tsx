
import React, { useState } from 'react';
import MembersList from '../components/MembersList';
import { MultiTierDashboard } from '../components/MultiTierDashboard';
import { Page } from '../App';
import aboutConfigData from '../public/AboutConfig.json';

interface HomeProps {
  onNavigate: (page: Page) => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [history] = useState<any[]>(() => {
    const config = Array.isArray(aboutConfigData) ? aboutConfigData[0] : aboutConfigData;
    return config?.history || [];
  });

  return (
    <div className="animate-fadeIn">
      {/* Video Section - Explaining the Youth Group Work and Motivation */}
      <section className="bg-black w-full overflow-hidden border-b-4 border-orange-600">
        <div className="relative w-full max-w-7xl mx-auto aspect-video max-h-[80vh]">
          <video 
            autoPlay 
            muted={true} // Allow sound by default if browser permits, or user can toggle
            loop 
            playsInline
            controls
            className="w-full h-full object-contain"
          >
            <source src="https://res.cloudinary.com/dbohmpxko/video/upload/v1731135707/InShot_20241109_122018230_1_ak3bdq.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>
      </section>

      {/* Hero Content */}
      <section className="bg-[#111111] py-20 px-6 border-b border-gray-900">
        <div className="max-w-7xl mx-auto text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-3xl">
              <div className="inline-block px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] md:text-xs font-black uppercase tracking-[0.3em] mb-10 shadow-lg">
                PHDY • Pedda Harivanam
              </div>
              
              <h1 className="text-5xl md:text-8xl font-black text-white mb-8 leading-[1]">
                Empowering Our <br />
                <span className="text-orange-500">Village Youth</span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl font-medium leading-relaxed">
                A dedicated group of youth committed to the sustainable development and infrastructure of <span className="text-white">Pedda Harivanam</span>. Join us in making a difference.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                <button 
                  onClick={() => onNavigate('villagemap')}
                  className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group text-xs md:text-sm"
                >
                  <span>Village Map</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </button>
                <button 
                  onClick={() => document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group text-xs md:text-sm"
                >
                  <span>Our Story</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button 
                  onClick={() => document.getElementById('members')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 text-xs md:text-sm"
                >
                  Meet the Team
                </button>
                <button 
                  onClick={() => onNavigate('contact')}
                  className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 text-xs md:text-sm"
                >
                  Join Us
                </button>
              </div>
            </div>

            <div className="hidden lg:flex items-center justify-center relative">
               <div className="w-80 h-80 border border-orange-600/20 rounded-full flex items-center justify-center">
                  <div className="w-64 h-64 bg-orange-600/10 rounded-full flex items-center justify-center text-center animate-pulse">
                      <p className="text-orange-600 font-black text-3xl uppercase tracking-widest">PHDY<br/>2024</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* History Section */}
      <section id="our-story" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-xs mb-4 block">Our Motivation</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-8 uppercase font-poppins">Why We Started</h2>
            <div className="w-24 h-2 bg-orange-600 mx-auto rounded-full"></div>
          </div>
          
          <div className="space-y-12 text-gray-600 text-lg md:text-xl leading-relaxed font-medium">
            {history.length > 0 ? (
              history.map((item, idx) => (
                <div key={idx} className="relative pl-10 border-l-4 border-orange-50 hover:border-orange-600 transition-all duration-500 py-2">
                  <p className="hover:text-gray-900 transition-colors">
                    {item.p}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-center italic">Loading PHDY history...</p>
            )}
          </div>
        </div>
      </section>

      {/* Village Map Preview Section */}
      <section id="village-map" className="py-24 px-6 bg-white border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-xs mb-4 block">Geo Special Map</span>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 uppercase tracking-wider font-poppins">Village <span className="text-orange-600">Map</span></h2>
              <p className="text-xl text-gray-600 mb-8 font-medium leading-relaxed">
                Explore the geographical details of Pedda Harivanam through our interactive village map. 
                This map features high-resolution hybrid satellite imagery and official village boundary overlays.
              </p>
              <button 
                onClick={() => onNavigate('villagemap')}
                className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105 shadow-lg flex items-center gap-2 text-xs md:text-sm"
              >
                <span>View Full Map</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>
            <div className="lg:w-1/2 w-full h-[450px] rounded-3xl overflow-hidden shadow-2xl border border-gray-100 group relative bg-slate-900 flex flex-col items-center justify-center p-8 text-center">
              {/* Decorative Background Elements */}
              <div className="absolute inset-0 opacity-20 z-0">
                <div className="absolute top-10 left-10 w-32 h-32 bg-orange-600 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-10 right-10 w-40 h-40 bg-amber-600 rounded-full blur-3xl animate-pulse delay-700"></div>
              </div>
              
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 flex items-center justify-center mb-8 shadow-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">Interactive Village Map</h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-xs mb-8">
                  Access official geographical records with Hybrid Satellite views and live boundary data for Pedda Harivanam.
                </p>
                
                <button 
                  onClick={() => onNavigate('villagemap')}
                  className="px-8 py-3 bg-white text-slate-900 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-50 transition-all shadow-xl flex items-center gap-2"
                >
                  Explore Village Map
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>

              {/* Status Badge */}
              <div className="absolute top-6 right-6 z-20">
                <div className="bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Portal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Tier Access Control Interactive Section */}
      <section id="tier-dashboard" className="border-t border-gray-200">
        <MultiTierDashboard 
          loggedInUser={(() => {
            try {
              const saved = sessionStorage.getItem('phdy_admin_session');
              return saved ? JSON.parse(saved) : null;
            } catch {
              return null;
            }
          })()} 
          onNavigate={onNavigate} 
          isStandalonePage={false} 
        />
      </section>

      {/* Members Section - Fetched from Spreadsheet */}
      <section id="members" className="py-24 px-6 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-orange-600 font-black uppercase tracking-[0.4em] text-xs mb-4 block">Our Team</span>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 uppercase tracking-wider font-poppins">Group Members</h2>
            <div className="w-24 h-2 bg-orange-600 mx-auto rounded-full mb-8"></div>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto font-bold uppercase tracking-tight">
              United for the progress of Pedda Harivanam.
            </p>
          </div>
          <MembersList />
        </div>
      </section>
    </div>
  );
};

export default Home;
