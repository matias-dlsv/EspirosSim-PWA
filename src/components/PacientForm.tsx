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
import styles from "./PacientForm.module.css";

interface PacientFormProps {
  onNavigate: (view: AppView) => void;
}

function PacientForm({ onNavigate }: PacientFormProps) {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [sexo, setSexo] = useState("");
  const [talla, setTalla] = useState("");
  const [raza, setRaza] = useState("");
  const [cargandoAleatorio, setCargandoAleatorio] = useState(false);

  const addPaciente = usePacientStore((state) => state.addPaciente);
  const pacientes = usePacientStore((state) => state.pacientes);
  const seleccionarPaciente = usePacientStore(
    (state) => state.seleccionarPaciente,
  );

  const validar = (): string | null => {
    if (!nombre.trim() || !edad || !sexo || !talla || !raza)
      return "Por favor completa todos los campos";
    if (pacientes.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase()))
      return "Este paciente ya existe";
    const edadNum = Number(edad);
    const tallaNum = Number(talla);

    if (isNaN(edadNum) || edadNum < 3 || edadNum > 100)
      return "Edad inválida (3–100)";
    if (isNaN(tallaNum) || tallaNum < 20 || tallaNum > 300)
      return "Talla inválida en cm (20–300)";
    return null;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const mensajeError = validar();
    if (mensajeError) {
      toast.error(mensajeError, {
        style: { background: "#1a1a1a", color: "#fff" },
      });
      return;
    }
    const edadNum = Number(edad);
    const tallaNum = Number(talla);
    try {
      const espirometriaDefault: DatosEspirometria = await procesarNuevoPaciente({
        nombre,
        edad: edadNum,
        talla: tallaNum,
        sexo,
        raza,
      });
      const nuevoPaciente: Paciente = {
        id: crypto.randomUUID(),
        nombre,
        edad: edadNum,
        sexo,
        talla: tallaNum,
        raza,
        fechaRegistro: new Date().toLocaleDateString(),
        espirometrias: [espirometriaDefault],
      };
      addPaciente(nuevoPaciente);
      seleccionarPaciente(nuevoPaciente.id);
      toast.success(`Paciente ${nombre} creado`, {
        duration: 2000,
        position: "bottom-right",
        style: { background: "#1a1a1a", color: "#fff" },
      });
      onNavigate("maniobra");
    } catch (err) {
      console.error(err);
      toast.error("Error al procesar los datos");
    }
  };

  const handleAleatorio = async () => {
    if (cargandoAleatorio) return;
    setCargandoAleatorio(true);
    try {
      const paciente = await crearPacienteAleatorio(
        addPaciente,
        seleccionarPaciente,
        pacientes,
      );
      toast.success(`Paciente: ${paciente.nombre}`, {
        duration: 2000,
        position: "bottom-right",
        style: { background: "#1a1a1a", color: "#fff" },
      });
      onNavigate("maniobra");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar paciente aleatorio");
    } finally {
      setCargandoAleatorio(false);
    }
  };

  return (
    <div className={styles.formWrapper}>
      {/* Columna izquierda: formulario manual */}
      <form onSubmit={onSubmit} className={styles.formCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>✦</div>
          <div>
            <h2 className={styles.cardTitle}>Paciente Manual</h2>
            <p className={styles.cardSubtitle}>
              Ingresa los datos del paciente
            </p>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Nombre completo</label>
          <input
            type="text"
            placeholder="Ej: Juan Pérez"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
            className={styles.input}
          />
        </div>

        <div className={styles.row}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Edad</label>
            <input
              type="number"
              placeholder="años"
              value={edad}
              onChange={(e) => setEdad(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Sexo</label>
            <select
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
              className={styles.input}
            >
              <option value="">Seleccionar</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </div>
        </div>

        <div className={styles.row}>
  <div className={styles.fieldGroup}>
    <label className={styles.label}>Talla (cm)</label>
    <input
      type="number"
      placeholder="cm"
      value={talla}
      onChange={(e) => setTalla(e.target.value)}
      className={styles.input}
    />
  </div>
</div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>Raza / Etnia</label>
          <select
            value={raza}
            onChange={(e) => setRaza(e.target.value)}
            className={styles.input}
          >
            <option value="">Seleccionar</option>
            <option value="Caucasico">Caucásico</option>
            <option value="Afrodescendiente">Afrodescendiente</option>
            <option value="Asiatico NE">Asiático (Noreste)</option>
            <option value="Asiatico SE">Asiático (Sureste)</option>
            <option value="Otra Raza / Etnia mixta">Otro / Mixto</option>
          </select>
        </div>

        <button type="submit" className={styles.submitBtn}>
          Continuar →
        </button>
      </form>

      {/* Divisor */}
      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>o</span>
        <div className={styles.dividerLine} />
      </div>

      {/* Columna derecha: aleatorio */}
      <div className={styles.randomCard}>
        <div className={styles.randomGlow} />
        <div className={styles.cardHeader}>
          <div className={styles.cardIconRandom}>⟳</div>
          <div>
            <h2 className={styles.cardTitle}>Paciente Aleatorio</h2>
            <p className={styles.cardSubtitle}>
              Genera un paciente con datos realistas
            </p>
          </div>
        </div>

        <div className={styles.randomFeatures}>
          {[
            ["Nombre", "Generado aleatoriamente"],
            ["Edad", "18 – 75 años"],
            ["Sexo", "Masculino / Femenino"],
            ["Talla", "Según sexo y distribución real"],
            ["Raza / Etnia", "Con proporciones poblacionales"],
            ["Índices GLI", "Calculados desde tablas GLI 2012"],
          ].map(([key, val]) => (
            <div key={key} className={styles.featureRow}>
              <span className={styles.featureKey}>{key}</span>
              <span className={styles.featureVal}>{val}</span>
            </div>
          ))}
        </div>

        <button
          onClick={handleAleatorio}
          disabled={cargandoAleatorio}
          className={styles.randomBtn}
        >
          {cargandoAleatorio ? (
            <span className={styles.spinner}>⟳</span>
          ) : (
            "Generar y continuar →"
          )}
        </button>
      </div>
    </div>
  );
}

export default PacientForm;
