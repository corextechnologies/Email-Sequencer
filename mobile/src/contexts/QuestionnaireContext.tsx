import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface QuestionnaireData {
  companyName: string;
  industry: string;
  description: string;
  products: string;
  targetAudience: string;
  challenges: string;
  valueProposition: string;
}

interface QuestionnaireContextType {
  data: QuestionnaireData;
  updateData: (updates: Partial<QuestionnaireData>) => void;
  resetData: () => void;
  isComplete: () => boolean;
}

const QuestionnaireContext = createContext<QuestionnaireContextType | undefined>(undefined);

const initialData: QuestionnaireData = {
  companyName: '',
  industry: '',
  description: '',
  products: '',
  targetAudience: '',
  challenges: '',
  valueProposition: '',
};

interface QuestionnaireProviderProps {
  children: ReactNode;
}

export function QuestionnaireProvider({ children }: QuestionnaireProviderProps) {
  const [data, setData] = useState<QuestionnaireData>(initialData);

  const updateData = (updates: Partial<QuestionnaireData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const resetData = () => {
    setData(initialData);
  };

  const isComplete = () => {
    return Object.values(data).every(value => value.trim().length > 0);
  };

  return (
    <QuestionnaireContext.Provider value={{
      data,
      updateData,
      resetData,
      isComplete,
    }}>
      {children}
    </QuestionnaireContext.Provider>
  );
}

export function useQuestionnaire() {
  const context = useContext(QuestionnaireContext);
  if (context === undefined) {
    throw new Error('useQuestionnaire must be used within a QuestionnaireProvider');
  }
  return context;
}
