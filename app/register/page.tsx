'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { setToken } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [faceImage, setFaceImage] = useState<File | null>(null);
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string>('');
  const [idFrontPreview, setIdFrontPreview] = useState<string>('');
  const [idBackPreview, setIdBackPreview] = useState<string>('');
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
        setFacePreview(reader.result as string);
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
        setIdFrontPreview(reader.result as string);
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
        setIdBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate all required fields
    if (!formData.name || formData.name.trim() === '') {
      setError('Full name is required');
      return;
    }

    // Nickname is optional, but if provided, validate it
    if (formData.nickname && formData.nickname.trim().length > 100) {
      setError('Nickname must be 100 characters or less');
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
      data.append('name', formData.name);
      if (formData.nickname && formData.nickname.trim() !== '') {
        data.append('nickname', formData.nickname.trim());
      }
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
            <p className="text-gray-600">Register for your top-up account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              Registration successful! Your account is pending admin approval. Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nickname <span className="text-gray-400 text-xs">(Optional)</span>
              </label>
              <input
                type="text"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                maxLength={100}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="Enter a nickname (will be displayed instead of name)"
              />
              <p className="text-xs text-gray-500 mt-1"></p>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Face Image <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                {facePreview && (
                  <div className="mb-3">
                    <img
                      src={facePreview}
                      alt="Face Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFaceImageChange}
                  required
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID/Passport Card Front <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                {idFrontPreview && (
                  <div className="mb-3">
                    <img
                      src={idFrontPreview}
                      alt="ID Front Preview"
                      className="w-full max-w-md h-48 object-contain rounded-lg border border-gray-300 bg-gray-50"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIdCardFrontChange}
                  required
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID/Passport Card Back <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                {idBackPreview && (
                  <div className="mb-3">
                    <img
                      src={idBackPreview}
                      alt="ID Back Preview"
                      className="w-full max-w-md h-48 object-contain rounded-lg border border-gray-300 bg-gray-50"
                    />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleIdCardBackChange}
                  required
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                />
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

