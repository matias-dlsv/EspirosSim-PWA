import { useState } from "react";
import { usePacientStore } from "../store/pacientStore";
import { CASOS_CLINICOS } from "../utils/transformaciones";
import { AppView } from "../App";
import { crearPacienteAleatorio } from "../utils/pacienteAleatorio";
import { toast } from "react-hot-toast";

interface Props {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

// Descripción clínica simplificada para cada caso (sin datos de BD)
const META_CASOS: {
  descripcion: string;
}[] = [
  {
    descripcion: "Espirometría dentro de rangos normales",
  },
  {
    descripcion: "Obstrucción reversible · patrón inflamatorio",
  },
  {
    descripcion: "Obstrucción fija · daño estructural permanente",
  },
  {
    descripcion: "Restricción extrapulmonar · deformidad torácica",
  },
  {
    descripcion: "Restricción postquirúrgica · reducción de volumen",
  },
];

export default function CasosClinicos({ onBack, onNavigate }: Props) {
  const setPatron = usePacientStore((state) => state.setPatron);
  const addPaciente = usePacientStore((state) => state.addPaciente);
  const seleccionarPaciente = usePacientStore(
    (state) => state.seleccionarPaciente,
  );
  const pacientes = usePacientStore((state) => state.pacientes);
  const setOrigenCasoClinico = usePacientStore(
    (state) => state.setOrigenCasoClinico,
  );

  const [cargando, setCargando] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState<number | null>(null);

  const seleccionarCaso = async (indice: number) => {
    if (cargando) return;
    setCargando(true);
    setCasoSeleccionado(indice);

    try {
      const paciente = await crearPacienteAleatorio(
        addPaciente,
        seleccionarPaciente,
        pacientes,
      );

      setPatron(CASOS_CLINICOS[indice]);
      setOrigenCasoClinico(true);

      toast.success(`Paciente: ${paciente.nombre}`, {
        duration: 2500,
        position: "bottom-right",
        style: { background: "#16a34a", color: "#ffffff" },
      });

      onNavigate("maniobra");
    } catch (err) {
      console.error("Error al crear paciente aleatorio:", err);
      toast.error("Error al generar el paciente", {
        style: { background: "#CA3625", color: "#ffffff" },
      });
    } finally {
      setCargando(false);
      setCasoSeleccionado(null);
    }
  };

  return (
    <div
      className="h-full flex flex-col items-center justify-center relative px-8"
      style={{ backgroundColor: "#ffffff", color: "#131E29" }}
    >
      <button
        onClick={onBack}
        disabled={cargando}
        className="absolute top-6 left-6 transition disabled:opacity-40"
        style={{
          color: "#758592",
          border: "1px solid #D6D1CA",
          padding: "7px 14px",
          borderRadius: "6px",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.85rem",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#131E29";
          e.currentTarget.style.borderColor = "#415364";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#758592";
          e.currentTarget.style.borderColor = "#D6D1CA";
        }}
      >
        ← Volver al menú
      </button>

      <h2 className="text-2xl font-bold mb-2" style={{ color: "#131E29" }}>
        Casos Clínicos
      </h2>

      <p
        className="text-sm mb-8 text-center max-w-sm"
        style={{ color: "#415364" }}
      >
        Se generará un paciente aleatorio con los índices correspondientes al
        patrón elegido.
      </p>

      <div className="grid grid-cols-1 gap-4 w-full max-w-md">
        {CASOS_CLINICOS.map((caso, i) => {
          const estaCargando = cargando && casoSeleccionado === i;
          const meta = META_CASOS[i];

          return (
            <button
              key={caso.nombre}
              onClick={() => seleccionarCaso(i)}
              disabled={cargando}
              className="flex items-center justify-between text-left px-6 py-4 rounded-xl transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #8A001A",
                color: "#8A001A",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(138, 0, 26, 0.05)";
                e.currentTarget.style.borderColor = "#CE0019";
                e.currentTarget.style.color = "#CE0019";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "#8A001A";
                e.currentTarget.style.color = "#8A001A";
              }}
            >
              <div>
                <p className="font-semibold" style={{ color: "inherit" }}>
                  {caso.nombre}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "#131E29", opacity: 1 }}
                >
                  {meta.descripcion}
                </p>
              </div>

              <span
                className="text-lg w-6 flex justify-center"
                style={{ color: "inherit" }}
              >
                {estaCargando ? (
                  <span className="animate-spin inline-block">⟳</span>
                ) : (
                  <span className="opacity-0 group-hover:opacity-100 transition">
                    →
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
