import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

const Select = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Seleccionar...',
  error,
  touched,
  required = false,
  disabled = false,
  icon,
  className = '',
  ...props
}) => {
  const hasError = touched && error;

  let borderClass = 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/30';
  if (hasError) borderClass = 'border-error focus:border-error focus:ring-error/30';
  if (disabled) borderClass = 'border-gray-200';

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
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          className={`w-full px-4 py-2.5 rounded-xl border ${borderClass} bg-white text-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 appearance-none cursor-pointer ${icon ? 'pl-10' : ''} pr-10 ${disabled ? 'cursor-not-allowed bg-gray-100 text-gray-500' : ''} ${!value ? 'text-gray-400' : ''}`}
          aria-required={required}
          aria-invalid={!!hasError}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value || opt.id} value={opt.value || opt.id}>
              {opt.label || opt.nombre}
            </option>
          ))}
        </select>
        <ChevronDown size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>
      {hasError && (
        <p className="mt-1.5 text-sm text-error flex items-center gap-1" role="alert">
          <AlertCircle size={14} /> {error}
        </p>
      )}
    </div>
  );
};

export default Select;
