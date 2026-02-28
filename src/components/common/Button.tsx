import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:ring-blue-300',
  secondary:
    'bg-gray-200 text-gray-800 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-300',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className = '',
  children,
  disabled,
  ...rest
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-md px-4 py-2 text-sm font-medium
        transition-colors focus:outline-none focus:ring-2
        disabled:cursor-not-allowed disabled:opacity-50
        ${variantStyles[variant]}
        ${className}
      `}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
};
