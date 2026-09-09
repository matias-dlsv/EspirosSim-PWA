import styles from "./Resultado.module.css";
import { AppView, NavigationPayload } from "../App";
import { usePacientStore, ManiobraGuardada } from "../store/pacientStore";
import { useMemo, useState } from "react";
import TooltipTerm from "../components/ToolTipTerm.tsx";
import HistoriaClinica from "../components/HistoriaClinica.tsx";

interface ResultadoProps {
  onBack: () => void;
  onNavigate: (view: AppView, payload?: NavigationPayload) => void;
}

const COLORES = ["#3b82f6", "#10b981", "#f59e0b"];

// ============================================================
// Z-SCORE (método LMS — GLI 2012)
// ============================================================
const calcularZScore = (
  yObs: number,
  m: number,
  l: number,
  s: number,
): number => {
  if (m <= 0 || s <= 0) return NaN;
  if (Math.abs(l) < 1e-10) return Math.log(yObs / m) / s;
  return (Math.pow(yObs / m, l) - 1) / (l * s);
};

// ============================================================
// HELPERS EVALUACIÓN
// ============================================================
type Fila = {
  variable: string;
  unidad: string;
  real: number;
  realPost?: number;
  teorico: number;
  mls: { m: number; l: number; s: number };
  esRatio?: boolean;
};

const esPatronCorrecto = (seleccion: string | null, filas: Fila[]): boolean => {
  const fvcFila = filas.find((f) => f.variable === "FVC");
  const fev1fvcFila = filas.find((f) => f.variable === "FEV1/FVC");
  if (!fvcFila || !fev1fvcFila) return false;
  const zFvc = calcularZScore(
    fvcFila.real,
    fvcFila.mls.m,
    fvcFila.mls.l,
    fvcFila.mls.s,
  );
  const zRatio = calcularZScore(
    fev1fvcFila.real,
    fev1fvcFila.mls.m,
    fev1fvcFila.mls.l,
    fev1fvcFila.mls.s,
  );
  const esObstructivo = zRatio < -1.645;
  const esRestrictivo = !esObstructivo && zFvc < -1.645;
  const esNormal = !esObstructivo && !esRestrictivo;
  if (seleccion === "Normal") return esNormal;
  if (seleccion === "Obstructivo") return esObstructivo;
  if (seleccion === "Restrictivo") return esRestrictivo;
  return false;
};

const esSeveridadCorrecta = (
  seleccion: string | null,
  filas: Fila[],
): boolean => {
  const fvcFila = filas.find((f) => f.variable === "FVC");
  const fev1Fila = filas.find((f) => f.variable === "FEV1");
  const fev1fvcFila = filas.find((f) => f.variable === "FEV1/FVC");
  if (!fvcFila || !fev1Fila || !fev1fvcFila) return false;
  const zRatio = calcularZScore(
    fev1fvcFila.real,
    fev1fvcFila.mls.m,
    fev1fvcFila.mls.l,
    fev1fvcFila.mls.s,
  );
  const esObstructivo = zRatio < -1.645;
  const zRef = esObstructivo
    ? calcularZScore(
        fev1Fila.real,
        fev1Fila.mls.m,
        fev1Fila.mls.l,
        fev1Fila.mls.s,
      )
    : calcularZScore(fvcFila.real, fvcFila.mls.m, fvcFila.mls.l, fvcFila.mls.s);
  if (seleccion === "Leve") return zRef >= -2.5 && zRef < -1.645;
  if (seleccion === "Moderado") return zRef >= -4.0 && zRef < -2.5;
  if (seleccion === "Grave") return zRef < -4.0;
  return false;
};

const esRespuestaBDCorrecta = (
  seleccion: string | null,
  filas: Fila[],
): boolean => {
  const fvcFila = filas.find((f) => f.variable === "FVC");
  const fev1Fila = filas.find((f) => f.variable === "FEV1");
  if (!fvcFila || !fev1Fila || !fvcFila.realPost || !fev1Fila.realPost)
    return false;
  const deltaFvc = ((fvcFila.realPost - fvcFila.real) / fvcFila.teorico) * 100;
  const deltaFev1 =
    ((fev1Fila.realPost - fev1Fila.real) / fev1Fila.teorico) * 100;
  const responde = deltaFvc >= 10 || deltaFev1 >= 10;
  return seleccion === "Sí responde" ? responde : !responde;
};

