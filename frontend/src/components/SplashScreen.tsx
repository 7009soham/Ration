import React, { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center">
      {/* Indian Flag */}
      <div className="w-64 h-48 border border-gray-300 shadow-lg rounded-lg overflow-hidden mb-8">
        {/* Saffron stripe */}
        <div className="w-full h-1/3 bg-gradient-to-r from-orange-500 to-orange-400"></div>
        
        {/* White stripe with Ashoka Chakra */}
        <div className="w-full h-1/3 bg-white relative flex items-center justify-center">
          {/* Ashoka Chakra */}
          <div className="w-12 h-12 relative">
            <svg viewBox="0 0 24 24" className="w-full h-full text-blue-800">
              <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              
              {/* 24 spokes */}
              {Array.from({ length: 24 }).map((_, i) => {
                const angle = (i * 360) / 24;
                const radian = (angle * Math.PI) / 180;
                const x1 = 12 + 3 * Math.cos(radian);
                const y1 = 12 + 3 * Math.sin(radian);
                const x2 = 12 + 9 * Math.cos(radian);
                const y2 = 12 + 9 * Math.sin(radian);
                
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeWidth="0.3"
                  />
                );
              })}
              
              {/* Inner circle */}
              <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </svg>
          </div>
        </div>
        
        {/* Green stripe */}
        <div className="w-full h-1/3 bg-gradient-to-r from-green-600 to-green-500"></div>
      </div>

      {/* Government branding */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl text-gray-800 mb-2">भारत सरकार</h1>
        <h2 className="text-xl text-gray-700">Government of India</h2>
        <div className="mt-4">
          <h3 className="text-lg text-orange-600">राशन वितरण प्रणाली</h3>
          <p className="text-gray-600">Public Distribution System</p>
        </div>
      </div>

      {/* Loading animation */}
      <div className="mt-8 flex space-x-2">
        <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
        <div className="w-2 h-2 bg-white border border-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm text-gray-500">डिजिटल इंडिया पहल</p>
        <p className="text-xs text-gray-400">Digital India Initiative</p>
      </div>
    </div>
  );
}