
import React, { useState, useRef } from 'react';
import { CONTACT_SOCIAL_LINKS } from '../ContactData';

const SPREADSHEET_API_URL = 'https://script.google.com/macros/s/AKfycbzdE2YpqlLvSqx1IzsHx7A0JMl_2uTZUssxEalLc1IsUUDIdFqaz3IU5C373pJolhs21Q/exec';
const CLOUDINARY_CLOUD_NAME = 'dbohmpxko';
const CLOUDINARY_UPLOAD_PRESET = 'phdy_preset'; 

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    address: '',
    reason: ''
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, phone: value });
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const data = new FormData();
    data.append('file', file);
    data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    data.append('resource_type', 'image');
    
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
      method: 'POST',
      body: data
    });
    
    if (!res.ok) {
      throw new Error('Cloudinary upload failed');
    }
    return await res.json();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!selectedFile) {
      alert("Please upload your photo.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const cloudinaryData = await uploadToCloudinary(selectedFile);
      
      const submissionPayload = {
        action: 'add_join_request',
        type: 'join_requests',
        sheet: 'JoinRequests',
        sheetName: 'JoinRequests',
        fullName: formData.fullName.trim(),
        FullName: formData.fullName.trim(),
        "Full Name": formData.fullName.trim(),
        name: formData.fullName.trim(),
        Name: formData.fullName.trim(),
        email: formData.email.trim(),
        Email: formData.email.trim(),
        phone: formData.phone.trim(),
        Phone: formData.phone.trim(),
        dob: formData.dob,
        DOB: formData.dob,
        address: formData.address.trim(),
        Address: formData.address.trim(),
        reason: formData.reason.trim(),
        Reason: formData.reason.trim(),
        photoUrl: cloudinaryData.secure_url,
        PhotoUrl: cloudinaryData.secure_url,
        "Photo URL": cloudinaryData.secure_url,
        status: 'In Progress',
        Status: 'In Progress',
        "Request Status": 'In Progress',
        "RequestStatus": 'In Progress',
        date: new Date().toISOString().split('T')[0],
        Date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        Timestamp: new Date().toISOString()
      };

      try {
        const localReq = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          dob: formData.dob,
          address: formData.address.trim(),
          reason: formData.reason.trim(),
          photoUrl: cloudinaryData.secure_url,
          status: 'In Progress',
          date: new Date().toISOString().split('T')[0]
        };
        const cached: any[] = JSON.parse(localStorage.getItem('phdy_join_requests_cache') || '[]');
        const targetEmail = localReq.email.toLowerCase();
        const targetName = localReq.fullName.toLowerCase();
        const filtered = cached.filter((c: any) => {
          const cEmail = String(c.email || '').toLowerCase().trim();
          const cName = String(c.fullName || c.name || '').toLowerCase().trim();
          if (targetEmail && cEmail) return cEmail !== targetEmail;
          return cName !== targetName;
        });
        filtered.unshift(localReq);
        localStorage.setItem('phdy_join_requests_cache', JSON.stringify(filtered));
        // Notify any active admin page
        window.dispatchEvent(new Event('phdy_join_requests_updated'));
      } catch (e) {}

      await fetch(SPREADSHEET_API_URL, {
        method: 'POST', 
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(submissionPayload),
      });

      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        dob: '',
        address: '',
        reason: ''
      });
      setSelectedFile(null);
      setPreviewUrl(null);
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error(err);
      alert("Failed to submit request. Please try again later.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Registration Form */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-orange-100 border border-orange-50">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Join Us</h3>
            <p className="text-gray-500">Please provide your details to request joining the PHDY group.</p>
          </div>

          {submitted ? (
            <div className="bg-green-50 text-green-700 p-8 rounded-3xl border border-green-200 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Thank You!</h4>
              <p>Your request has been submitted. Our admin team will review it soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center mb-8">
                <label className="block text-sm font-bold text-gray-700 mb-4 text-center w-full">Your Photo</label>
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="w-32 h-32 rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-orange-300 transition-colors"
                >
                  {previewUrl ? (
                    <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="text-center p-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] text-gray-500 font-bold uppercase block">Upload</span>
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => { 
                    const f = e.target.files?.[0]; 
                    if(f) { 
                      setSelectedFile(f); 
                      setPreviewUrl(URL.createObjectURL(f)); 
                    } 
                  }} 
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your full name</label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                  placeholder="Enter your name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your email address</label>
                <input
                  required
                  type="email"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your phone number</label>
                  <input
                    required
                    type="tel"
                    maxLength={10}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                    placeholder="10 digit number"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Your date of birth</label>
                  <input
                    required
                    type="date"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Your address</label>
                <textarea
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium min-h-[100px]"
                  placeholder="Full address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Why you want to join our group</label>
                <textarea
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium min-h-[120px]"
                  placeholder="Explain your reason..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                ></textarea>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : 'Submit Request'}
              </button>
            </form>
          )}
        </div>

        {/* Social and Contact Info */}
        <div className="space-y-8">
          <div className="bg-orange-600 rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            <h3 className="text-2xl font-bold mb-8">Follow Us Online</h3>
            <div className="grid grid-cols-2 gap-6">
              {CONTACT_SOCIAL_LINKS.map((link, idx) => (
                <a 
                  key={idx}
                  href={link.URLofsocialMedia}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-3 p-4 bg-white/10 rounded-2xl hover:bg-white/20 transition-all group"
                >
                  <img src={link.LogoURL} alt={link.Name} className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">{link.Name}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[40px] p-10 shadow-xl border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Our Contact Email</h3>
            <div className="flex items-center space-x-4 p-5 bg-gray-50 rounded-3xl">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1 overflow-hidden">
                <span className="block text-sm text-gray-500 font-bold uppercase tracking-widest">Email Address</span>
                <span className="text-gray-900 font-bold break-all">peddaharivanamdevelopmentyouth@gmail.com</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
