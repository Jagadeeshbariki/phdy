export const FINANCIAL_MONTH_ORDER = [
  "April", "May", "June", "July", "August", "September", 
  "October", "November", "December", "January", "February", "March"
];

export interface CleanAccountingRecord {
  FinancialYear: string;
  Month: string;
  Type: 'Income' | 'Expenditure' | 'No Income' | 'No Expenditure';
  Description: string;
  BillLink: string;
}

/**
 * Normalizes variations of financial year representations into standard "YYYY-YY" (e.g., "2026-27").
 */
export function normalizeFinancialYear(raw: string): string {
  if (!raw) return '';
  const cleaned = String(raw).trim();

  // Match e.g. "2026-2027", "2026-27", "2026 - 27", "FY 2026-27", "FY26-27"
  const mLong = cleaned.match(/20(\d{2})\s*[-/]\s*20?(\d{2})/i);
  if (mLong) {
    return `20${mLong[1]}-${mLong[2]}`;
  }

  // Match standalone 4-digit year like "2026"
  const mSingle = cleaned.match(/^20(\d{2})$/);
  if (mSingle) {
    const y = parseInt(mSingle[1], 10);
    return `20${y}-${(y + 1).toString().padStart(2, '0')}`;
  }

  return cleaned;
}

/**
 * Normalizes month name to standard title case (e.g., "April").
 */
export function normalizeMonth(raw: string, rawDate?: string): string {
  let month = String(raw || '').trim();

  if (!month && rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
      ];
      month = monthNames[d.getMonth()];
    }
  }

  if (month) {
    const lower = month.toLowerCase();
    const found = FINANCIAL_MONTH_ORDER.find(m => m.toLowerCase() === lower);
    if (found) return found;

    // Check 3-letter abbreviations (e.g., "Apr" -> "April")
    const shortFound = FINANCIAL_MONTH_ORDER.find(m => m.toLowerCase().startsWith(lower.slice(0, 3)));
    if (shortFound) return shortFound;
  }

  return month;
}

/**
 * Normalizes record types into 'Income' | 'Expenditure' | 'No Income' | 'No Expenditure'.
 */
export function normalizeType(raw: string): 'Income' | 'Expenditure' | 'No Income' | 'No Expenditure' {
  const lower = String(raw || '').trim().toLowerCase();

  if (lower.includes('no inc') || lower.includes('no-inc') || lower.includes('noincome')) {
    return 'No Income';
  }
  if (lower.includes('no exp') || lower.includes('no-exp') || lower.includes('noexpenditure')) {
    return 'No Expenditure';
  }
  if (lower.includes('income') || lower.includes('credit') || lower.includes('receipt') || lower.includes('inward')) {
    return 'Income';
  }
  return 'Expenditure';
}

/**
 * Validates and converts a raw spreadsheet row into a structured CleanAccountingRecord.
 * Filters out Member list objects and junk rows.
 */
