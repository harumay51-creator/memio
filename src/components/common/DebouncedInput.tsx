import React, { useState, useEffect, useRef } from 'react';

interface DebouncedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue: (val: string) => void;
  debounceMs?: number;
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({ 
  value, 
  onChangeValue, 
  debounceMs = 300, 
  className,
  ...props 
}) => {
  const [localVal, setLocalVal] = useState(value);
  const isComposing = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only update local value if we're not currently typing/composing
    // to avoid resetting the cursor or breaking composition.
    if (!isComposing.current && timerRef.current === null) {
      setLocalVal(value);
    }
  }, [value]);

  const triggerChange = (newVal: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChangeValue(newVal);
      timerRef.current = null;
    }, debounceMs);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalVal(newVal);
    if (!isComposing.current) {
      triggerChange(newVal);
    }
  };

  const handleCompositionStart = () => {
    isComposing.current = true;
  };

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement>) => {
    isComposing.current = false;
    // e.currentTarget.value contains the fully composed text
    const newVal = e.currentTarget.value;
    setLocalVal(newVal);
    triggerChange(newVal);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onChangeValue(localVal);
    }
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <input
      {...props}
      className={className}
      value={localVal}
      onChange={handleChange}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onBlur={handleBlur}
    />
  );
};
