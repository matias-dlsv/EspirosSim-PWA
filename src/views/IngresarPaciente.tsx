import { useState } from "react";
import { toast } from "react-hot-toast";
import { procesarNuevoPaciente } from "../utils/procesarPaciente";
import {
  usePacientStore,
  Paciente,
  DatosEspirometria,
} from "../store/pacientStore";
import { AppView } from "../App";
import { crearPacienteAleatorio } from "../utils/pacienteAleatorio";

interface Props {
  onBack: () => void;
  onNavigate: (view: AppView) => void;
}

const IconDice = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export default function IngresarPaciente({ onBack, onNavigate }: Props) {
  const [cargando, setCargando] = useState(false);
  const [cargandoAleatorio, setCargandoAleatorio] = useState(false);

  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [talla, setTalla] = useState("");
  const [raza, setRaza] = useState("");

  const addPaciente = usePacientStore((s) => s.addPaciente);
  const pacientes = usePacientStore((s) => s.pacientes);
  const seleccionarPaciente = usePacientStore((s) => s.seleccionarPaciente);

  const handleAleatorio = async () => {
    if (cargando || cargandoAleatorio) return;
    setCargandoAleatorio(true);
    try {
      const p = await crearPacienteAleatorio(
        addPaciente,
        seleccionarPaciente,
        pacientes,
      );
      toast.success(`Paciente: ${p.nombre}`, {
        duration: 2000,
        position: "bottom-right",
        style: { background: "#16a34a", color: "#fff" },
      });
      onNavigate("maniobra");
    } catch {
      toast.error("Error al generar paciente", {
        style: { background: "#CA3625", color: "#fff" },
      });
    } finally {
      setCargandoAleatorio(false);
    }
  };

  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !edad || !sexo || !talla || !raza) {
      toast.error("Completa todos los campos", {
        style: { background: "#CA3625", color: "#fff" },
      });
      return;
    }
    if (
      pacientes.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase())
    ) {
      toast.error("Este paciente ya existe", {
        style: { background: "#CA3625", color: "#fff" },
      });
      return;
    }
    const edadN = Number(edad),
      tallaN = Number(talla);
    if (edadN < 3 || edadN > 100) {
      toast.error("Edad inválida (3–100)");
      return;
    }
    if (tallaN < 20 || tallaN > 300) {
      toast.error("Talla inválida (20–300 cm)");
      return;
    }

    setCargando(true);
    try {
      const esp: DatosEspirometria = await procesarNuevoPaciente({
        nombre,
        edad: edadN,
        talla: tallaN,
        sexo,
        raza,
      });
      const nuevo: Paciente = {
        id: crypto.randomUUID(),
        nombre,
        edad: edadN,
        sexo,
        talla: tallaN,
        raza,
        fechaRegistro: new Date().toLocaleDateString(),
        espirometrias: [esp],
      };
      addPaciente(nuevo);
      seleccionarPaciente(nuevo.id);
      toast.success(`Paciente ${nombre} creado`, {
        duration: 2000,
        position: "bottom-right",
        style: { background: "#16a34a", color: "#fff" },
      });
      onNavigate("maniobra");
    } catch {
      toast.error("Error al procesar los datos", {
        style: { background: "#CA3625", color: "#fff" },
      });
    } finally {
      setCargando(false);
    }
  };

  const ocupado = cargando || cargandoAleatorio;

  return (
    <div style={s.page}>
      <header style={s.header}>
        <button onClick={onBack} style={s.backBtn}>
          ← Salir
        </button>
      </header>

      <div style={s.center}>
        <form onSubmit={handleManual} style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.cardTitle}>Nuevo Paciente</h2>
            <p style={s.cardSubtitle}>
              Ingresa los datos o genera uno aleatorio
            </p>
          </div>

          <Field label="Nombre">
            <input
              autoFocus
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              style={s.input}
            />
          </Field>

          <div style={s.row3}>
            <Field label="Edad">
              <div style={s.inputWrap}>
                <input
                  type="number"
                  placeholder="25"
                  value={edad}
                  onChange={(e) => setEdad(e.target.value)}
                  style={s.input}
                />
                <span style={s.unit}>años</span>
              </div>
            </Field>
            <Field label="Talla">
              <div style={s.inputWrap}>
                <input
                  type="number"
                  placeholder="170"
                  value={talla}
                  onChange={(e) => setTalla(e.target.value)}
                  style={s.input}
                />
                <span style={s.unit}>cm</span>
              </div>
            </Field>
          </div>

          <div style={s.row2}>
            <Field label="Sexo">
              <select
                value={sexo}
                onChange={(e) => setSexo(e.target.value)}
                style={s.select}
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </Field>
            <Field label="Raza / Etnia">
              <select
                value={raza}
                onChange={(e) => setRaza(e.target.value)}
                style={s.select}
              >
                <option value="">Seleccionar</option>
                <option value="Caucasico">Caucásico</option>
                <option value="Afrodescendiente">Afrodescendiente</option>
                <option value="Asiatico NE">Asiático (Noreste)</option>
                <option value="Asiatico SE">Asiático (Sureste)</option>
                <option value="Otra Raza / Etnia mixta">Otro / Mixto</option>
              </select>
            </Field>
          </div>

          <div style={s.divider} />

          <div style={s.btnRow}>
            <button
              type="button"
              onClick={handleAleatorio}
              disabled={ocupado}
              style={{ ...s.btnAleatorio, opacity: ocupado ? 0.5 : 1 }}
            >
              {cargandoAleatorio ? (
                "..."
              ) : (
                <>
                  <IconDice /> Aleatorio
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={ocupado}
              style={{ ...s.btnContinuar, opacity: ocupado ? 0.5 : 1 }}
            >
              {cargando ? "..." : "Continuar →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    height: "100vh",
    width: "100vw",
    background: "#ffffff",
    color: "#131E29",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, sans-serif",
    overflow: "hidden",
  },
  header: {
    padding: "14px 24px",
    borderBottom: "1px solid #D6D1CA",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
  },
  backBtn: {
    background: "transparent",
    border: "1px solid #D6D1CA",
    color: "#758592",
    padding: "6px 13px",
    borderRadius: 7,
    cursor: "pointer",
    fontSize: "0.82rem",
  },
  center: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    overflowY: "auto",
  },
  card: {
    width: "100%",
    maxWidth: 700,
    background: "#ffffff",
    border: "1px solid #CA3625",
    borderRadius: 16,
    padding: "28px 32px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  cardHeader: {
    paddingBottom: 14,
    borderBottom: "1px solid #D6D1CA",
  },
  cardTitle: {
    fontSize: "1rem",
    fontWeight: 700,
    color: "#131E29",
    margin: "0 0 3px 0",
  },
  cardSubtitle: {
    fontSize: "0.75rem",
    color: "#758592",
    margin: 0,
  },

  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  label: {
    fontSize: "0.67rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    color: "#758592",
  },
  inputWrap: { position: "relative" },
  input: {
    width: "100%",
    background: "#ffffff",
    color: "#131E29",
    border: "1px solid #CA3625",
    borderRadius: 7,
    padding: "9px 12px",
    fontSize: "0.88rem",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  select: {
    width: "100%",
    background: "#ffffff",
    color: "#131E29",
    border: "1px solid #CA3625",
    borderRadius: 7,
    padding: "9px 12px",
    fontSize: "0.88rem",
    outline: "none",
    boxSizing: "border-box" as const,
  },
  unit: {
    position: "absolute" as const,
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "0.7rem",
    color: "#758592",
    pointerEvents: "none" as const,
  },
  divider: { height: 1, background: "#D6D1CA" },
  btnRow: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: 10,
  },
  btnAleatorio: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    background: "rgba(138, 0, 26, 0.06)",
    color: "#8A001A",
    border: "1px solid rgba(138, 0, 26, 0.2)",
    borderRadius: 8,
    padding: "11px 14px",
    fontSize: "0.88rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnContinuar: {
    background: "#8A001A",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "11px 18px",
    fontSize: "0.9rem",
    fontWeight: 700,
    cursor: "pointer",
  },
};
