
import React, { useState, useEffect, useMemo } from 'react';
import { ACCOUNT_DATA, YearData, Transaction } from '../AccountData';

const SPREADSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzdE2YpqlLvSqx1IzsHx7A0JMl_2uTZUssxEalLc1IsUUDIdFqaz3IU5C373pJolhs21Q/exec';

const FINANCIAL_MONTH_ORDER = [
  "April", "May", "June", "July", "August", "September", 
  "October", "November", "December", "January", "February", "March"
];

const AccordionItem: React.FC<{ 
  title: string; 
  children: React.ReactNode; 
  defaultOpen?: boolean;
  depth?: number;
}> = ({ title, children, defaultOpen = false, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`border rounded-lg mb-2 overflow-hidden ${depth === 0 ? 'border-orange-200 shadow-sm' : 'border-gray-100'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex justify-between items-center px-4 py-3 text-left transition-all ${
          depth === 0 
            ? 'bg-orange-600 text-white font-black uppercase tracking-widest hover:bg-orange-700' 
            : 'bg-white text-gray-800 font-bold hover:bg-gray-50'
        }`}
      >
        <span className={depth === 0 ? 'text-xs sm:text-sm' : 'text-[11px] sm:text-xs'}>{title}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className={`p-4 ${depth === 0 ? 'bg-orange-50/30' : 'bg-white'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

const AccountingPage: React.FC = () => {
  const [dynamicRecords, setDynamicRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDynamicAccounting = async () => {
      try {
        const res = await fetch(`${SPREADSHEET_API_URL}?type=accounting`);
        const data = await res.json();
        setDynamicRecords(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load dynamic accounting:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDynamicAccounting();
  }, []);

  // Calculate current month and financial year for "Recent" filtering
  const currentStatus = useMemo(() => {
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = monthNames[now.getMonth()];
    
    // Financial year logic (April start)
    const year = now.getFullYear();
    const finYear = now.getMonth() >= 3 
      ? `${year}-${(year + 1).toString().slice(-2)}` 
      : `${year - 1}-${year.toString().slice(-2)}`;
    
    return { month, finYear };
  }, []);

  // Merge static ACCOUNT_DATA with dynamic records from spreadsheet
  const mergedData = useMemo(() => {
    const data: YearData[] = JSON.parse(JSON.stringify(ACCOUNT_DATA));

    dynamicRecords.forEach(record => {
      const { FinancialYear, Month, Type, Description, BillLink } = record;
      
      let yearObj = data.find(y => y.year === FinancialYear);
      if (!yearObj) {
        yearObj = { year: FinancialYear, Months: [] };
        data.push(yearObj);
      }

      let monthObj = yearObj.Months.find(m => m.month.toLowerCase() === Month.toLowerCase());
      if (!monthObj) {
        monthObj = { 
          month: Month, 
          details: { Income: [], Expenditure: [] } 
        };
        yearObj.Months.push(monthObj);
      }

      const newTransaction: Transaction = {
        description: Description,
        pdfUrl: BillLink
      };

      if (Type === 'Income') {
        monthObj.details.Income.push(newTransaction);
      } else {
        monthObj.details.Expenditure.push(newTransaction);
      }
    });

    // Sort months within each year according to the financial year (April to March)
    data.forEach(yearObj => {
      yearObj.Months.sort((a, b) => {
        const indexA = FINANCIAL_MONTH_ORDER.findIndex(m => m.toLowerCase() === a.month.toLowerCase());
        const indexB = FINANCIAL_MONTH_ORDER.findIndex(m => m.toLowerCase() === b.month.toLowerCase());
        return indexA - indexB;
      });
    });

    // Sort years descending
    return data.sort((a, b) => b.year.localeCompare(a.year));
  }, [dynamicRecords]);

  // Filter for transactions strictly in the current calendar month
  const recentTransactions = useMemo(() => {
    return dynamicRecords.filter(rec => 
      rec.Month.toLowerCase() === currentStatus.month.toLowerCase() && 
      rec.FinancialYear === currentStatus.finYear
    );
  }, [dynamicRecords, currentStatus]);

  return (
    <div className="animate-fadeIn py-16 px-4 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 mb-6 uppercase tracking-widest font-poppins">
            Village <span className="text-orange-600">Financials</span>
          </h1>
          <div className="w-32 h-2 bg-orange-600 mx-auto rounded-full mb-8"></div>
          <p className="text-xl text-gray-500 font-bold max-w-2xl mx-auto uppercase tracking-tighter">
            Real-time Transparency & Accountability
          </p>
        </div>

        {/* Recent Transactions Section (Only Current Month) */}
        {!loading && recentTransactions.length > 0 && (
          <div className="mb-16 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest flex items-center">
                <span className="relative flex h-3 w-3 mr-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-600"></span>
                </span>
                Recent Activity ({currentStatus.month})
              </h2>
              <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest">
                New This Month
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentTransactions.map((rec, idx) => (
                <div key={idx} className={`bg-white p-6 rounded-[32px] border-l-8 shadow-xl hover:shadow-2xl transition-all border-orange-50 ${rec.Type === 'Income' ? 'border-l-green-500' : 'border-l-red-500'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{rec.Month} {rec.FinancialYear}</span>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${rec.Type === 'Income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {rec.Type}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mb-6 leading-relaxed">
                    {rec.Description}
                  </h4>
                  <a 
                    href={rec.BillLink} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center w-full py-3 bg-gray-50 hover:bg-orange-600 hover:text-white rounded-2xl text-orange-600 font-bold text-[10px] uppercase tracking-widest transition-all group"
                  >
                    View Official Bill
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Unified Monthly Records */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-widest">Transaction Records</h2>
            {loading && (
              <div className="flex items-center space-x-2 text-orange-600">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-200 border-t-orange-600"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Syncing...</span>
              </div>
            )}
          </div>
          
          {mergedData.map((year) => (
            <AccordionItem key={year.year} title={`Financial Year: ${year.year}`} defaultOpen={false}>
              <div className="space-y-4">
                {year.Months.map((month) => (
                  <AccordionItem key={month.month} title={month.month} depth={1} defaultOpen={false}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                      {/* Income Section */}
                      <div>
                        <h5 className="flex items-center text-green-700 font-black mb-4 uppercase text-[10px] tracking-widest">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                          Income
                        </h5>
                        {month.details.Income.length > 0 ? (
                          <div className="space-y-3">
                            {month.details.Income.map((inc, iIdx) => (
                              <a 
                                key={iIdx} 
                                href={inc.pdfUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="group block p-4 bg-green-50/30 rounded-2xl border border-green-100 hover:bg-green-100/50 transition-all shadow-sm flex items-center justify-between"
                              >
                                <span className="text-xs font-bold text-green-900 group-hover:text-green-700 leading-relaxed">{inc.description}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                            <p className="text-gray-300 italic text-[10px] uppercase font-black">No Income for this month</p>
                          </div>
                        )}
                      </div>

                      {/* Expenditure Section */}
                      <div>
                        <h5 className="flex items-center text-red-700 font-black mb-4 uppercase text-[10px] tracking-widest">
                          <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                          Expenditure
                        </h5>
                        {month.details.Expenditure.length > 0 ? (
                          <div className="space-y-3">
                            {month.details.Expenditure.map((exp, eIdx) => (
                              <a 
                                key={eIdx} 
                                href={exp.pdfUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="group block p-4 bg-red-50/30 rounded-2xl border border-red-100 hover:bg-red-100/50 transition-all shadow-sm flex items-center justify-between"
                              >
                                <span className="text-xs font-bold text-red-900 group-hover:text-red-700 leading-relaxed">{exp.description}</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-gray-200 rounded-2xl flex items-center justify-center">
                            <p className="text-gray-300 italic text-[10px] uppercase font-black">No Expenses for this month</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </AccordionItem>
                ))}
              </div>
            </AccordionItem>
          ))}
        </div>

        {/* Footer Info */}
        <div className="max-w-4xl mx-auto mt-16 p-8 bg-gray-900 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600 rounded-full -mr-16 -mt-16 blur-3xl opacity-20"></div>
          <h3 className="text-xl font-black uppercase tracking-widest mb-4">Financial Accountability Notice</h3>
          <p className="text-gray-400 text-sm leading-relaxed font-medium">
            All data displayed here is sourced from official e-GramSwaraj portals and verified by the PHDY volunteer team. We strive for 100% accuracy in financial reporting to ensure our village resources are utilized effectively for the benefit of all residents.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">e-GramSwaraj Certified</div>
            <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">Audit Ready</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountingPage;
