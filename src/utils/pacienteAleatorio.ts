// ============================================================
// GENERADOR DE PACIENTE ALEATORIO (solo en memoria)
// ============================================================

import { procesarNuevoPaciente } from "./procesarPaciente";
import { Paciente, DatosEspirometria } from "../store/pacientStore";

const NOMBRES_MASCULINOS = [
    "Matías", "Diego", "Sebastián", "Nicolás", "Alejandro",
    "Tomás", "Ignacio", "Felipe", "Rodrigo", "Andrés",
    "Pablo", "Cristóbal", "Javier", "Eduardo", "Luis",
];

const NOMBRES_FEMENINOS = [
    "Valentina", "Sofía", "Camila", "Isidora", "Javiera",
    "Francisca", "Daniela", "Catalina", "Constanza", "Antonia",
    "Gabriela", "Natalia", "Verónica", "Marcela", "Paula",
];

const APELLIDOS = [
    "González", "Muñoz", "Rojas", "Díaz", "Pérez",
    "Soto", "Contreras", "Silva", "Martínez", "Sepúlveda",
    "Morales", "Torres", "Flores", "Rivera", "Espinoza",
    "Vargas", "Fuentes", "Herrera", "Medina", "Castro",
];

const RAZAS = [
    "Caucasico", "Caucasico", "Caucasico",
    "Afrodescendiente",
    "Asiatico NE",
    "Asiatico SE",
    "Otra Raza / Etnia mixta",
];

const elegir = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const enteroEntre = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;
const floatEntre = (min: number, max: number, dec = 1) =>
    parseFloat((Math.random() * (max - min) + min).toFixed(dec));

export const crearPacienteAleatorio = async (
    addPaciente: (p: Paciente) => void,
    seleccionarPaciente: (id: string) => void,
    pacientesExistentes: Paciente[],
): Promise<Paciente> => {
    const sexo = Math.random() < 0.5 ? "Masculino" : "Femenino";
    const nombres = sexo === "Masculino" ? NOMBRES_MASCULINOS : NOMBRES_FEMENINOS;

    let nombre = `${elegir(nombres)} ${elegir(APELLIDOS)}`;
    let intentos = 0;
    while (
        pacientesExistentes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase())
        && intentos < 20
    ) {
        nombre = `${elegir(nombres)} ${elegir(APELLIDOS)}`;
        intentos++;
    }

    const edad = enteroEntre(18, 75);
    const raza = elegir(RAZAS);
    const talla = sexo === "Masculino" ? floatEntre(160, 190) : floatEntre(150, 175);

    const espirometriaDefault: DatosEspirometria = await procesarNuevoPaciente(
        { nombre, edad, talla, sexo, raza },
    );

    const nuevoPaciente: Paciente = {
        id: crypto.randomUUID(),
        nombre,
        edad,
        sexo,
        talla,
        raza,
        fechaRegistro: new Date().toLocaleDateString(),
        espirometrias: [espirometriaDefault],
    };

    addPaciente(nuevoPaciente);
    seleccionarPaciente(nuevoPaciente.id);

    return nuevoPaciente;
};