import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Stablecoin Risk Rater</p>
          <div className="mt-2 md:mt-0">
            <ul className="flex space-x-4">
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  About
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Privacy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-blue-600 transition-colors">
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center md:text-left">
          Data provided by CoinGecko, DeFiLlama, and other public sources. Not financial advice.
        </p>
      </div>
    </footer>
  );
};

export default Footer;