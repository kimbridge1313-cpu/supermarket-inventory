import * as React from 'react';
import { cn } from '../../lib';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('input', className)} {...props} />
));
Input.displayName = 'Input';
