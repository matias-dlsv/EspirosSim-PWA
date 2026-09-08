import { useState } from "react";
import "./App.css";
import { Toaster } from "react-hot-toast";
import "./tokens.css";

import WelcomeScreen from "./views/WelcomeScreen";
import CasosClinicos from "./views/CasosClinicos";
import IngresarPaciente from "./views/IngresarPaciente";
import Maniobra from "./views/Maniobra";
import Corregir from "./views/Corregir";
import Interpolacion from "./views/Interpolacion";
import Resultado from "./views/Resultado";
import { usePacientStore } from "./store/pacientStore";
import { CriteriosAceptabilidad } from "./utils/transformaciones";

export type AppView =
  | "welcome"
  | "custom"
  | "clinical"
  | "maniobra"
  | "corregir"
  | "interpolacion"
  | "resultado";

export interface NavigationPayload {
  datosFlujoVolumen: number[][];
  datosVolumenTiempo: number[][];
  indices: {
    fvc: number;
    fev1: number;
    fev1fvc: number;
    pef?: number;
  };
  volResidual?: number;
  idxInicioExhalacionForzada?: number;
  vbe?: number;
  criteriosGenerados?: CriteriosAceptabilidad; // ← nuevo
}

function App() {
  const [currentView, setCurrentView] = useState<AppView>("welcome");
  const [origenManiobra, setOrigenManiobra] = useState<AppView>("welcome");
  const [navigationData, setNavigationData] =
    useState<NavigationPayload | null>(null);

  // Leer faseActual del store para usarla como key en <Maniobra>
  // Esto fuerza el remontaje del componente al pasar de pre a post,
  // garantizando que useMemo se recalcule con los nuevos rangos Z.
  const faseActual = usePacientStore((state) => state.faseActual);

  const handleNavigate = (view: AppView, payload?: NavigationPayload) => {
    console.log(`[Nav] ${currentView} → ${view}`);
    if (view === "maniobra" && currentView !== "corregir") {
      setOrigenManiobra(currentView);
    }

    if (view === "maniobra") {
      setNavigationData(null);
    } else if (payload) {
      setNavigationData(payload);
    }

    setCurrentView(view);
  };

  return (
    <main className="dark text-zinc-100 bg-neutral-950 h-screen w-screen overflow-hidden font-sans">
      <Toaster
        position="bottom-right"
        toastOptions={{ style: { background: "#333", color: "#fff" } }}
      />

      {currentView === "welcome" && (
        <WelcomeScreen onNavigate={handleNavigate} />
      )}

      {currentView === "custom" && (
        <IngresarPaciente
          onBack={() => setCurrentView("welcome")}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "clinical" && (
        <CasosClinicos
          onBack={() => setCurrentView("welcome")}
          onNavigate={handleNavigate}
        />
      )}

      {/* key={faseActual} fuerza remontaje al cambiar pre → post */}
      {currentView === "maniobra" && (
        <Maniobra
          key={faseActual}
          onBack={() => setCurrentView(origenManiobra)}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "corregir" && (
        <Corregir
          onBack={() => setCurrentView("maniobra")}
          onNavigate={handleNavigate}
          data={navigationData}
        />
      )}

      {currentView === "interpolacion" && (
        <Interpolacion
          onBack={() => setCurrentView("maniobra")}
          onNavigate={handleNavigate}
        />
      )}

      {currentView === "resultado" && (
        <Resultado
          onBack={() => setCurrentView("interpolacion")}
          onNavigate={handleNavigate}
        />
      )}
    </main>
  );
}

export default App;
