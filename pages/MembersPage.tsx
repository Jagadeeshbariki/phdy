
import React from 'react';
import MembersList from '../components/MembersList';

const MembersPage: React.FC = () => {
  return (
    <div className="animate-fadeIn py-16 px-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Our <span className="text-orange-600">Group Members</span>
          </h1>
          <div className="w-32 h-2 bg-orange-600 mx-auto rounded-full mb-8"></div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Meet the passionate individuals of Pedda Harivanam who have come together to build a brighter, more sustainable future for our community.
          </p>
        </div>
        
        <div className="bg-white p-8 md:p-12 rounded-[40px] shadow-xl shadow-orange-100/50 border border-orange-100 mb-16 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
            
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-8">
                  <div className="w-14 h-14 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                  </div>
                  <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Collective Strength</h2>
              </div>
              <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  PHDY is built on the principle that "Village growth starts with youth empowerment." Our members come from diverse backgrounds, including B.Tech graduates, MBAs, and dedicated students, all united by a single mission.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <span className="block text-2xl font-black text-orange-600">30+</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Active Members</span>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <span className="block text-2xl font-black text-orange-600">100%</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Voluntary</span>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <span className="block text-2xl font-black text-orange-600">Diverse</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Backgrounds</span>
                </div>
                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center">
                  <span className="block text-2xl font-black text-orange-600">Active</span>
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Daily Presence</span>
                </div>
              </div>
            </div>
        </div>

        <MembersList />
      </div>
    </div>
  );
};

export default MembersPage;
