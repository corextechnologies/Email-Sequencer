import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PreloaderContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

const PreloaderContext = createContext<PreloaderContextType | undefined>(undefined);

interface PreloaderProviderProps {
  children: ReactNode;
}

export const PreloaderProvider: React.FC<PreloaderProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);

  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <PreloaderContext.Provider value={{ isLoading, setLoading }}>
      {children}
    </PreloaderContext.Provider>
  );
};

export const usePreloader = () => {
  const context = useContext(PreloaderContext);
  if (context === undefined) {
    throw new Error('usePreloader must be used within a PreloaderProvider');
  }
  return context;
};
