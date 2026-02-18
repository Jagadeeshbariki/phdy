
import React, { useState, useEffect } from 'react';
import MembersList from '../components/MembersList';

interface HomeProps {
  onNavigate: (page: 'home' | 'members' | 'ourworks' | 'accounting' | 'contact' | 'admin') => void;
}

const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetch('./AboutConfig.json')
      .then(res => res.json())
      .then(data => {
        if (data && data[0] && data[0].history) {
          setHistory(data[0].history);
        }
      })
      .catch(err => console.error("Error loading history:", err));
  }, []);

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

              <div className="flex flex-col sm:flex-row gap-6 justify-center md:justify-start">
                <button 
                  onClick={() => document.getElementById('our-story')?.scrollIntoView({ behavior: 'smooth' })}
                  className="px-12 py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-orange-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center group"
                >
                  <span>Our Story</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-3 group-hover:translate-y-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button 
                  onClick={() => onNavigate('contact')}
                  className="px-12 py-5 bg-white/5 hover:bg-white/10 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-105"
                >
                  Join the Mission
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

      {/* Members Section - Fetched from Spreadsheet */}
      <section className="py-24 px-6 bg-gray-50 border-t border-gray-100">
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
