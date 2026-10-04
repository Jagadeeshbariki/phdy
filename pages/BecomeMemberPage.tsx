import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../src/auth/AuthProvider';
import { membershipService } from '../src/services/membershipService';
import { Page } from '../App';
import { 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Calendar, 
  Phone, 
  GraduationCap, 
  FileText, 
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Clock,
  Camera
} from 'lucide-react';

interface BecomeMemberPageProps {
  onNavigate: (page: Page) => void;
}

export const BecomeMemberPage: React.FC<BecomeMemberPageProps> = ({ onNavigate }) => {
  const { user, profile, membership, membershipRequest, refreshAuth, isAuthenticated, loading } = useAuth();

  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [qualification, setQualification] = useState('');
  const [reasonToJoin, setReasonToJoin] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // If user is already approved or pending, navigate or show status
  useEffect(() => {
    if (membership && membership.status === 'active') {
      onNavigate('membership-status');
    }
  }, [membership, onNavigate]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <UserCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
          Sign In Required
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Please sign in to your registered PHDY account to submit your official membership application.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => onNavigate('login')}
            className="w-full sm:w-auto px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-200"
          >
            Sign In Now
          </button>
        </div>
      </div>
    );
  }

  // If user already has a pending application
  if (membershipRequest && membershipRequest.status === 'pending') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Clock className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-3">
          Application Under Review
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          You already have an active PHDY membership application submitted on{' '}
          <strong className="text-gray-800">
            {new Date(membershipRequest.submitted_at).toLocaleDateString()}
          </strong>. An administrator is currently reviewing it.
        </p>
        <button
          onClick={() => onNavigate('membership-status')}
          className="px-8 py-3.5 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-orange-200"
        >
          Check Membership Status
        </button>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Please upload a valid image file (JPG, PNG, or WebP).');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size must be 5MB or smaller.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!phone.trim()) {
      setErrorMsg('Please enter your phone number.');
      return;
    }
    if (!qualification.trim()) {
      setErrorMsg('Please enter your educational qualification or occupation.');
      return;
    }
    if (!reasonToJoin.trim()) {
      setErrorMsg('Please explain why you want to become a PHDY member.');
      return;
    }

    setIsUploading(true);

    try {
      let photoUrl: string | undefined = undefined;

      // 1. Upload photo if selected
      if (selectedFile) {
        photoUrl = await membershipService.uploadMembershipPhoto(user.id, selectedFile);
      }

      // 2. Submit membership request
      await membershipService.submitMembershipRequest({
        userId: user.id,
        email: user.email || profile?.email,
        photoUrl,
        dateOfBirth: dateOfBirth || undefined,
        phone: phone.trim(),
        qualification: qualification.trim(),
        reasonToJoin: reasonToJoin.trim(),
      });

      await refreshAuth();
      setSuccessMsg('Your PHDY membership application has been submitted successfully.');

      setTimeout(() => {
        onNavigate('membership-status');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || 'Registered User';
  const displayEmail = profile?.email || user.email || '';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 rounded-3xl p-6 sm:p-8 text-white mb-8 shadow-xl shadow-orange-500/10">
        <div className="flex items-center gap-3 mb-2">
          <ShieldCheck className="w-6 h-6 text-orange-200" />
          <span className="text-xs font-black uppercase tracking-widest text-orange-100">
            Official PHDY Enrolment
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Become a PHDY Member
        </h1>
        <p className="text-orange-100 text-sm sm:text-base mt-2 leading-relaxed max-w-xl">
          Apply to become an official member of the Pedda Harivanam Development Youth (PHDY) association and join our grassroots community initiatives.
        </p>
      </div>

      {/* Verified Profile Card Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-8 shadow-sm">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
          Authenticated Applicant Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 block">Full Name</span>
            <span className="text-sm font-black text-gray-900">{displayName}</span>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <span className="text-xs font-bold text-gray-500 block">Email Address</span>
            <span className="text-sm font-bold text-gray-900">{displayEmail}</span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-800 flex items-start gap-3 mb-6 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Application Error</p>
            <p>{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 flex items-start gap-3 mb-6 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Submission Received!</p>
            <p>{successMsg}</p>
          </div>
        </div>
      )}

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Photo Upload Section */}
        <div>
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
            Passport / Profile Photo (Optional but Recommended)
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl border-2 border-dashed border-gray-200 hover:border-orange-400 bg-gray-50/50 transition-all">
            
            {/* Preview Box */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-gray-200 border-2 border-white shadow-md flex-shrink-0 flex items-center justify-center">
              {previewUrl ? (
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <Camera className="w-8 h-8 text-gray-400" />
              )}
            </div>

            {/* Upload Controls */}
            <div className="flex-grow text-center sm:text-left">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:border-orange-500 text-gray-700 hover:text-orange-600 font-bold text-xs rounded-xl cursor-pointer shadow-sm transition-all"
              >
                <Upload className="w-4 h-4" />
                {previewUrl ? 'Replace Photo' : 'Choose Photo'}
              </label>
              <p className="text-[11px] text-gray-400 mt-2">
                Supported formats: JPG, PNG, WebP (Max 5MB)
              </p>
            </div>
          </div>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
            Date of Birth
          </label>
          <div className="relative">
            <Calendar className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
            Phone Number *
          </label>
          <div className="relative">
            <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="tel"
              required
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Qualification */}
        <div>
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
            Educational Qualification / Occupation *
          </label>
          <div className="relative">
            <GraduationCap className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="e.g. B.Tech Graduate, Farmer, Teacher, Student"
              value={qualification}
              onChange={(e) => setQualification(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Reason to Join */}
        <div>
          <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
            Why do you want to become a PHDY member? *
          </label>
          <div className="relative">
            <FileText className="w-5 h-5 text-gray-400 absolute left-4 top-4" />
            <textarea
              required
              rows={4}
              placeholder="Describe your motivation and how you wish to contribute to Pedda Harivanam's development..."
              value={reasonToJoin}
              onChange={(e) => setReasonToJoin(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={isUploading}
            className={`w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2 ${
              isUploading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Submitting Application...</span>
              </>
            ) : (
              <>
                <span>Submit Membership Application</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
