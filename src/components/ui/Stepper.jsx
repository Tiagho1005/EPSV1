import React from 'react';
import { Check } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const Stepper = ({ steps, currentStep, orientation = 'horizontal' }) => {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div className={`flex ${isHorizontal ? 'items-center justify-between' : 'flex-col gap-0'} ${isHorizontal ? 'gap-0' : ''}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const IconComponent = step.icon ? LucideIcons[step.icon] : null;

        return (
          <React.Fragment key={index}>
            <div className={`flex ${isHorizontal ? 'flex-col items-center' : 'items-start gap-4'} ${isHorizontal ? 'flex-1' : ''}`}>
              {/* Step circle */}
              <div className="relative">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    isCompleted
                      ? 'bg-success text-white'
                      : isCurrent
                      ? 'bg-primary-500 text-white animate-pulse-ring'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? (
                    <Check size={18} />
                  ) : IconComponent && isCurrent ? (
                    <IconComponent size={18} />
                  ) : (
                    index + 1
                  )}
                </div>
              </div>

              {/* Step label */}
              <div className={`${isHorizontal ? 'mt-2 text-center' : 'pt-2 pb-8'}`}>
                <p className={`text-xs font-medium ${
                  isCompleted ? 'text-success-dark' : isCurrent ? 'text-primary-600' : 'text-gray-400'
                }`}>
                  {step.label}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && isHorizontal && (
              <div className={`flex-1 h-0.5 -mt-6 mx-2 rounded transition-colors duration-300 ${
                index < currentStep ? 'bg-success' : 'bg-gray-200'
              }`} />
            )}
            {index < steps.length - 1 && !isHorizontal && (
              <div className={`absolute ml-5 w-0.5 h-8 transition-colors duration-300 ${
                index < currentStep ? 'bg-success' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
