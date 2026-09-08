// src/utils/procesarPaciente.ts
//
// Puerto a TypeScript de src-tauri/src/read.rs + lib.rs (lectura de la
// tabla de referencia GLI-2012 y cálculo de los índices L/M/S por
// paciente). Corre 100% en el navegador con SheetJS (`xlsx`), que lee sin
// problema el .xls binario viejo (formato OLE2 pre-2007).
//
// ⚠️ NOTA IMPORTANTE SOBRE LOS ÍNDICES DE COLUMNA:
// El código Rust original usa dos formas de leer celdas de calamine que
// NO comparten el mismo sistema de coordenadas:
//   - `range.get_value((fila, col))` usa columnas ABSOLUTAS de la hoja
//     (0 = columna A, 1 = columna B, ...). Se usa para leer los
//     coeficientes de regresión (a0-a6, p0-p5, q0-q1).
//   - `row.get(i)` (del iterador `rows()`) usa columnas RELATIVAS al
//     rango de celdas realmente usado en la hoja — y en esta tabla la
//     columna A está vacía en todas las hojas relevantes, así que
//     calamine "recorta" esa columna y `row.get(0)` termina apuntando a
//     la columna B absoluta, `row.get(1)` a la columna C, etc.
// Esto se verificó compilando un binario mínimo con `calamine` contra el
// archivo real (misma versión 0.33 que usa el proyecto, con las mismas
// hojas): `range.start()` da `(0, 1)` para las 6 hojas que usa la app
// (FEV1/FVC/FEV1FVC × hombres/mujeres) — o sea, un desfase de +1 columna
// consistente. SheetJS, en cambio, siempre indexa en absoluto desde la
// columna A. Por eso, al portar `row.get(0..3)` (edad/L/M/S) se le suma
// +1 a los índices de columna, pero los accesos "tipo get_value" (los
// coeficientes) se mantienen exactamente iguales a los del Rust original.

import * as XLSX from "xlsx";

export interface ValoresMLS {
  m: number;
  l: number;
  s: number;
}

interface IndicesEspirometria {
  fev1: ValoresMLS;
  fvc: ValoresMLS;
  fev1fvc: ValoresMLS;
}

export interface ParametrosEspirometria {
  fvc: ValoresMLS;
  fev1: ValoresMLS;
  fev1fvc: ValoresMLS;
}

export interface DatosEspirometriaCalculo {
  parametros: ParametrosEspirometria;
  curva_generada: number[];
  fecha: string;
}

export interface PacienteInput {
  nombre: string;
  edad: number;
  talla: number;
  sexo: string;
  raza: string;
}

// ---------------------------------------------------------------------------
// Carga y cachea la tabla de referencia (se descarga una sola vez).
// ---------------------------------------------------------------------------

let workbookCache: XLSX.WorkBook | null = null;

async function obtenerWorkbook(): Promise<XLSX.WorkBook> {
  if (workbookCache) return workbookCache;

  const response = await fetch("/lookuptables.xls");
  if (!response.ok) {
    throw new Error(
      "No se pudo cargar la tabla de referencia (lookuptables.xls)."
    );
  }
  const buffer = await response.arrayBuffer();
  workbookCache = XLSX.read(buffer, { type: "array", raw: true });
  return workbookCache;
}

// ---------------------------------------------------------------------------
// Lectura de celdas por DIRECCIÓN ABSOLUTA (fila/col 0-indexados desde A1),
// igual que calamine::Range::get_value. Se usa encode_cell en vez de un
// array posicional (sheet_to_json/header:1) porque distintas hojas del
// mismo archivo declaran dimensiones (!ref) distintas entre sí — algunas
// "empiezan" en A1 (con la columna A vacía) y otras en B1 directamente.
// SheetJS respeta esa metadata al armar arrays por posición, lo que
// desalinea los índices de columna entre hojas. La dirección de celda
// absoluta no tiene ese problema: "I4" siempre es la columna I, fila 4,
// sin importar qué diga el !ref declarado de la hoja.
// ---------------------------------------------------------------------------

function leerCelda(
  sheet: XLSX.WorkSheet,
  fila: number,
  col: number
): string | number | undefined {
  const ref = XLSX.utils.encode_cell({ r: fila, c: col });
  const cell = sheet[ref];
  if (!cell) return undefined;
  return cell.v as string | number;
}

/** Lectura "absoluta" de una celda (equivalente a range.get_value en Rust):
 * usada para los coeficientes de regresión. */
