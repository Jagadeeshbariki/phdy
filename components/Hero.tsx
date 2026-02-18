
import React from 'react';

const Hero: React.FC = () => {
  return (
    <div className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background Video Simulator / Placeholder */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://assets.mixkit.co/videos/preview/mixkit-hand-holding-a-green-plant-40114-large.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      <div className="relative z-20 text-center px-4 max-w-4xl">
        <span className="inline-block py-1 px-3 rounded-full bg-green-600/30 text-green-300 text-sm font-medium border border-green-500/50 mb-6">
          Established 2024 • Pedda Harivanam
        </span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Empowering Youth, <br />
          <span className="text-green-400">Transforming Village.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
          The Pedda Harivanam Development Youth (PHDY) group was started with a single vision: 
          to harness the energy of our youth to create sustainable infrastructure, 
          quality education, and clean surroundings for our village.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <button 
            onClick={() => document.getElementById('members')?.scrollIntoView({behavior:'smooth'})}
            className="w-full sm:w-auto px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-full font-semibold shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            Meet the Group
          </button>
          <button 
            onClick={() => document.getElementById('contact')?.scrollIntoView({behavior:'smooth'})}
            className="w-full sm:w-auto px-8 py-4 bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/30 rounded-full font-semibold transition-all"
          >
            Join Our Mission
          </button>
        </div>
      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
};

export default Hero;
