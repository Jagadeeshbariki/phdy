
export interface Member {
  id: string;
  name: string;
  role: string;
  education: string;
  image: string;
  contribution: string;
}

export interface Document {
  name: string;
  url: string;
}

export interface Work {
  id: number;
  title: string;
  description: string;
  date: string;
  photos: string[];
  videos: string[];
  documents: Document[];
}

export interface ContactFormData {
  fullName: string;
  age: string;
  gender: string;
  education: string;
  address: string;
  phone: string;
}

export interface SocialMedia {
  platform: string;
  url: string;
  icon: string;
}

export function getCurrentFinancialYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed, April is 3
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  } else {
    return `${year - 1}-${year.toString().slice(-2)}`;
  }
}

export function getFinancialYearsList(startYear: number = 2024): string[] {
  const currentFY = getCurrentFinancialYear();
  const [currentStartYearStr] = currentFY.split('-');
  const currentStartYear = parseInt(currentStartYearStr, 10);
  
  const years: string[] = [];
  for (let y = startYear; y <= currentStartYear; y++) {
    years.push(`${y}-${(y + 1).toString().slice(-2)}`);
  }
  return years;
}
