import React from 'react';
import { Shield } from 'lucide-react';

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="ml-2 text-xl font-bold text-gray-900">
              Stablecoin Risk Rater
            </h1>
            <a 
              href="https://x.com/SerStableLad" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 text-xs text-gray-500 hover:text-gray-700"
            >
              by SerStableLad
            </a>
          </div>
          <div className="text-sm text-gray-500">Beta</div>
        </div>
      </div>
    </header>
  );
};

export default Header;