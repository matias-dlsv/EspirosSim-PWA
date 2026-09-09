// ============================================================
// TIPOS
// ============================================================

export interface PatronClinico {
  nombre: string;
  obstruccion: boolean;
  restriccion: boolean;
  tos: boolean;
  respuestaBD: "ninguna" | "leve" | "significativa";
}

export interface ValoresMLS {
  m: number;
  l: number;
  s: number;
}

export const CASOS_CLINICOS: PatronClinico[] = [
  { nombre: "Normal",            obstruccion: false, restriccion: false, tos: false, respuestaBD: "ninguna"       },
  { nombre: "Asma",              obstruccion: true,  restriccion: false, tos: false, respuestaBD: "significativa" },
  { nombre: "EPOC",              obstruccion: true,  restriccion: false, tos: false, respuestaBD: "leve"          },
  { nombre: "Escoliosis Severa", obstruccion: false, restriccion: true,  tos: false, respuestaBD: "leve"          },
  { nombre: "Lobectomía",        obstruccion: false, restriccion: true,  tos: false, respuestaBD: "leve"          },
];

// ============================================================
// CRITERIOS DE ACEPTABILIDAD
// ============================================================

export interface CriteriosAceptabilidad {
  vtestables: boolean;
  esfuerzomaximo: boolean;
  volumenextrapolado: boolean;
  pefcontinuo: boolean;
  tiempoespiracion: boolean;
}

export type FalloKey = keyof CriteriosAceptabilidad | "tiempoespiracion" | null;

const PROB_FALLO_GLOBAL = 0.3;

export const generarCriterios = (): {
  criterios: CriteriosAceptabilidad;
  falloKey: FalloKey;
} => {
  const hayFallo = Math.random() < PROB_FALLO_GLOBAL;

  if (!hayFallo) {
    return {
      criterios: {
        vtestables: true,
        esfuerzomaximo: true,
        volumenextrapolado: true,
        pefcontinuo: true,
        tiempoespiracion: true,
      },
      falloKey: null,
    };
  }

  const opciones: Array<keyof CriteriosAceptabilidad | "tiempoespiracion"> = [
    "vtestables",
    "esfuerzomaximo",
    "volumenextrapolado",
    "pefcontinuo",
    "tiempoespiracion",
  ];
  const falloKey = opciones[Math.floor(Math.random() * opciones.length)];

  return {
    criterios: {
      vtestables:         falloKey !== "vtestables",
      esfuerzomaximo:     falloKey !== "esfuerzomaximo",
      volumenextrapolado: falloKey !== "volumenextrapolado",
      pefcontinuo:        falloKey !== "pefcontinuo",
      tiempoespiracion:   falloKey !== "tiempoespiracion",
    },
    falloKey,
  };
};

// ============================================================
// RESPUESTA BRONCODILATADORA
// ============================================================

export interface RespuestaBD {
  factorFVC: number;
  factorFEV1: number;
  factorObstruccion: number;
}

export const calcularRespuestaBD = (
  tipo: PatronClinico["respuestaBD"],
): RespuestaBD => {
  const r = Math.random();
  switch (tipo) {
    case "ninguna":
      return { factorFVC: 1.01 + r * 0.02, factorFEV1: 1.02 + r * 0.02, factorObstruccion: 1.0  };
    case "leve":
      return { factorFVC: 1.03 + r * 0.03, factorFEV1: 1.04 + r * 0.04, factorObstruccion: 0.75 };
    case "significativa":
      return { factorFVC: 1.08 + r * 0.06, factorFEV1: 1.12 + r * 0.08, factorObstruccion: 0.25 };
  }
};

// ============================================================
// UTILIDADES Z-SCORE / LMS
// ============================================================

const yDesdeZ = (z: number, mls: ValoresMLS): number => {
  const { m, l, s } = mls;
  if (Math.abs(l) < 1e-10) return m * Math.exp(z * s);
  return m * Math.pow(1 + z * l * s, 1 / l);
};

const zAleatorio = (zMin: number, zMax: number): number =>
  zMin + Math.random() * (zMax - zMin);

// ============================================================
// RANGOS Z POR PATRÓN
// ============================================================

interface RangoZ { min: number; max: number }
interface RangosPatron { fvc: RangoZ; fev1: RangoZ; fev1fvc: RangoZ }