export function normalizeAccountingRecord(record: any, defaultYear?: string): CleanAccountingRecord | null {
  if (!record || typeof record !== 'object') return null;

  // Reject Member objects from Google Apps Script default sheet
  const hasMemberKeys = ('Qualification' in record || 'Motivation' in record || 'ImageURL' in record || 'Id.No' in record);
  const hasAccountingKeys = (
    'FinancialYear' in record || 'financialYear' in record || 'Financial Year' in record ||
    'financial_year' in record || 'Fin Year' in record || 'Year' in record || 'FY' in record ||
    'BillLink' in record || 'billLink' in record || 'Bill Link' in record || 'PDF Link' in record
  );

  if (hasMemberKeys && !hasAccountingKeys) {
    return null;
  }

  // 1. Extract Financial Year
  const rawYear = record.FinancialYear || record.financialYear ||
    record['Financial Year'] || record['financial_year'] ||
    record['Fin Year'] || record['FinYear'] ||
    record.Year || record.year ||
    record.FY || record.fy ||
    record.finYear || defaultYear || '';

  const finYear = normalizeFinancialYear(String(rawYear));

  // 2. Extract Month
  const rawMonth = record.Month || record.month ||
    record['Month Name'] || record.monthName || record.Period || record.period || '';
  const month = normalizeMonth(String(rawMonth), record.Date || record.date || record.Timestamp || record.timestamp);

  // 3. Extract Type
  const rawType = record.Type || record.type ||
    record['Transaction Type'] || record['transactionType'] ||
    record['Credit/Debit'] || record.Category || record.category ||
    record.Mode || record.mode || '';
  const type = normalizeType(String(rawType));

  // 4. Extract Description
  let desc = String(
    record.Description || record.description ||
    record.Particulars || record.particulars ||
    record.Details || record.details ||
    record.Purpose || record.purpose ||
    record.Name || record.name ||
    record.Contributor || record.contributor ||
    record.Item || record.item ||
    record.Title || record.title || ''
  ).trim();

  // If amount exists, enhance description
  const amount = record.Amount !== undefined ? record.Amount : (record.amount ?? record.Rupees ?? record.rupees ?? record.Paid ?? record['Paid Amount'] ?? record.Amt ?? record['Amount (Rs)'] ?? record['Amount(Rs)']);
  if (amount && !desc.includes(String(amount))) {
    const num = Number(amount);
    if (!isNaN(num) && num > 0) {
      desc = desc ? `${desc} (₹${num.toLocaleString('en-IN')})` : `Amount: ₹${num.toLocaleString('en-IN')}`;
    }
  }

  // 5. Extract Bill Link
  const rawBill = record.BillLink || record.billLink ||
    record['Bill Link'] || record['bill_link'] ||
    record['PDF Link'] || record['pdf_link'] ||
    record.pdfUrl || record.pdf_url || record.pdf ||
    record.Voucher || record['Voucher Link'] ||
    record.Receipt || record['Receipt URL'] ||
    record.Link || record.link ||
    record.URL || record.url || '';

  let billLink = String(rawBill).trim();
  if (!billLink || billLink === 'none') {
    billLink = '#';
  }

  // Must have at least Month and either Year or Description
  if (!month) return null;
  const finalYear = finYear || defaultYear || '2026-27';

  return {
    FinancialYear: finalYear,
    Month: month,
    Type: type,
    Description: desc || 'Official Record',
    BillLink: billLink
  };
}

/**
 * Filters an array of raw items, returning only valid CleanAccountingRecord items.
 */
export function filterValidAccountingRecords(data: any[], defaultYear?: string): CleanAccountingRecord[] {
  if (!Array.isArray(data)) return [];
  const results: CleanAccountingRecord[] = [];

  for (const item of data) {
    const normalized = normalizeAccountingRecord(item, defaultYear);
    if (normalized) {
      results.push(normalized);
    }
  }

  return results;
}

const LOCAL_STORAGE_ACCOUNTING_KEY = 'phdy_village_accounting_cache';

export function getCachedAccountingRecords(): CleanAccountingRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACCOUNTING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return filterValidAccountingRecords(parsed);
  } catch (e) {
    return [];
  }
}

export function saveCachedAccountingRecords(records: CleanAccountingRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACCOUNTING_KEY, JSON.stringify(records));
  } catch (e) {}
}

export function addRecordToLocalCache(record: CleanAccountingRecord): void {
  try {
    const existing = getCachedAccountingRecords();
    // Prepend new record, avoiding exact duplicate description + month + year
    const filtered = existing.filter(r => 
      !(r.Description === record.Description && r.Month === record.Month && r.FinancialYear === record.FinancialYear)
    );
    filtered.unshift(record);
    saveCachedAccountingRecords(filtered);
  } catch (e) {}
}

export function removeRecordFromLocalCache(description: string): void {
  try {
    const existing = getCachedAccountingRecords();
    const filtered = existing.filter(r => r.Description !== description);
    saveCachedAccountingRecords(filtered);
  } catch (e) {}
}

/**
 * Robust fetch function that tests multiple parameter sets against the Google Apps Script endpoint
 * and rejects default member list responses.
 */
