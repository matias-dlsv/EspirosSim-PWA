import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PatronClinico } from "../utils/transformaciones";

export interface ValoresMLS {
  m: number;
  l: number;
  s: number;
}

export interface ParametrosEspirometria {
  fvc: ValoresMLS;
  fev1: ValoresMLS;
  fev1fvc: ValoresMLS;
}

export interface ManiobraGuardada {
  id?: number;
  color?: string;
  datosFlujoVolumen: number[][];
  datosVolumenTiempo: number[][];
  criterios: {
    vtestables: boolean;
    esfuerzomaximo: boolean;
    volumenextrapolado: boolean;
    pefcontinuo: boolean;
    tiempoespiracion: boolean;
  };
  fecha: string;
  indices?: {
    fvc: number;
    fev1: number;
    fev1fvc: number;
    pef?: number;
  };
}

export interface DatosEspirometria {
  parametros: ParametrosEspirometria;
  curva_generada: number[];
  fecha: string;
  maniobras?: ManiobraGuardada[];
  maniobrasPost?: ManiobraGuardada[];
}

export interface Paciente {
  id: string;
  nombre: string;
  edad: number;
  sexo: string;
  talla: number;
  raza: string;
  fechaRegistro: string;
  espirometrias: DatosEspirometria[];
}

interface PacientState {
  pacientes: Paciente[];
  pacienteSeleccionado: Paciente | null;
  faseActual: "pre" | "post";
  origenCasoClinico: boolean;
  patronActivo: PatronClinico | null;

  setFase: (fase: "pre" | "post") => void;
  setOrigenCasoClinico: (valor: boolean) => void;
  addPaciente: (paciente: Paciente) => void;
  setPacientes: (pacientes: Paciente[]) => void;
  seleccionarPaciente: (id: string) => void;
  guardarManiobra: (pacienteId: string, maniobra: ManiobraGuardada) => void;
  setPatron: (patron: PatronClinico | null) => void;
  getMejorPre: () => { fvc: number; fev1: number } | null;
}

export const usePacientStore = create<PacientState>()(
  persist(
    (set, get) => ({
  pacientes: [],
  pacienteSeleccionado: null,
  patronActivo: null,
  faseActual: "pre",
  origenCasoClinico: false,

  setFase: (fase) => set(() => ({ faseActual: fase })),
  setOrigenCasoClinico: (valor) => set(() => ({ origenCasoClinico: valor })),

  addPaciente: (paciente) =>
    set((state) => ({
      pacientes: [...state.pacientes, paciente],
    })),

  setPacientes: (nuevosPacientes) =>
    set(() => ({
      pacientes: nuevosPacientes,
    })),

  seleccionarPaciente: (id) =>
    set((state) => ({
      pacienteSeleccionado: state.pacientes.find((p) => p.id === id) ?? null,
    })),

  setPatron: (patron) => set(() => ({ patronActivo: patron })),

  getMejorPre: () => {
    const state = get();
    const maniobras =
      state.pacienteSeleccionado?.espirometrias?.[0]?.maniobras ?? [];
    if (maniobras.length === 0) return null;
    const mejor = maniobras.reduce((a, b) => {
      const sA = (a.indices?.fvc ?? 0) + (a.indices?.fev1 ?? 0);
      const sB = (b.indices?.fvc ?? 0) + (b.indices?.fev1 ?? 0);
      return sB > sA ? b : a;
    });
    return mejor.indices
      ? { fvc: mejor.indices.fvc, fev1: mejor.indices.fev1 }
      : null;
  },

  guardarManiobra: (pacienteId, maniobra) =>
    set((state) => {
      const nuevosPacientes = state.pacientes.map((paciente) => {
        if (paciente.id === pacienteId) {
          const espirometriasActualizadas = [...paciente.espirometrias];
          if (espirometriasActualizadas.length > 0) {
            const ultimaIndex = espirometriasActualizadas.length - 1;
            const ultimaEspiro = { ...espirometriasActualizadas[ultimaIndex] };

            if (state.faseActual === "pre") {
              ultimaEspiro.maniobras = [
                ...(ultimaEspiro.maniobras || []),
                maniobra,
              ];
            } else {
              ultimaEspiro.maniobrasPost = [
                ...(ultimaEspiro.maniobrasPost || []),
                maniobra,
              ];
            }

            espirometriasActualizadas[ultimaIndex] = ultimaEspiro;
          }
          return { ...paciente, espirometrias: espirometriasActualizadas };
        }
        return paciente;
      });

      const nuevoSeleccionado =
        nuevosPacientes.find((p) => p.id === pacienteId) || null;
      return { pacientes: nuevosPacientes, pacienteSeleccionado: nuevoSeleccionado };
    }),
    }),
    {
      name: "espirosim:pacientes",
      storage: createJSONStorage(() => localStorage),
      // Solo persistimos la lista de pacientes — el paciente
      // seleccionado y la fase actual son estado de navegación, no datos.
      partialize: (state) => ({ pacientes: state.pacientes }),
    }
  )
);