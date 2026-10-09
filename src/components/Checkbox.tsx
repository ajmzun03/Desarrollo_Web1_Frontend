// Checkbox.jsx
import { useId } from 'react';
import type { ChangeEvent } from 'react';

interface CheckboxProps {
  label: string;
  name?: string;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const Checkbox = ({ label, name, checked, onChange }: CheckboxProps) => {
  const inputId = useId();

  return (
    <div className="checkbox--group">
      <label htmlFor={inputId}>
        <input
          id={inputId}
          type="checkbox"
          name={name}
          checked={checked}
          onChange={onChange}
        />
        {label}
      </label>
    </div>
  );
};