export async function fetchSpreadsheetAccountingRecords(apiUrl: string): Promise<{ records: CleanAccountingRecord[]; isLiveConnected: boolean }> {
  if (!apiUrl) {
    return { records: getCachedAccountingRecords(), isLiveConnected: false };
  }

  const parseJson = (text: string): any[] => {
    if (!text || text.trim().startsWith('<')) return [];
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed.data)) return parsed.data;
      if (Array.isArray(parsed.records)) return parsed.records;
      if (Array.isArray(parsed.rows)) return parsed.rows;
      return [];
    } catch {
      return [];
    }
  };

  // Candidate GET endpoints to try
  const getCandidates = [
    { type: 'accountings', sheet: 'accountings' },
    { type: 'accounting', sheet: 'Accounting' },
    { type: 'phdy_funds', sheet: 'Phdy_funds' },
    { sheet: 'Phdy_funds' },
    { sheet: '2026-27' },
    { type: '2026-27' },
    { type: 'accounting' },
    { sheet: 'Accounting' },
    { sheetName: 'Accounting' },
    { sheetName: '2026-27' },
    { sheetName: 'Phdy_funds' }
  ];

  // Try ALL GET candidates and aggregate results
  const allFetchedRecords: CleanAccountingRecord[] = [];
  let connectionSuccess = false;

  for (const candidate of getCandidates) {
    try {
      const params = new URLSearchParams({ ...candidate, _t: Date.now().toString() });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${apiUrl}?${params.toString()}`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timer);
      const text = await res.text();
      const data = parseJson(text);
      const valid = filterValidAccountingRecords(data, candidate.sheet);
      if (valid.length > 0) {
        connectionSuccess = true;
        valid.forEach(v => allFetchedRecords.push(v));
      }
    } catch {
      // Continue to next candidate
    }
  }

  // If we found any live records, merge with cache and return
  if (connectionSuccess) {
    const local = getCachedAccountingRecords();
    const mergedMap = new Map<string, CleanAccountingRecord>();
    
    // Process live records first to give them priority
    allFetchedRecords.forEach(r => {
      const key = `${r.FinancialYear}_${r.Month}_${r.Description}_${r.Type}`;
      mergedMap.set(key, r);
    });
    
    // Fill in from local cache for any records not returned by the current live sync
    local.forEach(r => {
      const key = `${r.FinancialYear}_${r.Month}_${r.Description}_${r.Type}`;
      if (!mergedMap.has(key)) {
        mergedMap.set(key, r);
      }
    });

    const finalRecords = Array.from(mergedMap.values());
    saveCachedAccountingRecords(finalRecords);
    return { records: finalRecords, isLiveConnected: true };
  }

  // Candidate POST payloads to try
  const postCandidates = [
    { action: 'get_accounting', type: 'accounting', sheet: 'Accounting' },
    { action: 'get_accounting', sheet: '2026-27' },
    { action: 'get_phdy_funds', sheet: 'Phdy_funds' },
    { action: 'get_data', sheet: 'Accounting' }
  ];

  // Try POST fallbacks if GET failed to return any valid data
  for (const postCandidate of postCandidates) {
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(postCandidate)
      });
      const text = await res.text();
      const data = parseJson(text);
      const valid = filterValidAccountingRecords(data, postCandidate.sheet);
      if (valid.length > 0) {
        connectionSuccess = true;
        valid.forEach(v => allFetchedRecords.push(v));
      }
    } catch {
      // Continue
    }
  }

  if (connectionSuccess) {
    const local = getCachedAccountingRecords();
    const mergedMap = new Map<string, CleanAccountingRecord>();
    allFetchedRecords.forEach(r => {
      const key = `${r.FinancialYear}_${r.Month}_${r.Description}_${r.Type}`;
      mergedMap.set(key, r);
    });
    local.forEach(r => {
      const key = `${r.FinancialYear}_${r.Month}_${r.Description}_${r.Type}`;
      if (!mergedMap.has(key)) mergedMap.set(key, r);
    });
    const finalRecords = Array.from(mergedMap.values());
    saveCachedAccountingRecords(finalRecords);
    return { records: finalRecords, isLiveConnected: true };
  }

  // Fallback to local cached records if no live endpoint returned valid data
  const cached = getCachedAccountingRecords();
  return { records: cached, isLiveConnected: false };
}

/**
 * Clean Google Apps Script helper code snippet to provide in the UI for users/admins.
 */
export const ACCOUNTING_APPS_SCRIPT_SNIPPET = `/**
 * Accounting.gs
 * Dedicated module for handling "Accounting" spreadsheet operations.
 * Supports financial years (e.g. 2026-27, 2025-26, 2024-25).
 */

function handleAccountingGet(e, ss) {
  // Check for tab named "Accounting", "accountings", "Phdy_funds" or specified sheet/year
  var sheetName = (e && e.parameter && (e.parameter.sheet || e.parameter.sheetName)) || "Accounting";
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Try matching financial year sheet tab or plural variations
    sheet = ss.getSheetByName("accountings") || 
            ss.getSheetByName("Phdy_funds") || 
            ss.getSheetByName("PHDY_Funds") || 
            ss.getSheetByName("PHDY Funds") || 
            ss.getSheetByName("2026-27") || 
            ss.getSheetByName("Accounts");
  }

  if (!sheet && e && e.parameter && e.parameter.type === 'phdy_funds') {
     sheet = ss.getSheetByName("Phdy_funds") || ss.getSheetByName("PHDY Funds");
  }

  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  }
  
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handleAccountingPost(data, ss) {
  var sheetName = data.sheet || "Accounting";
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.getSheetByName("accountings") || ss.getSheetByName("Phdy_funds") || ss.insertSheet(sheetName);
  }
  
  if (sheet.getLastRow() === 0) {
    // Detect if this is a funds sheet or accounting sheet to set appropriate headers
    if (data.action.includes('fund') || sheetName.toLowerCase().includes('fund')) {
      sheet.appendRow(["Date", "Name", "Type", "Amount", "Purpose", "Category", "Mode", "BillLink"]);
    } else {
      sheet.appendRow(["FinancialYear", "Month", "Type", "Description", "BillLink"]);
    }
  }
  
  if (data.action === 'add_accounting' || data.action === 'add_phdy_fund') {
    if (data.action === 'add_phdy_fund') {
      sheet.appendRow([
        data.Date || '',
        data.Name || '',
        data.Type || 'Credit',
        data.Amount || 0,
        data.Purpose || '',
        data.Category || '',
        data.Mode || '',
        data.BillLink || 'none'
      ]);
    } else {
      sheet.appendRow([
        data.FinancialYear || '2026-27',
        data.Month || 'April',
        data.Type || 'Income',
        data.Description || '',
        data.BillLink || 'none'
      ]);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Entry added' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  if (data.action === 'delete_accounting' || data.action === 'delete_phdy_fund') {
    var rows = sheet.getDataRange().getValues();
    var searchStr = data.description || data.Purpose || data.Name;
    for (var i = 1; i < rows.length; i++) {
      // Search in description/purpose/name columns
      if (rows[i][3] === searchStr || rows[i][4] === searchStr || rows[i][1] === searchStr) {
        sheet.deleteRow(i + 1);
        return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Entry deleted' })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Entry not found' })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unknown action' })).setMimeType(ContentService.MimeType.JSON);
}

// In your main Code.gs file, update doGet and doPost:
//
// In doGet(e):
// if (e.parameter.type === 'accounting' || e.parameter.type === 'accountings' || e.parameter.type === 'phdy_funds' || e.parameter.sheet === 'Accounting' || e.parameter.sheet === 'accountings' || e.parameter.sheet === 'Phdy_funds' || e.parameter.sheet === '2026-27') {
//   return handleAccountingGet(e, ss);
// }
//
// In doPost(e):
// if (data.action === 'get_accounting' || data.action === 'get_phdy_funds') {
//   return handleAccountingGet(e, ss);
// }
// if (data.action === 'add_accounting' || data.action === 'delete_accounting') {
//   return handleAccountingPost(data, ss);
// }
`;
