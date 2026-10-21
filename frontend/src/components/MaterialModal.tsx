import React from "react";

export interface MaterialModalProps {
  isOpen: boolean;
  disciplineName: string;
  onClose: () => void;
}

export default function MaterialModal({
  isOpen,
  disciplineName,
  onClose,
}: MaterialModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="material-modal-title"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-[#EDE9FD]">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <h3
            id="material-modal-title"
            className="font-bold text-lg text-[#202124]"
          >
            Compartilhar Material
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
        <p className="mt-4 text-xs sm:text-sm text-gray-600 leading-relaxed">
          Ajude outros estudantes compartilhando resumos, listas de exercícios
          ou provas antigas de <strong>{disciplineName}</strong>.
        </p>
        <div className="mt-4 rounded-xl bg-[#F7F7FA] p-3 text-xs text-gray-500">
          💡 Os materiais passam por revisão da moderação discente para garantir
          a qualidade acadêmica.
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={() => {
              alert("Upload de materiais disponível em breve!");
              onClose();
            }}
            className="rounded-xl bg-[#5B4BDB] px-4 py-2 text-xs font-semibold text-white hover:brightness-110 cursor-pointer"
          >
            Selecionar Arquivo
          </button>
        </div>
      </div>
    </div>
  );
}

export { MaterialModal };
