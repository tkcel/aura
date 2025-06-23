import React from 'react';

export type ButtonVariant = 'primary' | 'danger' | 'ghost';
export type ButtonState = 'idle' | 'loading' | 'disabled';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  state?: ButtonState;
  size?: ButtonSize;
  children: React.ReactNode;
}

/**
 * Unified HUD-style button component
 */
export function Button({ 
  variant = 'ghost', 
  state = 'idle', 
  size = 'md',
  className = '',
  children,
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = "hud-btn";
  
  const variantClasses = {
    primary: "hud-btn-primary",
    danger: "hud-btn-danger", 
    ghost: ""
  };

  const stateClasses = {
    loading: "animate-pulse cursor-wait",
    disabled: "opacity-30 cursor-not-allowed",
    idle: ""
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-2", 
    lg: "text-base px-4 py-3"
  };

  const isDisabled = disabled || state === 'disabled' || state === 'loading';

  const combinedClasses = [
    baseClasses,
    variantClasses[variant],
    stateClasses[state],
    sizeClasses[size],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={combinedClasses}
      disabled={isDisabled}
      {...props}
    >
      {state === 'loading' ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}