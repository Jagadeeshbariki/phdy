
import React, { useState } from 'react';
import { CONTACT_SOCIAL_LINKS } from '../ContactData';

const ContactSection: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    education: '',
    address: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strictly accept only numbers
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setFormData({ ...formData, phone: value });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate 10-digit phone number
    if (formData.phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }
    
    setIsSubmitting(true);
    // Simulation of data submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({
        fullName: '',
        age: '',
        gender: '',
        education: '',
        address: '',
        phone: ''
      });
      setTimeout(() => setSubmitted(false), 5000);
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        {/* Registration Form */}
        <div className="bg-white rounded-[40px] p-8 md:p-12 shadow-2xl shadow-orange-100 border border-orange-50">
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-gray-900 mb-2">Member Registration</h3>
            <p className="text-gray-500">Please provide your details to connect with the PHDY group.</p>
          </div>

          {submitted ? (
            <div className="bg-green-50 text-green-700 p-8 rounded-3xl border border-green-200 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="text-xl font-bold mb-2">Thank You!</h4>
              <p>Your details have been registered. Our team will contact you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                  placeholder="Your Full Name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Age</label>
                  <input
                    required
                    type="number"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                    placeholder="Enter Age"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                  <select
                    required
                    className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium appearance-none"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Education Qualification</label>
                <input
                  required
                  type="text"
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                  placeholder="e.g., Graduate, B.Tech, etc."
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number (10 Digits)</label>
                <input
                  required
                  type="tel"
                  maxLength={10}
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium"
                  placeholder="Enter 10 Digit Number"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Address</label>
                <textarea
                  required
                  className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-4 focus:ring-orange-100 focus:border-orange-500 transition-all outline-none font-medium min-h-[120px]"
                  placeholder="Your Full Village Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                ></textarea>
              </div>

              <button
                disabled={isSubmitting}
                type="submit"
                className="w-full py-5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-bold shadow-xl shadow-orange-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Submit Details'}
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
