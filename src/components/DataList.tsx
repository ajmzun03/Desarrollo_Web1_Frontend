import { useId } from "react";

export const DataList = ({ data = [] }: { data?: string[] }) => {
  const inputId = useId(); // Genera un ID único para evitar duplicados en la página

  return (
    <div className="datalist--group">
      <label htmlFor={inputId}>Rol de acceso</label>
      <input list="roles" name="rol" id={inputId} />

      <datalist id="roles">
        {data.map((role, index) => (
          <option key={index} value={role} />
        ))}
      </datalist>
    </div>
  );
};
