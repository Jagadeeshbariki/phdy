import React, { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, GeoJSON, useMap, LayersControl } from 'react-leaflet';

// Fix for default marker icons in Leaflet when using build tools
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Accurate geographic coordinates for Pedda Harivanam schools & buildings
const DEFAULT_CENTER: [number, number] = [15.6325, 77.1020]; 
const DEFAULT_POINT_DATA_LINK = 'https://drive.google.com/file/d/1FfBr0ImlgQ7n3fFUeL4T7awunubQOMi1/view?usp=sharing';
const DEFAULT_BOUNDARY_LINK = 'https://drive.google.com/file/d/1z9Skq818piocsKZ215_Bqs5iAOJaq-SE/view?usp=sharing';

// Custom Building Icon for Points from Google Drive
const createBuildingIcon = () => {
  return L.divIcon({
    html: `
      <div class="custom-building-marker">
        <div style="background-color: #ffffff; padding: 6px; border-radius: 10px; border: 2px solid #f97316; box-shadow: 0 4px 14px rgba(249, 115, 22, 0.45); display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
            <path d="M9 22v-4h6v4"/>
            <path d="M8 6h.01"/>
            <path d="M16 6h.01"/>
            <path d="M8 10h.01"/>
            <path d="M16 10h.01"/>
            <path d="M8 14h.01"/>
            <path d="M16 14h.01"/>
            <path d="M8 18h.01"/>
            <path d="M16 18h.01"/>
          </svg>
        </div>
      </div>
    `,
    className: 'building-icon-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18]
  });
};

const BuildingIcon = createBuildingIcon();

const FitBounds: React.FC<{ pointData: any; boundaryData: any }> = ({ pointData, boundaryData }) => {
  const map = useMap();
  useEffect(() => {
    // Prioritize fitting to the point data so schools are immediately in focus
    const targetData = (pointData && pointData.features && pointData.features.length > 0) 
      ? pointData 
      : boundaryData;

    if (targetData && targetData.features && targetData.features.length > 0) {
      try {
        const layer = L.geoJSON(targetData);
        const bounds = layer.getBounds();
        
        if (bounds.isValid()) {
          const northEast = bounds.getNorthEast();
          const southWest = bounds.getSouthWest();
          
          if (
            Math.abs(northEast.lat) <= 90 && Math.abs(northEast.lng) <= 180 &&
            Math.abs(southWest.lat) <= 90 && Math.abs(southWest.lng) <= 180
          ) {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
          }
        }
      } catch (err) {
        console.error("Error fitting bounds:", err);
      }
    }
  }, [map, pointData, boundaryData]);
  return null;
};

const MapController: React.FC<{ selectedPoint: [number, number] | null }> = ({ selectedPoint }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedPoint) {
      map.flyTo(selectedPoint, 17, { duration: 1.2 });
    }
  }, [map, selectedPoint]);
  return null;
};

const MapResizer: React.FC<{ isFullscreen: boolean }> = ({ isFullscreen }) => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 150);
  }, [map, isFullscreen]);
  return null;
};

