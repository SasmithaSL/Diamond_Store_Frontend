'use client';

import { useState, useEffect } from 'react';

interface WhatsAppSupportProps {
  phoneNumber?: string;
  message?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export default function WhatsAppSupport({
  phoneNumber,
  message,
  position = 'bottom-right',
}: WhatsAppSupportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  useEffect(() => {
    // Always get values from environment variables or props
    const envNum = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
    const envMsg = process.env.NEXT_PUBLIC_WHATSAPP_MESSAGE || '';
    
    const num = phoneNumber || envNum;
    const msg = message || envMsg;
    
    // Format phone number (remove any non-digit characters)
    const cleanNum = num.replace(/\D/g, '');
    if (cleanNum && cleanNum.length >= 10) {
      setWhatsappNumber(cleanNum);
    }
    
    if (msg) {
      setWhatsappMessage(msg);
    }
  }, [phoneNumber, message]);

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('WhatsApp button clicked!');
    console.log('Current whatsappNumber:', whatsappNumber);
    
    // Use the state value from environment variable
    const phoneNum = whatsappNumber;
    const msg = whatsappMessage;
    
    if (!phoneNum) {
      console.error('WhatsApp number not configured in .env');
      return;
    }
    
    // Format phone number (remove any non-digit characters)
    const formattedNumber = phoneNum.replace(/\D/g, '');
    console.log('Formatted number:', formattedNumber);
    
    // Encode the message
    const encodedMessage = encodeURIComponent(msg || '');
    
    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedNumber}${msg ? `?text=${encodedMessage}` : ''}`;
    console.log('WhatsApp URL:', whatsappUrl);
    
    // Close the popup first
    setIsOpen(false);
    
    // Open WhatsApp - use direct navigation which is more reliable
    setTimeout(() => {
      window.location.href = whatsappUrl;
    }, 100);
  };

  const positionClasses = position === 'bottom-right' 
    ? 'right-4 bottom-4' 
    : 'left-4 bottom-4';

  return (
    <div className={`fixed ${positionClasses} z-50`}>
      {/* Chat Popup */}
      {isOpen && (
        <div className="mb-4 animate-slide-up">
          <div className="bg-white rounded-lg shadow-2xl p-4 w-64 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.27 9.27 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.284 9.284 0 01-1.51-5.26c.001-5.142 4.19-9.33 9.332-9.33 2.484 0 4.817.966 6.564 2.713a9.183 9.183 0 012.713 6.565c0 5.142-4.19 9.33-9.332 9.33m8.664-16.251a11.815 11.815 0 00-8.4-3.48c-6.54 0-11.865 5.325-11.865 11.865 0 2.096.547 4.142 1.588 5.945l-1.681 6.146 6.186-1.637a11.882 11.882 0 005.943 1.586h.005c6.54 0 11.865-5.325 11.865-11.865a11.821 11.821 0 00-3.481-8.401" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 text-sm">Support</h3>
                  <p className="text-xs text-gray-500">We're here to help!</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <a
              href={`https://wa.me/${whatsappNumber}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                console.log('WhatsApp link clicked - opening:', `https://wa.me/${whatsappNumber}${whatsappMessage ? `?text=${encodeURIComponent(whatsappMessage)}` : ''}`);
                setIsOpen(false);
                // Don't prevent default - let the anchor tag work naturally
              }}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer no-underline block text-center"
              style={{ textDecoration: 'none' }}
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.27 9.27 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.284 9.284 0 01-1.51-5.26c.001-5.142 4.19-9.33 9.332-9.33 2.484 0 4.817.966 6.564 2.713a9.183 9.183 0 012.713 6.565c0 5.142-4.19 9.33-9.332 9.33m8.664-16.251a11.815 11.815 0 00-8.4-3.48c-6.54 0-11.865 5.325-11.865 11.865 0 2.096.547 4.142 1.588 5.945l-1.681 6.146 6.186-1.637a11.882 11.882 0 005.943 1.586h.005c6.54 0 11.865-5.325 11.865-11.865a11.821 11.821 0 00-3.481-8.401" />
              </svg>
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Button - Only show when popup is closed */}
      {!isOpen && (
        <button
          onClick={() => {
            console.log('Floating button clicked, current state:', isOpen);
            setIsOpen(true);
          }}
          type="button"
          className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center"
          aria-label="Open support chat"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.27 9.27 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.284 9.284 0 01-1.51-5.26c.001-5.142 4.19-9.33 9.332-9.33 2.484 0 4.817.966 6.564 2.713a9.183 9.183 0 012.713 6.565c0 5.142-4.19 9.33-9.332 9.33m8.664-16.251a11.815 11.815 0 00-8.4-3.48c-6.54 0-11.865 5.325-11.865 11.865 0 2.096.547 4.142 1.588 5.945l-1.681 6.146 6.186-1.637a11.882 11.882 0 005.943 1.586h.005c6.54 0 11.865-5.325 11.865-11.865a11.821 11.821 0 00-3.481-8.401" />
          </svg>
        </button>
      )}
    </div>
  );
}
