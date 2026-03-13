import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const Input = ({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  disabled = false,
  icon,
  helperText,
  className = '',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;
  const hasError = touched && error;
  const isValid = touched && !error && value;

  let borderClass = 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/30';
  let bgClass = 'bg-white';

  if (hasError) {
    borderClass = 'border-error focus:border-error focus:ring-error/30';
    bgClass = 'bg-error-light';
  } else if (isValid) {
    borderClass = 'border-success focus:border-success focus:ring-success/30';
  }

  if (disabled) {
    bgClass = 'bg-gray-100';
    borderClass = 'border-gray-200';
  }

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-error ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-xl border ${borderClass} ${bgClass} text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 ${icon ? 'pl-10' : ''} ${isPassword || hasError || isValid ? 'pr-10' : ''} ${disabled ? 'cursor-not-allowed text-gray-500' : ''}`}
          aria-required={required}
          aria-invalid={!!hasError}
          aria-describedby={hasError ? `${name}-error` : helperText ? `${name}-helper` : undefined}
          {...props}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
          {hasError && <AlertCircle size={18} className="text-error" />}
          {isValid && !isPassword && <CheckCircle size={18} className="text-success" />}
        </div>
      </div>
      {hasError && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
          {error}
        </p>
      )}
      {helperText && !hasError && (
        <p id={`${name}-helper`} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default Input;
