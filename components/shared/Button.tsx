import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'info';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  loading,
  disabled,
  ...props
}) => {
  const baseStyles = 'font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 flex items-center justify-center transition-colors duration-150 ease-in-out';

  const variantStyles = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white focus:ring-purple-500',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-gray-100 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    success: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    ghost: 'bg-transparent hover:bg-gray-700 text-gray-300 focus:ring-gray-500 border border-gray-600',
    info: 'bg-sky-600 hover:bg-sky-700 text-white focus:ring-sky-500',
  };

  const sizeStyles = {
    sm: 'py-1.5 px-3 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-2.5 px-6 text-lg',
  };

  const spinnerColorClass = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
      case 'success':
      case 'info':
        return 'text-white';
      case 'secondary':
      case 'ghost':
        return 'text-purple-400'; 
      default:
        return 'text-purple-400';
    }
  };

  const spinner = (
    <svg className={`animate-spin h-5 w-5 ${spinnerColorClass()}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className} ${loading ? 'cursor-not-allowed opacity-75' : ''}`}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <span className="mr-2">{spinner}</span>}
      {!loading && leftIcon && <span className="mr-2 h-5 w-5">{leftIcon}</span>}
      {children}
      {/* Do not show rightIcon if loading to prevent it from being pushed by spinner? Or keep for consistency? Keeping for now. */}
      {rightIcon && <span className="ml-2 h-5 w-5">{rightIcon}</span>}
    </button>
  );
};

export default Button;