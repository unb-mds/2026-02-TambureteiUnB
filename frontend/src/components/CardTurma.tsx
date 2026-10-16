import React from "react";
import { Turma } from "@/types/turma";
import ClassCard from "@/components/ClassCard";

export interface CardTurmaProps {
  turma: Turma;
  className?: string;
}

export default function CardTurma({ turma, className = "" }: CardTurmaProps) {
  return <ClassCard turma={turma} className={className} />;
}