const NORMAL:              RangosPatron = { fvc: { min: -1.54, max:  1.54 }, fev1: { min: -1.54, max:  1.54 }, fev1fvc: { min: -1.54, max:  1.54 } };
const OBSTRUCTIVO_LEVE:    RangosPatron = { fvc: { min: -1.54, max:  0.5  }, fev1: { min: -2.4,  max: -1.74 }, fev1fvc: { min: -2.4,  max: -1.74 } };
const OBSTRUCTIVO_MODERADO:RangosPatron = { fvc: { min: -2.4,  max: -1.54 }, fev1: { min: -3.9,  max: -2.6  }, fev1fvc: { min: -3.9,  max: -2.6  } };
const RESTRICTIVO_LEVE:    RangosPatron = { fvc: { min: -2.4,  max: -1.74 }, fev1: { min: -2.4,  max: -1.74 }, fev1fvc: { min: -0.5,  max:  1.0  } };
const RESTRICTIVO_MODERADO:RangosPatron = { fvc: { min: -3.9,  max: -2.6  }, fev1: { min: -3.9,  max: -2.6  }, fev1fvc: { min:  0.0,  max:  1.5  } };

// ============================================================
// TRANSFORMACIONES — PATRÓN CLÍNICO
// ============================================================

export const aplicarObstruccion = (
  curva: number[][],
  fvc: number,
  factor = 1,
): number[][] =>
  curva.map(([x, y]) => {
    if (x <= 0 || y <= 0) return [x, y];
    const f = 1 - 0.88 * factor * Math.pow(x / fvc, 2.5);
    return [x, y * Math.max(f, 0.05)];
  });

export const aplicarRestriccion = (curva: number[][]): number[][] =>
  curva.map(([x, y]) =>
    x <= 0 ? [x, y * 0.70] : [x * 0.65, y * 0.70],
  );

export const aplicarTos = (curva: number[][], fvc: number): number[][] => {
  const xTos = fvc * (0.15 + Math.random() * 0.60);

  let insertarEn = curva.length - 1;
  for (let i = 0; i < curva.length - 1; i++) {
    if (curva[i][0] <= xTos && curva[i + 1][0] > xTos) {
      insertarEn = i + 1;
      break;
    }
  }

  const flujoBase = (curva[insertarEn] ?? curva[curva.length - 1])[1];
  const amplitud  = flujoBase * (0.40 + Math.random() * 0.50);
  const anchoTotal  = 0.35 + Math.random() * 0.15;
  const anchoSubida = anchoTotal * (0.12 + Math.random() * 0.08);
  const anchoBajada = anchoTotal - anchoSubida;

  const nuevos: number[][] = [
    [xTos - anchoSubida * 0.70, flujoBase + amplitud * 0.15],
    [xTos - anchoSubida * 0.30, flujoBase + amplitud * 0.60],
    [xTos,                       flujoBase + amplitud],
    [xTos + anchoBajada * 0.08,  flujoBase + amplitud * 0.82],
    [xTos + anchoBajada * 0.17,  flujoBase + amplitud * 0.65],
    [xTos + anchoBajada * 0.28,  flujoBase + amplitud * 0.50],
    [xTos + anchoBajada * 0.40,  flujoBase + amplitud * 0.37],
    [xTos + anchoBajada * 0.52,  flujoBase + amplitud * 0.26],
    [xTos + anchoBajada * 0.63,  flujoBase + amplitud * 0.17],
    [xTos + anchoBajada * 0.73,  flujoBase + amplitud * 0.10],
    [xTos + anchoBajada * 0.83,  flujoBase + amplitud * 0.05],
    [xTos + anchoBajada * 0.92,  flujoBase + amplitud * 0.02],
    [xTos + anchoBajada,         flujoBase],
  ];

  const resultado = [...curva];
  resultado.splice(insertarEn, 0, ...nuevos);
  return resultado;
};

export const aplicarPatron = (
  curva: number[][],
  fvc: number,
  patron: PatronClinico | null,
  factorObstruccion = 1,
): number[][] => {
  if (!patron) return curva;
  let r = curva;
  if (patron.obstruccion) r = aplicarObstruccion(r, fvc, factorObstruccion);
  if (patron.restriccion) r = aplicarRestriccion(r);
  if (patron.tos)         r = aplicarTos(r, fvc);
  return r;
};

// ============================================================
// TRANSFORMACIONES — CRITERIOS DE ACEPTABILIDAD
// ============================================================

