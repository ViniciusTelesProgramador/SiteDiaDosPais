import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  className = '',
  ...props
}) => {
  const baseStyle =
    'px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500'
      : 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400';

  return (
    <button className={`${baseStyle} ${styles} ${className}`} {...props}>
      {children}
    </button>
  );
};
