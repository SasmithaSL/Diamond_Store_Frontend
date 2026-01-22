'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    phoneNumber: '',
    nickname: '',
    email: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);
  const [faceImagePreview, setFaceImagePreview] = useState<string>('');
  const [idCardFrontPreview, setIdCardFrontPreview] = useState<string>('');
  const [idCardBackPreview, setIdCardBackPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For ID Number, must start with numbers, can have letters after
    if (name === 'idNumber') {
      // Remove special characters, keep only numbers and letters
      let cleanedValue = value.replace(/[^0-9A-Za-z]/g, '');
      
      // Ensure it starts with a number
      if (cleanedValue.length > 0 && !/^[0-9]/.test(cleanedValue)) {
        // If doesn't start with number, remove leading letters
        cleanedValue = cleanedValue.replace(/^[A-Za-z]+/, '');
      }
      
      setFormData({
        ...formData,
        [name]: cleanedValue,
      });
    } else if (name === 'phoneNumber') {
      // For phone number, keep only digits
      const cleanedValue = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: cleanedValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleFaceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFaceImage(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFaceImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdCardFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdCardFront(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardFrontPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleIdCardBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIdCardBack(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdCardBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate all required fields
    if (!formData.phoneNumber || formData.phoneNumber.trim() === '') {
      setError('Phone number is required');
      return;
    }

    if (formData.phoneNumber.length < 10) {
      setError('Phone number must be at least 10 digits');
      return;
    }

    // Nickname is optional, but if provided, validate it
    if (formData.nickname && formData.nickname.trim().length > 100) {
      setError('Nickname must be 100 characters or less');
      return;
    }

    // Email validation
    if (!formData.email || formData.email.trim() === '') {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (!formData.idNumber || formData.idNumber.trim() === '') {
      setError('ID number is required');
      return;
    }

    if (!formData.password || formData.password.trim() === '') {
      setError('Password is required');
      return;
    }

    if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
      setError('Please confirm your password');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!faceImage) {
      setError('Face image is required');
      return;
    }

    if (!idCardFront) {
      setError('ID/Passport card front image is required');
      return;
    }

    if (!idCardBack) {
      setError('ID/Passport card back image is required');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('phoneNumber', formData.phoneNumber);
      if (formData.nickname && formData.nickname.trim() !== '') {
        data.append('nickname', formData.nickname.trim());
      }
      data.append('email', formData.email.trim());
      data.append('idNumber', formData.idNumber);
      data.append('password', formData.password);
      data.append('faceImage', faceImage);
      data.append('idCardFront', idCardFront);
      data.append('idCardBack', idCardBack);

      const response = await api.post('/auth/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Store ID number in localStorage for status checking
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingIdNumber', formData.idNumber);
      }

      setSuccess(true);
      // Redirect to pending page immediately after successful registration
      // Use replace to prevent back navigation to registration page
      setTimeout(() => {
        router.replace('/pending');
      }, 1500);
    } catch (err: any) {
      const statusCode = err.response?.status;
      let errorMessage = err.response?.data?.error || 'Registration failed';
      
      // Handle rate limiting
      if (statusCode === 429) {
        errorMessage = 'Too many registration attempts. Please wait a few minutes before trying again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h1>
            <p className="text-gray-600">Register for your quick smart account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your nickname"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="idNumber"
                value={formData.idNumber}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your ID number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                required
                minLength={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your phone number"
              />
              <p className="text-xs text-gray-500 mt-1">Enter country code + number without + or spaces</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter password (min 6 characters)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Confirm your password"
              />
            </div>

            {/* Upload NIC / Passport Photo Section */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Upload NIC / Passport photo<span className="text-red-500">*</span>
              </h2>
              
              <div className="space-y-6">
                {/* Front ID Photo Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Upload Input Box */}
                  <div>
                    <label className="cursor-pointer">
                      <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors aspect-square flex items-center justify-center relative overflow-hidden">
                        {idCardFrontPreview ? (
                          <img 
                            src={idCardFrontPreview} 
                            alt="Front ID preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIdCardFrontChange}
                          required
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <p className="text-sm text-gray-600 text-center mt-2">Front</p>
                    </label>
                  </div>

                  {/* Example Image Box */}
                  <div>
                    <div className="bg-blue-50 rounded-lg border-2 border-blue-200 aspect-square flex items-center justify-center p-4 overflow-hidden">
                      <img 
                        src="/images/id front.png" 
                        alt="Front ID example" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">Example</p>
                  </div>
                </div>

                {/* Back ID Photo Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Upload Input Box */}
                  <div>
                    <label className="cursor-pointer">
                      <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors aspect-square flex items-center justify-center relative overflow-hidden">
                        {idCardBackPreview ? (
                          <img 
                            src={idCardBackPreview} 
                            alt="Back ID preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleIdCardBackChange}
                          required
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <p className="text-sm text-gray-600 text-center mt-2">Back</p>
                    </label>
                  </div>

                  {/* Example Image Box */}
                  <div>
                    <div className="bg-blue-50 rounded-lg border-2 border-blue-200 aspect-square flex items-center justify-center p-4 overflow-hidden">
                      <img 
                        src="/images/id back.png" 
                        alt="Back ID example" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">Example</p>
                  </div>
                </div>

                {/* Holding ID Photo Row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Upload Input Box */}
                  <div>
                    <label className="cursor-pointer">
                      <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-400 transition-colors aspect-square flex items-center justify-center relative overflow-hidden">
                        {faceImagePreview ? (
                          <img 
                            src={faceImagePreview} 
                            alt="Holding ID preview" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg
                            className="w-12 h-12 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFaceImageChange}
                          required
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                      <p className="text-sm text-gray-600 text-center mt-2">Holding ID photo</p>
                    </label>
                  </div>

                  {/* Example Image Box */}
                  <div>
                    <div className="bg-blue-50 rounded-lg border-2 border-blue-200 aspect-square flex items-center justify-center p-4 overflow-hidden">
                      <img 
                        src="/images/holding id.png" 
                        alt="Holding ID example" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-sm text-gray-600 text-center mt-2">Example</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 active:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition touch-manipulation"
            >
              {loading ? 'Registering...' : 'Register'}
            </button>

            <p className="mt-4 text-xs text-gray-500 text-center">
              <span className="text-red-500">*</span> All fields are required
            </p>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Registration successful! Your account is pending admin approval. Redirecting...
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

