
import React, { useState, useEffect } from 'react';
import { WORKS_DATA } from '../constants';
import { Work } from '../types';
import { db, handleFirestoreError, OperationType } from '../src/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

const isCloudinaryUrl = (url: string) => {
  return typeof url === 'string' && url.includes('cloudinary.com');
};
// ... rest of utility functions ...
const getCloudinaryPageImageUrl = (url: string, page: number = 1): string => {
  if (!isCloudinaryUrl(url)) return url;
  
  // Convert .pdf to .jpg so Cloudinary serves the rendered document image with 200 OK
  let converted = url.replace(/\.pdf($|\?)/i, '.jpg$1');
  
  if (converted.includes('/image/upload/')) {
    if (/\/pg_\d+\//.test(converted)) {
      converted = converted.replace(/\/pg_\d+\//, `/pg_${page}/`);
    } else {
      converted = converted.replace(/\/image\/upload\/(v\d+\/)?/, `/image/upload/pg_${page}/$1`);
    }
  }
  return converted;
};

const getCloudinaryDownloadUrl = (url: string): string => {
  if (!isCloudinaryUrl(url)) return url;
  
  let downloadUrl = url;
  if (downloadUrl.includes('/image/upload/')) {
    // fl_attachment forces instant file download with 200 OK
    downloadUrl = downloadUrl.replace(/\/image\/upload\//, '/image/upload/fl_attachment/');
    downloadUrl = downloadUrl.replace(/\.pdf($|\?)/i, '.jpg$1');
  }
  return downloadUrl;
};

const DocumentPreviewRow: React.FC<{ doc: { name: string, url: string }, embedUrl: string }> = ({ doc, embedUrl }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [imgLoading, setImgLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLastPage, setIsLastPage] = useState(false);

  const isCloudinary = isCloudinaryUrl(doc.url);
  const pageImageUrl = getCloudinaryPageImageUrl(doc.url, page);
  const downloadUrl = isCloudinary ? getCloudinaryDownloadUrl(doc.url) : doc.url;

  const handlePrevPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (page > 1) {
      setImgLoading(true);
      setHasError(false);
      setIsLastPage(false);
      setPage(p => p - 1);
    }
  };

  const handleNextPage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLastPage) {
      setImgLoading(true);
      setHasError(false);
      setPage(p => p + 1);
    }
  };

  const handleImageError = () => {
    setImgLoading(false);
    if (page > 1) {
      setIsLastPage(true);
      setPage(p => p - 1);
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-wrap items-center justify-between p-4 bg-orange-50 border border-orange-100 rounded-2xl cursor-pointer hover:bg-orange-100 transition-colors gap-3"
      >
        <div className="flex items-center min-w-0">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-orange-600 mr-3 shadow-sm flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="truncate">
            <p className="font-bold text-orange-950 truncate">{doc.name}</p>
            <span className="text-[11px] text-orange-700 font-medium">Official Attached Document</span>
          </div>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={doc.name}
            className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:text-orange-600 hover:border-orange-200 border border-gray-200 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            title="Download file"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Download</span>
          </a>

          <a
            href={isCloudinary ? pageImageUrl : doc.url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-xs font-bold text-gray-700 bg-white hover:text-orange-600 hover:border-orange-200 border border-gray-200 rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            title="Open in new tab"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            <span className="hidden sm:inline">New Tab</span>
          </a>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-1.5 text-xs font-black uppercase tracking-wider bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-all shadow-sm flex items-center gap-1"
          >
            <span>{isOpen ? 'Close' : 'Preview'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="w-full border-2 border-orange-200 rounded-2xl overflow-hidden bg-slate-900 shadow-xl animate-fadeIn flex flex-col">
          {isCloudinary ? (
            <div>
              {/* Document Toolbar */}
              <div className="bg-slate-800 text-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 text-xs select-none">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-300 truncate max-w-[200px] sm:max-w-xs">{doc.name}</span>
                </div>

                {/* Page and Zoom Navigation */}
                <div className="flex items-center gap-4">
                  {/* Page Controls */}
                  <div className="flex items-center bg-slate-700 rounded-lg p-0.5 border border-slate-600">
                    <button
                      type="button"
                      onClick={handlePrevPage}
                      disabled={page <= 1}
                      className="px-2 py-1 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200 font-bold transition-colors"
                      title="Previous Page"
                    >
                      ‹
                    </button>
                    <span className="px-2 font-mono text-[11px] font-bold text-orange-400">Page {page}</span>
                    <button
                      type="button"
                      onClick={handleNextPage}
                      disabled={isLastPage}
                      className="px-2 py-1 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200 font-bold transition-colors"
                      title="Next Page"
                    >
                      ›
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="hidden sm:flex items-center bg-slate-700 rounded-lg p-0.5 border border-slate-600">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setZoom(z => Math.max(60, z - 15)); }}
                      className="px-2 py-1 hover:bg-slate-600 rounded text-slate-200 font-bold"
                      title="Zoom Out"
                    >
                      -
                    </button>
                    <span className="px-2 font-mono text-[11px] text-slate-300 min-w-[45px] text-center">{zoom}%</span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setZoom(z => Math.min(180, z + 15)); }}
                      className="px-2 py-1 hover:bg-slate-600 rounded text-slate-200 font-bold"
                      title="Zoom In"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setZoom(100); }}
                      className="px-1.5 py-1 hover:bg-slate-600 rounded text-[10px] text-slate-400"
                      title="Reset Zoom"
                    >
                      100%
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={pageImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400 hover:text-orange-300 font-semibold underline text-[11px]"
                  >
                    Open Full Image
                  </a>
                </div>
              </div>

              {/* Document Display Canvas */}
              <div className="relative min-h-[550px] max-h-[800px] overflow-auto p-4 sm:p-8 bg-slate-950 flex items-center justify-center">
                {imgLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 z-10 space-y-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-400 border-t-transparent"></div>
                    <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Rendering Document Page...</p>
                  </div>
                )}

                {hasError ? (
                  <div className="text-center p-8 bg-slate-800 rounded-xl max-w-md border border-slate-700">
                    <p className="text-red-400 font-bold mb-2">Could not render preview</p>
                    <p className="text-slate-400 text-xs mb-4">You can still download or open the file directly.</p>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg shadow"
                    >
                      Download Document
                    </a>
                  </div>
                ) : (
                  <div 
                    className="transition-transform duration-200 origin-top shadow-2xl bg-white rounded-lg overflow-hidden flex justify-center"
                    style={{ transform: `scale(${zoom / 100})` }}
                  >
                    <img 
                      src={pageImageUrl}
                      alt={`${doc.name} Page ${page}`}
                      onLoad={() => setImgLoading(false)}
                      onError={handleImageError}
                      className="max-w-full h-auto object-contain block select-none"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-[600px] bg-gray-50">
              <iframe 
                src={embedUrl}
                className="w-full h-full border-0"
                title={doc.name}
                allow="autoplay"
              ></iframe>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatDisplayDate = (dateStr: string | undefined): string => {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return trimmed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parts = trimmed.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

interface ParsedVideoLink {
  type: 'youtube' | 'external_live';
  embedUrl?: string;
  watchUrl: string;
  label: string;
}

const parseVideoOrLiveLink = (rawLink: string, currentOrigin: string): ParsedVideoLink | null => {
  if (!rawLink || typeof rawLink !== 'string') return null;
  const link = rawLink.trim();
  if (!link) return null;

  // 1. YouTube 11-char ID directly (e.g. gXbjujix5lU)
  if (/^[a-zA-Z0-9_-]{11}$/.test(link)) {
    const queryParams = new URLSearchParams({
      rel: '0',
      origin: currentOrigin,
      enablejsapi: '1'
    }).toString();
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${link}?${queryParams}`,
      watchUrl: `https://www.youtube.com/watch?v=${link}`,
      label: 'YouTube Video'
    };
  }

  // 2. YouTube URL (watch?v=, youtu.be/, live/, shorts/, embed/)
  const ytMatch = link.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/|shorts\/))([\w-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const queryParams = new URLSearchParams({
      rel: '0',
      origin: currentOrigin,
      enablejsapi: '1'
    }).toString();
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${videoId}?${queryParams}`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      label: link.includes('/live/') ? 'YouTube Live Stream' : 'YouTube Video'
    };
  }

  // 3. Any other live stream or broadcast link (Facebook Live, Zoom, generic stream URL)
  if (link.startsWith('http://') || link.startsWith('https://')) {
    return {
      type: 'external_live',
      watchUrl: link,
      label: 'Live Broadcast / Stream'
    };
  }

  return null;
};

const OurWorksPage: React.FC = () => {
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [origin, setOrigin] = useState('');
  const [works, setWorks] = useState<Work[]>(WORKS_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Capturing the origin is crucial for YouTube player initialization in many iframe environments
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }

    setLoading(true);
    
    const q = query(collection(db, 'works'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const firestoreWorks: Work[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id as any,
          title: data.title || '',
          date: data.date || '',
          description: data.description || '',
          photos: data.imageUrls || data.photos || [],
          videos: data.videos || (data.youtubeLink ? [data.youtubeLink] : []),
          documents: data.docUrls || data.documents || []
        };
      });

      // Merge with static
      const staticWorks = WORKS_DATA.filter(
        sw => !firestoreWorks.some(fw => fw.title.toLowerCase() === (sw.title || '').toLowerCase())
      );
      
      setWorks([...firestoreWorks, ...staticWorks]);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'works');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleDownload = async (url: string, filename: string) => {
    try {
      // Fetch the file as a blob to bypass browser viewer issues and force download
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab if blob download fails
      window.open(url, '_blank');
    }
  };

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
              <div className="flex items-center justify-between mb-6 border-b-2 border-orange-100 pb-2">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <span>Video Footage & Live Links</span>
                  <span className="bg-red-100 text-red-700 text-xs font-black px-2.5 py-0.5 rounded-full uppercase">
                    Live
                  </span>
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-8">
                {selectedWork.videos.map((vid, i) => {
                  const parsed = parseVideoOrLiveLink(vid, origin);
                  if (!parsed) return null;

                  if (parsed.type === 'youtube' && parsed.embedUrl) {
                    return (
                      <div key={i} className="flex flex-col space-y-3">
                        <div className="aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black border-4 border-orange-100 relative">
                          <iframe 
                            className="w-full h-full"
                            src={parsed.embedUrl}
                            title={`${selectedWork.title} Video ${i + 1}`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                          ></iframe>
                        </div>
                        <div className="flex flex-wrap items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl gap-2 text-xs">
                          <div className="flex items-center gap-2 font-bold text-gray-700">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse"></span>
                            <span>{parsed.label}</span>
                          </div>
                          <a 
                            href={parsed.watchUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                            <span>Watch on YouTube / Open App</span>
                          </a>
                        </div>
                      </div>
                    );
                  }

                  if (parsed.type === 'external_live') {
                    return (
                      <div key={i} className="p-6 bg-gradient-to-br from-red-600 to-orange-600 text-white rounded-3xl shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
                            <span className="w-4 h-4 rounded-full bg-white animate-ping"></span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-white text-red-600 font-black text-[10px] rounded uppercase tracking-wider">LIVE</span>
                              <h4 className="font-bold text-lg">{parsed.label}</h4>
                            </div>
                            <p className="text-white/80 text-xs truncate max-w-md">{parsed.watchUrl}</p>
                          </div>
                        </div>
                        <a
                          href={parsed.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-white text-red-600 hover:bg-orange-50 font-black text-sm rounded-xl shadow-lg transition-all flex items-center gap-2 flex-shrink-0"
                        >
                          <span>Watch Live Stream</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          )}

          {selectedWork.documents.length > 0 && (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 border-b-2 border-orange-100 pb-2">Related Documents</h3>
              <div className="grid grid-cols-1 gap-4">
                {selectedWork.documents.map((doc, i) => {
                  let embedUrl = doc.url;
                  if (embedUrl.includes('drive.google.com')) {
                    if (embedUrl.includes('/view')) {
                      embedUrl = embedUrl.replace(/\/view.*/, '/preview');
                    } else {
                      const match = embedUrl.match(/id=([^&]+)/);
                      if (match) {
                        embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
                      } else {
                        const match2 = embedUrl.match(/\/file\/d\/([^/]+)/);
                        if (match2) {
                          embedUrl = `https://drive.google.com/file/d/${match2[1]}/preview`;
                        }
                      }
                    }
                  } else if (embedUrl.endsWith('.pdf')) {
                    // Direct PDF links can often be embedded directly
                  } else {
                    embedUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(embedUrl)}&embedded=true`;
                  }

                  return (
                    <DocumentPreviewRow key={i} doc={doc} embedUrl={embedUrl} />
                  );
                })}
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

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-t-orange-600"></div>
            <p className="text-orange-600 font-bold animate-pulse text-xs tracking-widest uppercase">Loading Works...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {works.map((work) => (
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
                <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                   <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter shadow-md">
                     {work.date || 'Record'}
                   </span>
                   {work.videos && work.videos.length > 0 && work.videos.some(v => v && v.trim() !== '') && (
                     <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1.5 shadow-md">
                       <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                       Live Video
                     </span>
                   )}
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
      )}
    </div>
  </div>
);
};

export default OurWorksPage;