export const aplicarFalloEsfuerzoMaximo = (
  curva: number[][],
  _fvc: number,
): number[][] => {
  let idxPef = 0;
  let maxFlujo = -Infinity;
  for (let i = 0; i < curva.length; i++) {
    if (curva[i][1] > maxFlujo) {
      maxFlujo = curva[i][1];
      idxPef = i;
    }
  }

  return curva.map(([x, y], i) => {
    if (i <= idxPef) {
      return [x, y * 0.4];
    }
    const tDesc = (i - idxPef) / Math.max(1, curva.length - 1 - idxPef);
    const base = y * (0.4 + tDesc * 0.08);
    const ondula = base * 0.12 * Math.sin(tDesc * Math.PI * 9) * (1 - tDesc);
    return [x, base + ondula];
  });
};

export const aplicarFalloVolumenExtrapolado = (
  inhalacionPostForzada: number[][],
  fvcM: number,
): { inhalacion: number[][]; vbeArtificial: number } => {
  const vbeArtificial = fvcM * (0.08 + Math.random() * 0.06);

  if (inhalacionPostForzada.length === 0) {
    return { inhalacion: inhalacionPostForzada, vbeArtificial };
  }

  const xFinal = -vbeArtificial;
  const nConservar = Math.floor(inhalacionPostForzada.length * 0.70);
  const pivote  = inhalacionPostForzada[nConservar];
  const xPivote = pivote[0];
  const yPivote = pivote[1];

  const nRedibujar = inhalacionPostForzada.length - nConservar;
  const nuevoCierre: number[][] = [];
  for (let i = 1; i <= nRedibujar; i++) {
    const t = i / nRedibujar;
    nuevoCierre.push([
      xPivote + t * (xFinal - xPivote),
      yPivote * (1 - Math.pow(t, 0.7)),
    ]);
  }

  return {
    inhalacion: [
      ...inhalacionPostForzada.slice(0, nConservar + 1),
      ...nuevoCierre,
    ],
    vbeArtificial,
  };
};

export const aplicarFalloPefContinuo = (
  curva: number[][],
  fvc: number,
): number[][] => {
  const xTos = fvc * (0.15 + Math.random() * 0.60);
  const amplitud = 0.35 + Math.random() * 0.40;
  const ancho = 0.30 + Math.random() * 0.20;

  return curva.map(([x, y]) => {
    if (x <= 0) return [x, y];
    const dist = Math.abs(x - xTos);
    if (dist > ancho) return [x, y];
    const t = dist / ancho;
    const factor = x < xTos
      ? amplitud * Math.pow(1 - t, 0.4)
      : amplitud * Math.pow(1 - t, 1.8);
    return [x, y + y * factor];
  });
};

export const aplicarFalloTiempoEspiracion = (
  exhalacionForzada: number[][],
  _fvcM: number,
): number[][] => {
  if (exhalacionForzada.length === 0) return exhalacionForzada;

  const xMax = Math.max(...exhalacionForzada.map(([x]) => x));
  const proporcionCorte = 0.50 + Math.random() * 0.15;
  const volCorte = xMax * proporcionCorte;

  let idxCorte = exhalacionForzada.length - 1;
  for (let i = 0; i < exhalacionForzada.length; i++) {
    if (exhalacionForzada[i][0] >= volCorte) {
      idxCorte = i;
      break;
    }
  }

  const cortada = exhalacionForzada.slice(0, idxCorte + 1);
  const ultimo  = cortada[cortada.length - 1] ?? [volCorte, 0];

  cortada.push([ultimo[0] + 0.03, ultimo[1] * 0.4]);
  cortada.push([ultimo[0] + 0.05, 0]);

  return cortada;
};

// ============================================================
// GENERADOR DE ÍNDICES ANCLADO A RANGOS Z
// ============================================================

export interface ParametrosMLS {
  fvc: ValoresMLS;
  fev1: ValoresMLS;
  fev1fvc: ValoresMLS;
}

