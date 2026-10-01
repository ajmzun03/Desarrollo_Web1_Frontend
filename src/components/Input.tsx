import { useId } from 'react';

type InputProps = {
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
};

export const Input = ({ name = 'input', label, type = 'text', placeholder = 'Escribe algo...' }: InputProps) => {
  const inputId = useId(); // Genera un ID único para evitar duplicados en la página

  return (
    <div className="input--group">
      <label htmlFor={inputId}>{label ?? name}</label>
      <input id={inputId} type={type} name={name} placeholder={placeholder} />
    </div>
  );
};
