import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { useId, useState } from 'react';

type InputProps = {
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
};

export const Input = ({ name = 'input', label, type = 'text', placeholder = 'Escribe algo...' }: InputProps) => {
  const inputId = useId(); // Genera un ID único para evitar duplicados en la página

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="input--group">
      <label htmlFor={inputId}>{label ?? name}</label>
      <span className="input--icon">
        {type === 'password' && <Lock />}
        {type === 'email' && <Mail />}
        <input
          id={inputId}
          type={type === 'password' && showPassword ? 'text' : type}
          name={name}
          placeholder={placeholder}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        )}
      </span>
    </div>
  );
};
