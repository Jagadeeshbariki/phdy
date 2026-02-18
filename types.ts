
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
