
import React, { useState, useEffect } from 'react';
import { WORKS_DATA } from '../constants';
import { Work } from '../types';

const OurWorksPage: React.FC = () => {
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    // Capturing the origin is crucial for YouTube player initialization in many iframe environments
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const getShortDescription = (description: string) => {
    const words = description.split(" ");
    if (words.length > 25) {
      return words.slice(0, 25).join(" ") + "...";
    }
    return description;
  };

  if (selectedWork) {
    return (
      <div className="animate-fadeIn py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <button 
            onClick={() => setSelectedWork(null)}
            className="mb-8 flex items-center text-orange-600 font-bold hover:text-orange-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to All Works
          </button>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">{selectedWork.title}</h1>
          <p className="text-orange-600 font-medium mb-8">Date: {selectedWork.date || 'Ongoing'}</p>

          <div className="prose prose-lg max-w-none text-gray-700 mb-12">
            <p className="whitespace-pre-line leading-relaxed">{selectedWork.description}</p>
          </div>

          {selectedWork.photos.length > 0 && selectedWork.photos.some(p => p && p.trim() !== "") && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-orange-100 pb-2">Photo Gallery</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedWork.photos.map((photo, i) => photo && photo.trim() !== "" && (
                  <div key={i} className="rounded-2xl overflow-hidden shadow-lg aspect-video bg-gray-100">
                    <img src={photo} alt={`${selectedWork.title} ${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedWork.videos.length > 0 && selectedWork.videos.some(v => v && v.trim() !== "") && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-orange-100 pb-2">Video Footage</h3>
              <div className="grid grid-cols-1 gap-8">
                {selectedWork.videos.map((vid, i) => {
                  const videoId = vid?.trim();
                  if (!videoId) return null;

                  // Error 153 is often resolved by ensuring 'origin' matches the host and using a clean 'youtube.com/embed/' path.
                  // 'enablejsapi=1' allows the player to correctly bridge with the parent frame.
                  const queryParams = new URLSearchParams({
                    rel: '0',
                    origin: origin,
                    enablejsapi: '1',
                    widget_referrer: origin
                  }).toString();

                  return (
                    <div key={`${videoId}-${i}`} className="aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-orange-100">
                      <iframe 
                        className="w-full h-full"
                        src={`https://www.youtube.com/embed/${videoId}?${queryParams}`}
                        title={`YouTube video for ${selectedWork.title}`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        loading="lazy"
                      ></iframe>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedWork.documents.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-orange-100 pb-2">Related Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedWork.documents.map((doc, i) => (
                  <a 
                    key={i} 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center p-4 bg-orange-50 border border-orange-100 rounded-xl hover:bg-orange-100 transition-all group"
                  >
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-orange-600 mr-4 shadow-sm">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="font-semibold text-orange-800">{doc.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn py-16 px-4 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 uppercase tracking-wider">Our Works</h1>
          <div className="w-24 h-1.5 bg-orange-600 mx-auto rounded-full mb-6"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A comprehensive record of PHDY's activities, from grama sabhas to infrastructure repairs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {WORKS_DATA.map((work) => (
            <div 
              key={work.id}
              className="bg-white rounded-3xl overflow-hidden shadow-sm border border-orange-50 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col group"
            >
              <div 
                className="relative h-56 overflow-hidden cursor-pointer"
                onClick={() => setSelectedWork(work)}
              >
                {work.photos && work.photos[0] && work.photos[0].trim() !== "" ? (
                  <img 
                    src={work.photos[0]} 
                    alt={work.title} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : (
                  <div className="w-full h-full bg-orange-100 flex items-center justify-center text-orange-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-4 left-4">
                   <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
                     {work.date || 'Record'}
                   </span>
                </div>
              </div>
              
              <div className="p-6 flex-grow flex flex-col">
                <h3 
                  className="text-xl font-bold text-gray-900 mb-3 cursor-pointer hover:text-orange-600 transition-colors"
                  onClick={() => setSelectedWork(work)}
                >
                  {work.title}
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed flex-grow">
                  {getShortDescription(work.description)}
                </p>
                <div className="flex justify-between items-center mt-auto">
                   <button 
                    onClick={() => setSelectedWork(work)}
                    className="px-5 py-2 bg-orange-600 text-white text-sm font-bold rounded-full hover:bg-orange-700 transition-all shadow-md active:scale-95"
                   >
                     Read More
                   </button>
                   <div className="flex -space-x-2">
                     {work.photos.filter(p => p && p.trim() !== "").slice(0, 3).map((_, i) => (
                       <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-orange-100"></div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OurWorksPage;
