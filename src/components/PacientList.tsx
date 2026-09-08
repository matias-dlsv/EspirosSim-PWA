import { usePacientStore } from "../store/pacientStore";
// Importamos tu componente individual (equivalente a SnippetItem)
import PacientItem from "./PacientItem";

function PacientList() {
  // El store (pacientStore.ts) ahora persiste solo en localStorage vía el
  // middleware `persist` de Zustand — no hace falta cargar nada a mano
  // aquí (antes esto leía "pacientes_db.json" con @tauri-apps/plugin-fs).
  const pacientes = usePacientStore((state) => state.pacientes);

  if (pacientes.length === 0) {
    return <p className="text-white p-4">No hay pacientes registrados.</p>;
  }

  return (
    <div className="grid gap-2 p-2">
      {/* Aquí está la diferencia clave con el video:
         El video mapeaba nombres de archivo (strings).
         Tú mapeas OBJETOS completos con id, nombre, edad, etc.
      */}
      {[...pacientes].reverse().map((paciente) => (
        <PacientItem key={paciente.id} paciente={paciente} />
      ))}
    </div>
  );
}

export default PacientList;
