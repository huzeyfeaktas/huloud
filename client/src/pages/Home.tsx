import React, { useEffect } from 'react';
import { useLocation } from 'wouter';

const Home: React.FC = () => {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Redirect to files page
    navigate('/files');
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg">Redirecting to files...</p>
    </div>
  );
};

export default Home;
