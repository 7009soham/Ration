import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepNames: string[];
}

export function ProgressIndicator({ currentStep, totalSteps, stepNames }: ProgressIndicatorProps) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {stepNames.map((name, index) => (
          <div
            key={index}
            className={`flex-1 text-center transition-colors duration-300 ${
              index < currentStep
                ? 'text-primary'
                : index === currentStep
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <span className="text-sm">{name}</span>
          </div>
        ))}
      </div>
      
      <div className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <React.Fragment key={index}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                index < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index < currentStep ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {index < totalSteps - 1 && (
              <div
                className={`flex-1 h-1 transition-colors duration-300 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}