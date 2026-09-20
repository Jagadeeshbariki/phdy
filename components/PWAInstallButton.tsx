import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  isMobileNav?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ className = '', isMobileNav = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed and running as standalone app, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow with beforeinstallprompt
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={
          className ||
          (isMobileNav
            ? 'w-full flex items-center justify-center space-x-2 px-6 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-200 transition-all'
            : 'flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-md shadow-orange-200 transition-all')
        }
        title="Install PHDY App"
      >
        <Download className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={
            className ||
            (isMobileNav
              ? 'w-full flex items-center justify-center space-x-2 px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-2xl font-black text-xs uppercase tracking-widest transition-all'
              : 'flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all')
          }
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-4 h-4" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-orange-600" />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Install on iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-3 bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">1</span>
                  <p className="leading-snug">Tap the <strong className="text-gray-900">Share</strong> button in Safari's bottom toolbar.</p>
                </div>
                <div className="flex items-start space-x-3 bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  <p className="leading-snug">Scroll down and tap <strong className="text-gray-900">Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start space-x-3 bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-600 text-white text-xs font-bold flex items-center justify-center">3</span>
                  <p className="leading-snug">Tap <strong className="text-gray-900">Add</strong> at top right to launch PHDY directly as an app!</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-orange-600 py-3 text-xs font-black uppercase tracking-widest text-white hover:bg-orange-700 shadow-md shadow-orange-200 transition-all"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
