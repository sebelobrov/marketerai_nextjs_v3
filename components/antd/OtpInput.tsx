import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Input } from 'antd';

interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
}

interface OtpInputActions {
  clear(): void;
  focus(): void;
}

const OtpInput = forwardRef<OtpInputActions, OtpInputProps>(({
  length = 6,
  value: externalValue,
  onChange,
  autoFocus = false,
  className,
  style,
  disabled = false,
  size = 'middle',
}, ref) => {
  const inputRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(externalValue || '');
  
  // Эффект для синхронизации внешнего значения
  React.useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue);
    }
  }, [externalValue]);
  
  useImperativeHandle(ref, () => ({
    clear() {
      setValue('');
    },
    focus() {
      const input = inputRef.current?.querySelector('input') as HTMLInputElement;
      if (input) input.focus();
    }
  }), []);
  
  const handleChange = (val: string) => {
    setValue(val);
    onChange?.(val);
  };
  
  const formatter = (val: string) => val.replace(/[^0-9]/g, '');
  
  return (
    <div 
      className={className} 
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <div 
        ref={inputRef}
        style={{ display: 'flex', justifyContent: 'center', width: '100%' }}
      >
        <Input.OTP
          value={value}
          onChange={handleChange}
          length={length}
          autoFocus={autoFocus}
          disabled={disabled}
          size={size}
          formatter={formatter}
        />
      </div>
    </div>
  );
});

OtpInput.displayName = 'OtpInput';

export default OtpInput; 