function extraerCoef(sheet: XLSX.WorkSheet, fila: number, col: number): number {
  const v = leerCelda(sheet, fila, col);
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Lectura "relativa al rango" (equivalente a row.get(i) en Rust): se
 * verificó compilando un binario con calamine 0.33 contra el archivo real
 * que, para las 6 hojas que usa la app (FEV1/FVC/FEV1FVC × hombres/
 * mujeres), el rango usado por calamine siempre empieza en la columna B
 * absoluta (columna A vacía en el archivo subyacente, más allá de lo que
 * diga el !ref de cada hoja) — por eso el +1 es consistente entre hojas. */
function extraerRelativo(
  sheet: XLSX.WorkSheet,
  fila: number,
  colRelativa: number
): number {
  return extraerCoef(sheet, fila, colRelativa + 1);
}

function edadEnFila(sheet: XLSX.WorkSheet, fila: number): number | undefined {
  const v = leerCelda(sheet, fila, 1); // columna B absoluta = edad
  return typeof v === "number" ? v : undefined;
}

// ---------------------------------------------------------------------------
// Puerto de leer_tabla_espirometria (read.rs)
// ---------------------------------------------------------------------------

export async function leerTablaEspirometria(
  edad: number,
  altura: number,
  sexo: string,
  raza: string
): Promise<IndicesEspirometria> {
  const wb = await obtenerWorkbook();
  const gender = sexo === "Masculino" ? "male" : "female";

  let afrAm = 0;
  let neAsia = 0;
  let seAsia = 0;
  let other = 0;
  switch (raza) {
    case "Afrodescendiente":
      afrAm = 1;
      break;
    case "Asiatico NE":
      neAsia = 1;
      break;
    case "Asiatico SE":
      seAsia = 1;
      break;
    case "Otra Raza / Etnia mixta":
      other = 1;
      break;
    // Caucasico cae aquí correctamente (todos los coeficientes en 0)
  }

  const parametros = ["FEV1", "FVC", "FEV1FVC"] as const;
  const resultados: ValoresMLS[] = [];

  for (const parametro of parametros) {
    const sheetName = `${parametro} ${gender}s`;
    let lResult = 0;
    let mResult = 0;
    let sResult = 0;

    const sheet = wb.Sheets[sheetName];
    if (sheet) {
      // Coeficientes de regresión — columnas absolutas fijas (I, L, O)
      const a0 = extraerCoef(sheet, 3, 8);
      const a1 = extraerCoef(sheet, 4, 8);
      const a2 = extraerCoef(sheet, 5, 8);
      const a3 = extraerCoef(sheet, 6, 8);
      const a4 = extraerCoef(sheet, 7, 8);
      const a5 = extraerCoef(sheet, 8, 8);
      const a6 = extraerCoef(sheet, 9, 8);

      const p0 = extraerCoef(sheet, 3, 11);
      const p1 = extraerCoef(sheet, 5, 11);
      const p2 = extraerCoef(sheet, 6, 11);
      const p3 = extraerCoef(sheet, 7, 11);
      const p4 = extraerCoef(sheet, 8, 11);
      const p5 = extraerCoef(sheet, 9, 11);

      const q0 = extraerCoef(sheet, 3, 14);
      const q1 = extraerCoef(sheet, 5, 14);

      let mspline = 0;
      let lspline = 0;
      let sspline = 0;
      let encontrado = false;

      for (let i = 2; i <= 371; i++) {
        const edadExcel = edadEnFila(sheet, i);
        if (edadExcel === undefined) continue;
        if (edadExcel === edad) {
          lspline = extraerRelativo(sheet, i, 1);
          mspline = extraerRelativo(sheet, i, 2);
          sspline = extraerRelativo(sheet, i, 3);
          encontrado = true;
          break;
        }
      }

      if (encontrado) {
        // Cálculo de L
        switch (sheetName) {
          case "FVC males":
          case "FEV1 females":
          case "FVC females":
            lResult = q0;
            break;
          case "FEV1 males":
          case "FEV1FVC females":
            lResult = q0 + q1 * Math.log(edad);
            break;
          case "FEV1FVC males":
            lResult = q0 + q1 * Math.log(edad) + lspline;
            break;
        }

        // Cálculo de M
        mResult = Math.exp(
          a0 +
            a1 * Math.log(altura) +
            a2 * Math.log(edad) +
            a3 * afrAm +
            a4 * neAsia +
            a5 * seAsia +
            a6 * other +
            mspline
        );

        // Cálculo de S
        sResult = Math.exp(
          p0 +
            p1 * Math.log(edad) +
            p2 * afrAm +
            p3 * neAsia +
            p4 * seAsia +
            p5 * other +
            sspline
        );
      } else {
        console.warn(
          `Advertencia: la edad ${edad} no fue encontrada en la hoja "${sheetName}".`
        );
      }
    } else {
      console.warn(`Error: no se encontró la hoja "${sheetName}"`);
    }

    resultados.push({ m: mResult, l: lResult, s: sResult });
  }

  return {
    fev1: resultados[0],
    fvc: resultados[1],
    fev1fvc: resultados[2],
  };
}

// ---------------------------------------------------------------------------
// Puerto de procesar_nuevo_paciente (lib.rs) — reemplaza el invoke() a Tauri
// ---------------------------------------------------------------------------

export async function procesarNuevoPaciente(
  datos: PacienteInput
): Promise<DatosEspirometriaCalculo> {
  const indicesCalculados = await leerTablaEspirometria(
    datos.edad,
    datos.talla,
    datos.sexo,
    datos.raza
  );

  const valoresBase: ParametrosEspirometria = {
    fvc: indicesCalculados.fvc,
    fev1: indicesCalculados.fev1,
    fev1fvc: indicesCalculados.fev1fvc,
  };

  const curvaMock = [
    0.0,
    valoresBase.fev1.m * 1.5,
    valoresBase.fev1.m * 0.8,
    valoresBase.fvc.m * 0.5,
    0.0,
  ];

  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(hoy.getDate()).padStart(2, "0")}`;

  return {
    parametros: valoresBase,
    curva_generada: curvaMock,
    fecha,
  };
}
