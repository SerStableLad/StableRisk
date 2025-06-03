import React from 'react';
import { AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import Header from './components/Header';
import Footer from './components/Footer';

function App() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <Dashboard />
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
}

export default App;