// ============================================================
// FEEDBACK LINEA
// ============================================================
const FeedbackLinea = ({
  label,
  correcto,
  respuesta,
}: {
  label: string;
  correcto: boolean;
  respuesta: string;
}) => (
  <div className={styles.feedbackLinea}>
    <span className={styles.feedbackLabel}>{label}:</span>
    <span className={styles.feedbackRespuesta}>{respuesta}</span>
    <span className={correcto ? styles.feedbackOk : styles.feedbackError}>
      {correcto ? "✓ Correcto" : "✗ Incorrecto"}
    </span>
  </div>
);

// ============================================================
// HELPERS
// ============================================================
const encontrarMejor = (
  maniobras: ManiobraGuardada[],
): ManiobraGuardada | null => {
  if (maniobras.length === 0) return null;
  return maniobras.reduce((mejor, actual) => {
    const sumaActual = (actual.indices?.fvc ?? 0) + (actual.indices?.fev1 ?? 0);
    const sumaMejor = (mejor.indices?.fvc ?? 0) + (mejor.indices?.fev1 ?? 0);
    return sumaActual > sumaMejor ? actual : mejor;
  });
};

export default function Resultado({ onBack, onNavigate }: ResultadoProps) {
  const pacienteActual = usePacientStore((state) => state.pacienteSeleccionado);
  const patronActivo = usePacientStore((state) => state.patronActivo);
  const faseActual = usePacientStore((state) => state.faseActual);
  const origenCasoClinico = usePacientStore((state) => state.origenCasoClinico);

  const maniobrasPreRaw = pacienteActual?.espirometrias?.[0]?.maniobras ?? [];
  const maniobrasPostRaw =
    pacienteActual?.espirometrias?.[0]?.maniobrasPost ?? [];
  const parametros = pacienteActual?.espirometrias?.[0]?.parametros ?? null;

  const fvcMLS = parametros?.fvc ?? { m: 0, l: 0, s: 1 };
  const fev1MLS = parametros?.fev1 ?? { m: 0, l: 0, s: 1 };
  const fev1fvcMLS = parametros?.fev1fvc ?? { m: 0, l: 0, s: 1 };

  const mejorPre = useMemo(
    () => encontrarMejor(maniobrasPreRaw),
    [maniobrasPreRaw],
  );
  const mejorPost = useMemo(
    () => encontrarMejor(maniobrasPostRaw),
    [maniobrasPostRaw],
  );

  const indicePreActual = maniobrasPreRaw.indexOf(mejorPre!);
  const indicePostActual = maniobrasPostRaw.indexOf(mejorPost!);
  const indiceActual =
    faseActual === "pre" ? indicePreActual : indicePostActual;
  const colorMejor = COLORES[indiceActual % COLORES.length];

  const hayPost = maniobrasPostRaw.length > 0 && mejorPost;

  const filas: Fila[] = mejorPre
    ? [
        {
          variable: "FVC",
          unidad: "L",
          real: mejorPre.indices?.fvc ?? fvcMLS.m,
          realPost: mejorPost?.indices?.fvc,
          teorico: fvcMLS.m,
          mls: fvcMLS,
        },
        {
          variable: "FEV1",
          unidad: "L",
          real: mejorPre.indices?.fev1 ?? fev1MLS.m,
          realPost: mejorPost?.indices?.fev1,
          teorico: fev1MLS.m,
          mls: fev1MLS,
        },
        {
          variable: "FEV1/FVC",
          unidad: "%",
          real: mejorPre.indices?.fev1fvc ?? fev1fvcMLS.m,
          realPost: mejorPost?.indices?.fev1fvc,
          teorico: fev1fvcMLS.m,
          mls: fev1fvcMLS,
          esRatio: true,
        },
      ]
    : [];

  const pefPre = mejorPre?.indices?.pef ?? null;
  const pefPost = mejorPost?.indices?.pef ?? null;

  const formatear = (val: number, esRatio?: boolean, unidad?: string) =>
    esRatio ? `${(val * 100).toFixed(1)}%` : `${val.toFixed(2)} ${unidad}`;

  // ── Evaluación ────────────────────────────────────────────
  const [patronSeleccionado, setPatronSeleccionado] = useState<string | null>(
    null,
  );
  const [severidadSeleccionada, setSeveridadSeleccionada] = useState<
    string | null
  >(null);
  const [respuestaBDSeleccionada, setRespuestaBDSeleccionada] = useState<
    string | null
  >(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);

  const puedeVerificar =
    !!patronSeleccionado &&
    (patronSeleccionado === "Normal" || !!severidadSeleccionada) &&
    (!hayPost || !!respuestaBDSeleccionada);

  // ── Estado vacío ──────────────────────────────────────────
  if (!mejorPre) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <h2>No hay maniobras disponibles</h2>
          <button onClick={onBack} className={styles.salbutamolBtn}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={onBack} className={styles.backBtn}>
          ← Volver
        </button>
        <div>
          <h1>
            Resultado{" "}
            {faseActual === "post"
              ? "Post-Broncodilatador"
              : "Pre-Broncodilatador"}
          </h1>
          {pacienteActual && (
            <>
              <span className={styles.patientName}>
                {pacienteActual.nombre}
              </span>
              {(pacienteActual.edad || pacienteActual.sexo) && (
                <span className={styles.patientMeta}>
                  {pacienteActual.edad && `${pacienteActual.edad} años`}
                  {pacienteActual.edad && pacienteActual.sexo && " · "}
                  {pacienteActual.sexo}
                </span>
              )}
            </>
          )}
          {patronActivo && (
            <span className={styles.patronBadge}>{patronActivo.nombre}</span>
          )}
        </div>

        <div className={styles.mejorBadgeHeader}>
          <span className={styles.mejorLabel}>Mejor maniobra</span>
          <span className={styles.mejorNumero} style={{ color: colorMejor }}>
            {faseActual === "pre"
              ? `M${indicePreActual + 1}`
              : `M${indicePostActual + 1}`}
          </span>
        </div>
      </header>

      <main className={styles.content}>
        {origenCasoClinico && (
          <div className={styles.historiaWrapper}>
            <HistoriaClinica
              patronNombre={patronActivo?.nombre}
              semilla={pacienteActual?.id ?? pacienteActual?.nombre}
            />
          </div>
        )}

        <section className={styles.tableSection}>
          <table className={styles.resultsTable}>
            <thead>
              <tr>
                <th>Variable</th>
                <th>Teo</th>
                <th>Pre-BD</th>
                <th>%Teo</th>
                <th>
                  <TooltipTerm term="Z-score">Z-Pre</TooltipTerm>
                </th>
                {hayPost && <th>Post-BD</th>}
                {hayPost && <th>%Teo</th>}
                {hayPost && (
                  <th>
                    <TooltipTerm term="Z-score">Z-Post</TooltipTerm>
                  </th>
                )}
                {hayPost && <th>%Cambio</th>}
              </tr>
            </thead>
            <tbody>
              {filas.map(
                ({
                  variable,
                  unidad,
                  real,
                  realPost,
                  teorico,
                  mls,
                  esRatio,
                }) => {
                  const pctPre = teorico > 0 ? (real / teorico) * 100 : 0;
                  const pctPost =
                    realPost && teorico > 0 ? (realPost / teorico) * 100 : null;
                  const pctPrePost =
                    realPost != null && teorico > 0
                      ? ((realPost - real) / teorico) * 100
                      : null;
                  const zPre = calcularZScore(real, mls.m, mls.l, mls.s);
                  const zPost = realPost
                    ? calcularZScore(realPost, mls.m, mls.l, mls.s)
                    : NaN;

                  return (
                    <tr key={variable}>
                      <td className={styles.variableCell}>
                        {variable === "FVC" ||
                        variable === "FEV1" ||
                        variable === "FEV1/FVC" ? (
                          <TooltipTerm
                            term={variable as "FVC" | "FEV1" | "FEV1/FVC"}
                          />
                        ) : (
                          variable
                        )}
                      </td>
                      <td className={styles.teoricoCell}>
                        {formatear(teorico, esRatio, unidad)}
                      </td>
                      <td className={styles.realCell}>
                        {formatear(real, esRatio, unidad)}
                      </td>
                      <td className={styles.teoricoCell}>
                        {pctPre.toFixed(1)}%
                      </td>
                      <td className={styles.teoricoCell}>
                        {isNaN(zPre) ? "—" : zPre.toFixed(2)}
                      </td>
                      {hayPost && (
                        <td className={styles.postCell}>
                          {realPost
                            ? formatear(realPost, esRatio, unidad)
                            : "—"}
                        </td>
                      )}
                      {hayPost && (
                        <td className={styles.teoricoCell}>
                          {pctPost !== null ? `${pctPost.toFixed(1)}%` : "—"}
                        </td>
                      )}
                      {hayPost && (
                        <td className={styles.teoricoCell}>
                          {realPost
                            ? isNaN(zPost)
                              ? "—"
                              : zPost.toFixed(2)
                            : "—"}
                        </td>
                      )}
                      {hayPost && (
                        <td className={styles.teoricoCell}>
                          {pctPrePost !== null
                            ? `${pctPrePost.toFixed(1)}%`
                            : "—"}
                        </td>
                      )}
                    </tr>
                  );
                },
              )}

              {/* PEF — sin LIN ni Z-score */}
              {pefPre != null && (
                <tr>
                  <td className={styles.variableCell}>
                    <TooltipTerm term="PEF" />
                  </td>
                  <td className={styles.teoricoCell}>—</td>
                  <td className={styles.realCell}>{pefPre.toFixed(2)} L/s</td>
                  <td className={styles.teoricoCell}>—</td>
                  <td>—</td>
                  {hayPost && (
                    <td className={styles.postCell}>
                      {pefPost != null ? `${pefPost.toFixed(2)} L/s` : "—"}
                    </td>
                  )}
                  {hayPost && <td>—</td>}
                  {hayPost && <td>—</td>}
                  {hayPost && <td>—</td>}
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <div className={styles.zscoreLegend}>
          <span className={styles.legendTitle}>
            <TooltipTerm term="Z-score">Z-score (GLI 2012):</TooltipTerm>
          </span>
          <span style={{ color: "#10b981" }}>≥ −1.64 Normal</span>
          <span style={{ color: "#f59e0b" }}>−2.5 a −1.64 Leve ↓</span>
          <span style={{ color: "#f97316" }}>−4.0 a −2.5 Moderado ↓</span>
          <span style={{ color: "#ef4444" }}>&lt; −4.0 Grave ↓</span>
        </div>

        {/* ── Evaluación ── */}
        <section className={styles.evaluacionSection}>
          <span className={styles.evaluacionTitulo}>Interpretación</span>

          <div className={styles.evaluacionGrupo}>
            <span className={styles.evaluacionLabel}>Patrón</span>
            <div className={styles.evaluacionOpciones}>
              {["Normal", "Obstructivo", "Restrictivo"].map((op) => (
                <button
                  key={op}
                  onClick={() => {
                    setPatronSeleccionado(op);
                    if (op === "Normal") setSeveridadSeleccionada(null);
                    setMostrarResultado(false);
                  }}
                  className={`${styles.opcionBtn} ${patronSeleccionado === op ? styles.opcionBtnActivo : ""}`}
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          {patronSeleccionado && patronSeleccionado !== "Normal" && (
            <div className={styles.evaluacionGrupo}>
              <span className={styles.evaluacionLabel}>Severidad</span>
              <div className={styles.evaluacionOpciones}>
                {["Leve", "Moderado", "Grave"].map((op) => (
                  <button
                    key={op}
                    onClick={() => {
                      setSeveridadSeleccionada(op);
                      setMostrarResultado(false);
                    }}
                    className={`${styles.opcionBtn} ${severidadSeleccionada === op ? styles.opcionBtnActivo : ""}`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hayPost && (
            <div className={styles.evaluacionGrupo}>
              <span className={styles.evaluacionLabel}>
                Respuesta broncodilatadora
              </span>
              <div className={styles.evaluacionOpciones}>
                {["Sí responde", "No responde"].map((op) => (
                  <button
                    key={op}
                    onClick={() => {
                      setRespuestaBDSeleccionada(op);
                      setMostrarResultado(false);
                    }}
                    className={`${styles.opcionBtn} ${respuestaBDSeleccionada === op ? styles.opcionBtnActivo : ""}`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            className={styles.verificarBtn}
            disabled={!puedeVerificar}
            onClick={() => setMostrarResultado(true)}
          >
            Verificar
          </button>

          {mostrarResultado && (
            <div className={styles.feedbackBox}>
              <FeedbackLinea
                label="Patrón"
                correcto={esPatronCorrecto(patronSeleccionado, filas)}
                respuesta={patronSeleccionado!}
              />
              {patronSeleccionado !== "Normal" && (
                <FeedbackLinea
                  label="Severidad"
                  correcto={esSeveridadCorrecta(severidadSeleccionada, filas)}
                  respuesta={severidadSeleccionada!}
                />
              )}
              {hayPost && (
                <FeedbackLinea
                  label="Respuesta BD"
                  correcto={esRespuestaBDCorrecta(
                    respuestaBDSeleccionada,
                    filas,
                  )}
                  respuesta={respuestaBDSeleccionada!}
                />
              )}
            </div>
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        {faseActual === "pre" && (
          <button
            className={styles.salbutamolBtn}
            onClick={() => {
              usePacientStore.getState().setFase("post");
              onNavigate("maniobra");
            }}
          >
            Salbutamol →
          </button>
        )}
        <button
          onClick={() => {
            usePacientStore.getState().setOrigenCasoClinico(false);
            usePacientStore.getState().setFase("pre");
            onNavigate("welcome");
          }}
          className={styles.finalizarBtn}
        >
          Finalizar
        </button>
      </footer>
    </div>
  );
}
