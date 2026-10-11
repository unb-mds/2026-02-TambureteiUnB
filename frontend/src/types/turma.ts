export type TurnoTurma = "Diurno" | "Noturno" | "Vespertino";

export interface HorarioTurma {
  dia: string;       // ex: "Seg/Qua" ou "Terça-feira"
  horario: string;   // ex: "10:00 - 11:50"
  sala?: string;     // ex: "PAT AT-02/10" ou "S9"
}

export interface Turma {
  id: string | number;
  codigoTurma: string;      // ex: "Turma 01", "Turma A"
  disciplinaCodigo: string; // ex: "FGA0138" ou "FGA0158"
  professor: string;        // ex: "Profª. Dra. Carla Rocha"
  horarios: string;         // ex: "Seg/Qua 10:00 - 11:50"
  local: string;            // ex: "FCTE - UAC Sala S-9"
  vagasOcupadas: number;    // ex: 35
  totalVagas: number;       // ex: 40
  turno: TurnoTurma;        // "Diurno" | "Noturno" | "Vespertino"
}