import { useEffect, useState } from "react";
import { getCookie } from "../utils/cookies";

const API_URL = 'https://desarrollo-web1-backend.onrender.com';

type Usuario = {
    id: number;
    usuario: String;
    correo_electronico: String;
    rol: String;
    creado_en: String;
}

export default function Usuarios(){
    //estados de listas o errores
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    //Se ejecuta una vez cuando el componente esta en la pantalla

    useEffect(()=> {
        const token = getCookie('token');

        fetch(`${API_URL}/usuarios`, {
            headers: {
                Authorization: `Bearer ${token}` // Agrega el token de autenticación en el encabezado
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error){
                setError(data.error);//Sale este error cuando no esta el token
            } else{
                setUsuarios(data.data);
            }
        }
        )
        .catch(()=> setError('No se pudo conectar con el server de minecraft'))
        .finally(()=> setCargando(false));
    },[]);

    if (cargando) return <p>Cargando usuarios...</p>;
    if (error) return <p>Error: {error}</p>

    return (
        <section>
            <h2>Usuarios</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Correo Electrónico</th>
                        <th>Rol</th>
                    </tr>
                </thead>
                <tbody>
                    {usuarios.map(u=>(
                        <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.usuario}</td>
                            <td>{u.correo_electronico}</td>
                            <td>{u.rol}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}