const VillageMapPage: React.FC = () => {
  const [pointData, setPointData] = useState<any>(null);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pointUrl, setPointUrl] = useState(DEFAULT_POINT_DATA_LINK);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Point Data from Google Drive
  const fetchPointData = async (url: string) => {
    try {
      const proxyEndpoint = `/api/proxy-geojson?url=${encodeURIComponent(url)}&t=${Date.now()}`;
      const response = await fetch(proxyEndpoint);
      if (!response.ok) {
        throw new Error(`Failed to load points (${response.status})`);
      }
      const data = await response.json();
      setPointData(data);
    } catch (err: any) {
      console.error('Error loading point data:', err);
      setError(`Point Data Error: ${err.message}`);
    }
  };

  // Fetch Boundary Data from Google Drive
  const fetchBoundaryData = async (url: string) => {
    try {
      const proxyEndpoint = `/api/proxy-geojson?url=${encodeURIComponent(url)}&t=${Date.now()}`;
      const response = await fetch(proxyEndpoint);
      if (response.ok) {
        const data = await response.json();
        setBoundaryData(data);
      }
    } catch (err: any) {
      console.error('Error loading boundary data:', err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.allSettled([
        fetchPointData(pointUrl),
        fetchBoundaryData(DEFAULT_BOUNDARY_LINK)
      ]);
      setLoading(false);
    };

    loadAll();
  }, [pointUrl]);

  const handleCustomUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pointUrl.trim()) {
      setShowUrlModal(false);
      setLoading(true);
      fetchPointData(pointUrl.trim()).finally(() => setLoading(false));
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          setPointData(parsed);
          setShowUrlModal(false);
          setError(null);
        } catch (err: any) {
          setError(`Invalid JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Extract point features strictly from the Google Drive point data
  const pointFeatures = pointData?.features?.filter((f: any) => f.geometry?.type === 'Point' || f.geometry?.type === 'MultiPoint') || [];
  const boundaryFeatures = boundaryData?.features?.filter((f: any) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon') || [];

  return (
    <div className={`container mx-auto px-4 py-8 ${isFullscreen ? 'fixed inset-0 z-[9999] bg-white !p-0 !max-w-none' : ''}`}>
      <div className={`max-w-6xl mx-auto bg-white shadow-2xl overflow-hidden border border-gray-100 flex flex-col ${isFullscreen ? '!max-w-none h-screen rounded-none' : 'rounded-[40px]'}`}>
        
        {/* Header - Hidden in Fullscreen to maximize map space */}
        {!isFullscreen && (
          <div className="bg-gradient-to-r from-orange-600 to-amber-600 px-8 py-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tight leading-none">Pedda Harivanam</h1>
                <p className="text-orange-100 text-xs font-bold uppercase tracking-widest mt-1 opacity-90">
                  Google Drive Point Landmarks & Boundary Map
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/20">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-[11px] font-black uppercase tracking-wider text-white">
                  {pointFeatures.length} Points from Google Drive
                </span>
              </div>
              <button
                onClick={() => setShowUrlModal(true)}
                className="bg-white text-orange-600 hover:bg-orange-50 font-bold px-4 py-2 rounded-2xl text-xs uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                title="Change or reload Point Data source"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Data Source
              </button>
            </div>
          </div>
        )}

        {/* Map Container Area */}
        <div className={`relative w-full bg-slate-100 z-0 ${isFullscreen ? 'flex-grow' : 'h-[72vh]'}`}>
          
          {/* Fullscreen Toggle Button */}
          <button 
            onClick={toggleFullscreen}
            className={`absolute bottom-6 left-6 z-[1001] bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-gray-200 shadow-xl hover:bg-white hover:border-orange-300 transition-all group pointer-events-auto cursor-pointer ${isFullscreen ? '!bottom-6' : ''}`}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-3xl shadow-2xl border border-orange-100 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-orange-600 font-bold uppercase tracking-wider text-xs">Loading Points from Google Drive...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-red-600 text-white px-5 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-3">
              <span>{error}</span>
              <button 
                onClick={() => setError(null)} 
                className="bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-lg text-[10px] uppercase font-black cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <MapContainer 
            center={DEFAULT_CENTER} 
            zoom={15} 
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ background: '#f8fafc' }}
          >
            <MapResizer isFullscreen={isFullscreen} />
            <MapController selectedPoint={selectedPoint} />
            
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satellite View">
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
              
              <LayersControl.BaseLayer name="Street / Terrain View">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>

              {/* Labels Overlay */}
              <LayersControl.Overlay checked name="Labels & Roads Overlay">
                <TileLayer
                  attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                  url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.Overlay>

              {/* 1. Point Data Layer: Shows ONLY points from the Google Drive point data link */}
              <LayersControl.Overlay checked name="Point Landmarks (Google Drive)">
                {pointData && pointFeatures.length > 0 ? (
                  <GeoJSON 
                    key={`point-layer-${pointFeatures.length}-${JSON.stringify(pointFeatures.map((f: any) => f.geometry?.coordinates))}`}
                    data={pointData} 
                    pointToLayer={(_feature, latlng) => {
                      return L.marker(latlng, { 
                        icon: BuildingIcon,
                        riseOnHover: true
                      });
                    }}
                    onEachFeature={(feature, layer) => {
                      const name = feature.properties?.Name || 
                                   feature.properties?.name || 
                                   feature.properties?.title || 
                                   'Village Point';

                      const id = feature.properties?.id;

                      // Tooltip on Hover shows the name of the point
                      layer.bindTooltip(`
                        <div style="font-weight: 800; font-size: 13px; color: #ea580c; display: flex; align-items: center; gap: 6px;">
                          <span>🏫</span>
                          <span>${name}</span>
                        </div>
                      `, {
                        direction: 'top',
                        offset: [0, -16],
                        opacity: 0.95,
                        className: 'custom-map-tooltip'
                      });

                      // Popup on Click
                      const coords = feature.geometry?.coordinates;
                      const lat = coords ? coords[1].toFixed(5) : '';
                      const lng = coords ? coords[0].toFixed(5) : '';

                      layer.bindPopup(`
                        <div style="min-width: 210px; padding: 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          <div style="display: inline-block; background-color: #ffedd5; color: #ea580c; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em;">
                            ${id ? `Landmark #${id}` : 'Village Point'}
                          </div>
                          <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #1e293b; line-height: 1.25;">
                            ${name}
                          </h3>
                          <div style="font-size: 11px; color: #64748b; font-weight: 600; line-height: 1.5;">
                            <p style="margin: 0;">📍 Pedda Harivanam, Kurnool, AP</p>
                            ${lat && lng ? `<p style="margin: 3px 0 0 0; color: #94a3b8; font-size: 10px;">GPS: ${lat}° N, ${lng}° E</p>` : ''}
                          </div>
                        </div>
                      `);
                    }}
                  />
                ) : (
                  <div />
                )}
              </LayersControl.Overlay>

              {/* 2. Boundary Layer: Official boundary from Google Drive */}
              {boundaryData && boundaryFeatures.length > 0 && (
                <LayersControl.Overlay checked name="Village Boundary (Google Drive)">
                  <GeoJSON 
                    key={`boundary-layer-${boundaryFeatures.length}`}
                    data={boundaryData} 
                    style={() => ({
                      fillColor: '#f97316',
                      fillOpacity: 0.05,
                      weight: 3.5,
                      opacity: 0.95,
                      color: '#f97316',
                      dashArray: '5, 5'
                    })}
                    onEachFeature={(feature, layer) => {
                      const village = feature.properties?.village || feature.properties?.['gram_panchayat_name\n']?.trim() || 'Pedda Harivanam';
                      layer.bindTooltip(`
                        <div style="font-weight: 700; color: #c2410c;">
                          📌 ${village} (Boundary Limit)
                        </div>
                      `, {
                        sticky: true,
                        className: 'custom-map-tooltip'
                      });
                    }}
                  />
                </LayersControl.Overlay>
              )}
            </LayersControl>
            
            <FitBounds pointData={pointData} boundaryData={boundaryData} />
          </MapContainer>

          {/* Map Controls / Legend */}
          <div className="absolute top-6 left-6 z-[1001] space-y-3 pointer-events-none">
             {/* Legend */}
             <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-orange-100 shadow-xl max-w-[220px] pointer-events-auto">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Map Legend</h4>
                   <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                     Drive Data
                   </span>
                </div>
                <div className="space-y-2.5">
                   <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-6 h-6 bg-white border-2 border-orange-500 rounded-lg shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect width="16" height="20" x="4" y="2" rx="2" ry="2"/>
                          <path d="M9 22v-4h6v4"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold text-gray-800 leading-tight">School / Building</p>
                        <p className="text-[9px] text-gray-400 font-semibold">Hover or click for name</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-2.5">
                      <div className="w-6 h-3 rounded border-2 border-dashed border-orange-500 bg-orange-100"></div>
                      <div>
                        <p className="text-[11px] font-extrabold text-gray-800 leading-tight">Village Boundary</p>
                        <p className="text-[9px] text-gray-400 font-semibold">Survey of India limits</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Directory for Points Loaded Directly from Google Drive */}
        <div className="p-6 md:p-8 bg-gradient-to-b from-gray-50 to-white border-t border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🏫</span>
                <h3 className="text-base font-black uppercase tracking-tight text-gray-900">
                  Pedda Harivanam Landmarks ({pointFeatures.length})
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Displaying only points from your Google Drive point file. Click any building card below to fly directly to it.
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block">Coordinate System</span>
              <span className="text-xs font-black text-orange-600">WGS84 (OGC:CRS84)</span>
            </div>
          </div>

          {pointFeatures.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
              <p className="text-sm font-bold text-gray-600">No point features loaded yet.</p>
              <p className="text-xs text-gray-400 mt-1">Click "Data Source" above to reload your Google Drive point link.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pointFeatures.map((pt: any, idx: number) => {
                const name = pt.properties?.Name || pt.properties?.name || `Landmark ${idx + 1}`;
                const id = pt.properties?.id;
                const coords = pt.geometry?.coordinates;
                const lat = coords ? coords[1] : DEFAULT_CENTER[0];
                const lng = coords ? coords[0] : DEFAULT_CENTER[1];

                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPoint([lat, lng])}
                    className="group bg-white p-4 rounded-2xl border border-gray-200 hover:border-orange-400 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 group-hover:bg-orange-500 transition-colors flex items-center justify-center text-orange-600 group-hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <rect width="16" height="20" x="4" y="2" rx="2" ry="2" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 22v-4h6v4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">
                          {name}
                        </h4>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                          {id ? `ID #${id} • ` : ''}{lat.toFixed(4)}°, {lng.toFixed(4)}°
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Fly to &rarr;
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Data Source Modal */}
        {showUrlModal && (
          <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-gray-900">Google Drive Point Data Source</h3>
                <button 
                  onClick={() => setShowUrlModal(false)}
                  className="text-gray-400 hover:text-gray-600 font-bold text-xl cursor-pointer"
                >
                  &times;
                </button>
              </div>

              <p className="text-xs text-gray-600 mb-4">
                Enter your Google Drive point data sharing link or upload a local GeoJSON file. Points are plotted directly using building icons with interactive hover tooltips.
              </p>

              <form onSubmit={handleCustomUrlSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Google Drive Point Data Link
                  </label>
                  <input 
                    type="url"
                    value={pointUrl}
                    onChange={(e) => setPointUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none text-xs text-gray-800"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".geojson,.json"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      📁 Upload .geojson file
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUrlModal(false)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-800 px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="text-xs font-black text-white bg-orange-600 hover:bg-orange-700 px-5 py-2 rounded-xl shadow-md transition-colors cursor-pointer"
                    >
                      Load Points
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default VillageMapPage;
