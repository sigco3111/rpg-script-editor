
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  wrapperClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, id, wrapperClassName = '', className='', ...props }) => {
  return (
    <div className={wrapperClassName}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
};

export default Input;
    