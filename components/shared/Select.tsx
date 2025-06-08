
import React from 'react';
import { ChevronDownIcon } from './icons/Icons';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  wrapperClassName?: string;
  options: Array<{ value: string | number; label: string }>;
  placeholder?: string; // Explicitly define placeholder
  leftIcon?: React.ReactNode; // Add leftIcon prop
}

const Select: React.FC<SelectProps> = ({ 
  label, 
  id, 
  options, 
  placeholder, // Destructure placeholder
  leftIcon,    // Destructure leftIcon
  wrapperClassName = '', 
  className = '', 
  ...otherProps // Use ...otherProps to avoid spreading placeholder/leftIcon to native select
}) => {
  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            {leftIcon}
          </div>
        )}
        <select
          id={id}
          className={`w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-100 focus:ring-purple-500 focus:border-purple-500 focus:outline-none appearance-none pr-8 ${leftIcon ? 'pl-10' : ''} transition-colors ${className}`}
          {...otherProps} // Spread remaining props
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
          <ChevronDownIcon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

export default Select;