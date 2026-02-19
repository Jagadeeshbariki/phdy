
import React, { useState, useEffect } from 'react';

// Syncing with the URL from AdminPage.tsx
const SPREADSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzdE2YpqlLvSqx1IzsHx7A0JMl_2uTZUssxEalLc1IsUUDIdFqaz3IU5C373pJolhs21Q/exec';

const MembersList: React.FC = () => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllMembers = async () => {
      try {
        setLoading(true);
        
        // 1. Fetch static legacy members from local config
        const localRes = await fetch(`/AboutConfig.json?v=${Date.now()}`);
        if (!localRes.ok) throw new Error('Failed to load local members');
        const localData = await localRes.json();
        const config = Array.isArray(localData) ? localData[0] : localData;
        const legacyMembers = config?.members || [];

        // 2. Fetch new members from Google Spreadsheet with a timeout
        let spreadsheetMembers = [];
        if (SPREADSHEET_API_URL && !SPREADSHEET_API_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_URL')) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const spreadRes = await fetch(SPREADSHEET_API_URL, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            const spreadData = await spreadRes.json();
            spreadsheetMembers = Array.isArray(spreadData) ? spreadData : [];
          } catch (e) {
            console.warn("Spreadsheet API fetch failed or timed out, showing legacy data only.", e);
          }
        }

        // 3. Merge both sources and Deduplicate by Id.No
        // We use a Map where the Key is the ID to ensure uniqueness
        const uniqueMembersMap = new Map();
        
        // Add legacy members first
        legacyMembers.forEach((m: any) => {
          const id = m["Id.No"] || m["id"];
          if (id) uniqueMembersMap.set(String(id), m);
        });
        
        // Add/Overwrite with spreadsheet members (allows for updates via sheet)
        spreadsheetMembers.forEach((m: any) => {
          const id = m["Id.No"] || m["IdNo"] || m["id"];
          if (id) {
            // Standardize the object to use "Id.No" for the UI
            const standardizedMember = { ...m, "Id.No": String(id) };
            uniqueMembersMap.set(String(id), standardizedMember);
          }
        });
        
        // Sort members by ID number (converted to number for proper sequence)
        const sortedMembers = Array.from(uniqueMembersMap.values()).sort((a, b) => {
          const idA = parseInt(a["Id.No"]) || 999;
          const idB = parseInt(b["Id.No"]) || 999;
          return idA - idB;
        });
        
        setMembers(sortedMembers);
      } catch (err) {
        console.error("Error loading members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllMembers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-100 border-t-orange-600"></div>
        <p className="text-orange-600 font-bold animate-pulse text-xs tracking-widest uppercase">Syncing Team Data...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-8">
      {members.map((member, index) => (
        <div 
          key={member["Id.No"] || index} 
          className="group bg-white rounded-2xl sm:rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col transform hover:-translate-y-1 sm:hover:-translate-y-2"
        >
          {/* Member Image Header */}
          <div className="relative h-40 sm:h-80 overflow-hidden bg-gray-50 flex items-center justify-center p-2 sm:p-3">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-white opacity-40"></div>
            <img 
              src={member.ImageURL} 
              alt={member.Name} 
              className="relative z-10 max-w-full max-h-full object-contain rounded-xl sm:rounded-2xl transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://cdn-icons-png.flaticon.com/128/17798/17798443.png';
              }}
            />
          </div>

          {/* Member Info Body */}
          <div className="p-3 sm:p-6 flex-grow flex flex-col space-y-2 sm:space-y-4">
            <div>
              <p className="text-orange-600 text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mb-0.5 sm:mb-1">
                ID NO: {member["Id.No"]}
              </p>
              <h3 className="text-sm sm:text-xl font-bold text-gray-900 line-clamp-1">{member.Name}</h3>
            </div>

            <div className="flex justify-between items-center text-[10px] sm:text-sm border-t border-gray-50 pt-2 sm:pt-4">
              <div className="flex flex-col">
                <span className="text-gray-400 uppercase text-[8px] sm:text-[10px] font-bold tracking-tighter">Age</span>
                <span className="text-gray-900 font-bold">{member.Age}Y</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-gray-400 uppercase text-[8px] sm:text-[10px] font-bold tracking-tighter">Edu</span>
                <span className="text-gray-900 font-bold truncate max-w-[50px] sm:max-w-[120px]">{member.Qualification || 'Nill'}</span>
              </div>
            </div>

            <div className="flex-grow hidden sm:block">
              <span className="text-gray-400 uppercase text-[10px] font-bold block mb-2 tracking-tighter">Motivation</span>
              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100/50 min-h-[100px] flex items-start">
                <p className="text-gray-700 text-sm italic leading-relaxed line-clamp-4">
                  {member.Motivation ? `"${member.Motivation}"` : "Dedicated to the development and prosperity of Pedda Harivanam village."}
                </p>
              </div>
            </div>
            
            <div className="sm:hidden">
               <p className="text-gray-500 text-[10px] italic line-clamp-2">
                 {member.Motivation || "Working for PH village development."}
               </p>
            </div>
          </div>

          <div className="px-3 sm:px-6 py-2 sm:py-4 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
            <span className="text-[7px] sm:text-[10px] font-bold text-gray-400 tracking-widest uppercase">Team PHDY</span>
            <div className="flex space-x-1">
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-orange-500"></div>
              <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-orange-300"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MembersList;
