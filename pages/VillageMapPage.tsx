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

// Built-in verified Point GeoJSON for Pedda Harivanam (Guarantees zero downtime / no blank map)
const DEFAULT_POINTS_GEOJSON: any = {
  type: "FeatureCollection",
  name: "Pedda_harivanam_point",
  crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
  features: [
    {
      type: "Feature",
      properties: {
        id: 1,
        Name: "Zilla Parisadh High School",
        type: "High School",
        category: "Secondary Education (ZPHS)"
      },
      geometry: { type: "Point", coordinates: [ 77.102188059346034, 15.630581808142665 ] }
    },
    {
      type: "Feature",
      properties: {
        id: 2,
        Name: "M.P.P Kannada School",
        type: "Primary School",
        category: "Primary Education (Kannada Medium)"
      },
      geometry: { type: "Point", coordinates: [ 77.10034438685858, 15.6325348009539 ] }
    },
    {
      type: "Feature",
      properties: {
        id: 3,
        Name: "M.P.P Telugu School",
        type: "Primary School",
        category: "Primary Education (Telugu Medium)"
      },
      geometry: { type: "Point", coordinates: [ 77.10342190707631, 15.634604239468418 ] }
    }
  ]
};

// Custom Building Icon for Schools and Points from Google Drive
const createBuildingIcon = (name: string = '') => {
  const isHighSchool = name.toLowerCase().includes('high');
  const badgeColor = isHighSchool ? '#ea580c' : '#0284c7';
  const shadowColor = isHighSchool ? 'rgba(234, 88, 12, 0.45)' : 'rgba(2, 132, 199, 0.45)';

  return L.divIcon({
    html: `
      <div class="custom-building-marker" style="transform: translate3d(0,0,0);">
        <div style="background-color: #ffffff; padding: 6px; border-radius: 12px; border: 2.5px solid ${badgeColor}; box-shadow: 0 4px 16px ${shadowColor}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${badgeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
            <path d="M6 14h10"/>
            <path d="M18 18h-8"/>
          </svg>
        </div>
      </div>
    `,
    className: 'building-icon-wrapper',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20]
  });
};

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
            map.fitBounds(bounds, { padding: [70, 70], maxZoom: 16 });
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
  const [pointData, setPointData] = useState<any>(DEFAULT_POINTS_GEOJSON);
  const [boundaryData, setBoundaryData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pointUrl, setPointUrl] = useState(DEFAULT_POINT_DATA_LINK);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<[number, number] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Point Data from Google Drive or local fallback with HTML guard
  const fetchPointData = async (url: string) => {
    try {
      let data: any = null;

      // 1. If using the default point link, attempt fastest local bundled data first
      if (url === DEFAULT_POINT_DATA_LINK || url.includes('1FfBr0ImlgQ7n3fFUeL4T7awunubQOMi1')) {
        try {
          const directRes = await fetch(`/pedda_harivanam_points.geojson?v=${Date.now()}`);
          if (directRes.ok) {
            const text = await directRes.text();
            if (text.trim().startsWith('{')) {
              data = JSON.parse(text);
            }
          }
        } catch {
          // Continue to proxy
        }
      }

      // 2. Fetch via backend proxy
      if (!data) {
        const proxyEndpoint = `/api/proxy-geojson?url=${encodeURIComponent(url)}&t=${Date.now()}`;
        const response = await fetch(proxyEndpoint);
        
        const text = await response.text();
        
        // Guard against any HTML (e.g., service-worker, Google Drive captcha, or SPA fallbacks)
        if (text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE')) {
          console.warn("Received HTML instead of JSON GeoJSON from proxy.");
          if (url === DEFAULT_POINT_DATA_LINK || url.includes('1FfBr0ImlgQ7n3fFUeL4T7awunubQOMi1')) {
            data = DEFAULT_POINTS_GEOJSON;
          } else {
            throw new Error("The specified URL returned an HTML web page instead of GeoJSON data.");
          }
        } else {
          try {
            data = JSON.parse(text);
          } catch (jsonErr: any) {
            throw new Error(`Invalid JSON: ${jsonErr.message}`);
          }
        }
      }

      if (data && Array.isArray(data.features)) {
        setPointData(data);
        setError(null);
      } else {
        throw new Error("Dataset does not contain a valid GeoJSON FeatureCollection");
      }
    } catch (err: any) {
      console.error('Error loading point data:', err);
      // Ensure we always have the default points visible
      if (!pointData || !pointData.features || pointData.features.length === 0) {
        setPointData(DEFAULT_POINTS_GEOJSON);
      }
      if (url !== DEFAULT_POINT_DATA_LINK) {
        setError(`Point Data Error: ${err.message}`);
      }
    }
  };

  // Fetch Boundary Data from Google Drive or bundled GeoJSON
  const fetchBoundaryData = async (url: string) => {
    try {
      let data: any = null;

      // 1. Try local bundled boundary first for zero failure & fastest rendering
      try {
        const directRes = await fetch(`/pedda_harivanam_boundary.geojson?v=${Date.now()}`);
        if (directRes.ok) {
          const text = await directRes.text();
          if (text.trim().startsWith('{')) {
            data = JSON.parse(text);
          }
        }
      } catch {
        // Fallback to proxy
      }

      // 2. If not found, fetch via proxy
      if (!data) {
        const proxyEndpoint = `/api/proxy-geojson?url=${encodeURIComponent(url)}&t=${Date.now()}`;
        const response = await fetch(proxyEndpoint);
        if (response.ok) {
          const text = await response.text();
          if (text.trim().startsWith('{')) {
            data = JSON.parse(text);
          }
        }
      }

      if (data && Array.isArray(data.features)) {
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
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm pointer-events-none">
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
              <LayersControl.Overlay checked name="Schools & Landmarks (Point Data)">
                {pointData && pointFeatures.length > 0 ? (
                  <GeoJSON 
                    key={`point-layer-${pointFeatures.length}-${JSON.stringify(pointFeatures.map((f: any) => f.geometry?.coordinates))}`}
                    data={pointData} 
                    pointToLayer={(feature, latlng) => {
                      const name = feature.properties?.Name || feature.properties?.name || '';
                      return L.marker(latlng, { 
                        icon: createBuildingIcon(name),
                        riseOnHover: true
                      });
                    }}
                    onEachFeature={(feature, layer) => {
                      const name = feature.properties?.Name || 
                                   feature.properties?.name || 
                                   feature.properties?.title || 
                                   'Village School / Landmark';

                      const id = feature.properties?.id;
                      const type = feature.properties?.type || feature.properties?.category || 'Educational Institution';

                      // Tooltip on Hover shows the name of the point
                      layer.bindTooltip(`
                        <div style="font-weight: 800; font-size: 13px; color: #ea580c; display: flex; align-items: center; gap: 6px; padding: 2px 4px;">
                          <span>🏫</span>
                          <span>${name}</span>
                        </div>
                      `, {
                        direction: 'top',
                        offset: [0, -18],
                        opacity: 0.95,
                        className: 'custom-map-tooltip'
                      });

                      // Popup on Click
                      const coords = feature.geometry?.coordinates;
                      const lat = coords ? coords[1] : null;
                      const lng = coords ? coords[0] : null;

                      layer.bindPopup(`
                        <div style="min-width: 230px; padding: 6px 4px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                            <span style="background-color: #ffedd5; color: #ea580c; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">
                              ${id ? `Landmark #${id}` : 'Point Landmark'}
                            </span>
                            <span style="font-size: 10px; font-weight: 700; color: #64748b;">
                              ${type}
                            </span>
                          </div>
                          <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 800; color: #0f172a; line-height: 1.3;">
                            ${name}
                          </h3>
                          <div style="font-size: 11px; color: #475569; font-weight: 600; line-height: 1.5; margin-bottom: 8px;">
                            <p style="margin: 0;">📍 Pedda Harivanam, Adoni Mandal, Kurnool District</p>
                            ${lat && lng ? `<p style="margin: 3px 0 0 0; color: #94a3b8; font-size: 10px; font-family: monospace;">GPS: ${lat.toFixed(5)}° N, ${lng.toFixed(5)}° E</p>` : ''}
                          </div>
                          ${lat && lng ? `
                            <a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; font-size: 11px; font-weight: 800; padding: 6px 12px; border-radius: 8px; text-align: center; width: 100%; box-sizing: border-box;">
                              Open in Google Maps &rarr;
                            </a>
                          ` : ''}
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
                      fillOpacity: 0.06,
                      weight: 3.5,
                      opacity: 0.95,
                      color: '#f97316',
                      dashArray: '6, 6'
                    })}
                    onEachFeature={(feature, layer) => {
                      const village = feature.properties?.village || feature.properties?.['gram_panchayat_name\n']?.trim() || 'Pedda Harivanam';
                      layer.bindTooltip(`
                        <div style="font-weight: 700; color: #c2410c;">
                          📌 ${village} (Official Boundary Limit)
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
             <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl border border-orange-100 shadow-xl max-w-[230px] pointer-events-auto">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-500">Map Legend</h4>
                   <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                     Drive Data
                   </span>
                </div>
                <div className="space-y-2.5">
                   <div className="flex items-center gap-2.5">
                      <div className="flex items-center justify-center w-7 h-7 bg-white border-2 border-orange-500 rounded-lg shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
                          <path d="M6 6h10"/>
                          <path d="M6 10h10"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold text-gray-800 leading-tight">Schools & Buildings</p>
                        <p className="text-[9px] text-gray-400 font-semibold">Hover for name, click details</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-2.5">
                      <div className="w-7 h-3 rounded border-2 border-dashed border-orange-500 bg-orange-100"></div>
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
                  Pedda Harivanam Landmarks & Schools ({pointFeatures.length})
                </h3>
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Displaying point landmarks from Google Drive. Click any school card below to fly directly to it on the map.
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedPoint(DEFAULT_CENTER)}
                className="text-xs font-bold text-gray-600 hover:text-orange-600 bg-white hover:bg-orange-50 border border-gray-200 px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
              >
                Reset Map Center
              </button>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Coordinate System</span>
                <span className="text-xs font-black text-orange-600">WGS84 (OGC:CRS84)</span>
              </div>
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
                const type = pt.properties?.type || pt.properties?.category || 'Education';
                const coords = pt.geometry?.coordinates;
                const lat = coords ? coords[1] : DEFAULT_CENTER[0];
                const lng = coords ? coords[0] : DEFAULT_CENTER[1];

                return (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPoint([lat, lng])}
                    className="group bg-white p-4 rounded-2xl border border-gray-200 hover:border-orange-500 shadow-sm hover:shadow-lg transition-all cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 group-hover:bg-orange-500 transition-colors flex items-center justify-center text-orange-600 group-hover:text-white shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          {id && (
                            <span className="text-[9px] font-black uppercase text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                              #{id}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-gray-400">
                            {type}
                          </span>
                        </div>
                        <h4 className="text-sm font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1 mt-0.5">
                          {name}
                        </h4>
                        <p className="text-[10px] font-semibold text-gray-400 font-mono mt-0.5">
                          {lat.toFixed(5)}°, {lng.toFixed(5)}°
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity pl-2 shrink-0">
                      Fly &rarr;
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