export const generarIndicesAleatorios = (
  fvcTeorico: number,
  fev1Teorico: number,
  mls?: ParametrosMLS,
  patron?: PatronClinico | null,
): { fvc: number; fev1: number; fev1fvc: number } => {
  if (!mls) {
    const fvc  = fvcTeorico  * (1 + Math.random() * 0.06 - 0.03);
    const fev1 = fev1Teorico * (1 + Math.random() * 0.06 - 0.03);
    return { fvc, fev1, fev1fvc: fev1 / fvc };
  }

  const rangos: RangosPatron =
    patron?.obstruccion && !patron?.restriccion
      ? Math.random() < 0.5 ? OBSTRUCTIVO_LEVE : OBSTRUCTIVO_MODERADO
      : patron?.restriccion && !patron?.obstruccion
        ? Math.random() < 0.5 ? RESTRICTIVO_LEVE : RESTRICTIVO_MODERADO
        : NORMAL;

  // FVC y FEV1 se samplean independientes dentro de sus rangos (esto es lo
  // que hace que la severidad calce bien en Resultado.tsx, porque esos
  // rangos ya están calibrados contra los umbrales de severidad).
  // Pero el ratio resultante (fev1/fvc) puede caer, por azar, del lado
  // equivocado del LIN (-1.645) aunque ambos valores individuales estén
  // "bien" — eso es lo que causaba pacientes "Normal" identificados como
  // Obstructivo. Por eso se reintenta hasta que la clasificación real
  // (misma lógica que esPatronCorrecto en Resultado.tsx) coincida con el
  // patrón que se pidió generar.
  const esperaObstruccion = !!patron?.obstruccion && !patron?.restriccion;
  const esperaRestriccion = !!patron?.restriccion && !patron?.obstruccion;

  const LLN_Z = -1.645;
  const zScore = (yObs: number, m: number, l: number, s: number): number => {
    if (m <= 0 || s <= 0) return NaN;
    if (Math.abs(l) < 1e-10) return Math.log(yObs / m) / s;
    return (Math.pow(yObs / m, l) - 1) / (l * s);
  };

  const MAX_INTENTOS = 60;
  let fvcVal = 0;
  let fev1Val = 0;

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    fvcVal  = yDesdeZ(zAleatorio(rangos.fvc.min,  rangos.fvc.max),  mls.fvc);
    fev1Val = yDesdeZ(zAleatorio(rangos.fev1.min, rangos.fev1.max), mls.fev1);
    const ratioVal = fev1Val / fvcVal;

    const zFvc   = zScore(fvcVal,   mls.fvc.m,     mls.fvc.l,     mls.fvc.s);
    const zRatio = zScore(ratioVal, mls.fev1fvc.m, mls.fev1fvc.l, mls.fev1fvc.s);
    const esObstructivo = zRatio < LLN_Z;
    const esRestrictivo = !esObstructivo && zFvc < LLN_Z;
    const esNormal      = !esObstructivo && !esRestrictivo;

    const coincide = esperaObstruccion ? esObstructivo
                    : esperaRestriccion ? esRestrictivo
                    : esNormal;
    if (coincide) break;
  }

  return {
    fvc:     fvcVal,
    fev1:    fev1Val,
    fev1fvc: fev1Val / fvcVal,
  };
};

// ============================================================
// GENERADOR DE ÍNDICES POST — anclado al pre
// ============================================================

/**
 * Genera índices post-BD partiendo de los valores pre reales.
 * El delta se expresa como % del teórico (criterio ATS/ERS 2019).
 *
 * ninguna:       ±1–5%  bidireccional → nunca supera 10% en positivo
 * leve:          baja raramente (15%), sube 4–9% → siempre sub-umbral
 * significativa: siempre sube ≥10%
 */
const calcularDelta = (
  m: number,
  tipo: PatronClinico["respuestaBD"],
): number => {
  const r = Math.random();
  const signo = Math.random();
  switch (tipo) {
    case "ninguna":
      return m * (signo < 0.4 ? -(0.01 + r * 0.04)
                              :  (0.01 + r * 0.04));
    case "leve":
      return m * (signo < 0.15 ? -(0.01 + r * 0.03)
                               :  (0.04 + r * 0.05));
    case "significativa":
      return m * (0.10 + r * 0.08);
  }
};

export const generarIndicesPost = (
  indicesPre: { fvc: number; fev1: number },
  respuestaBD: PatronClinico["respuestaBD"],
  mls: ParametrosMLS,
): { fvc: number; fev1: number; fev1fvc: number } => {
  const fvcPost  = indicesPre.fvc  + calcularDelta(mls.fvc.m,  respuestaBD);
  const fev1Post = indicesPre.fev1 + calcularDelta(mls.fev1.m, respuestaBD);

  return {
  fvc:     fvcPost,
  fev1:    fev1Post,
  fev1fvc: fev1Post / fvcPost,  
};
};