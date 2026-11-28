export interface NotificacaoItem {
  id: number;
  tipo: string;
  titulo: string;
  mensagem: string;
  link?: string | null;
  lida: boolean;
  created_at: string;
}

export interface ListaNotificacoesResponse {
  items: NotificacaoItem[];
  nao_lidas: number;
}

export interface MarcarTodasLidasResponse {
  marcadas: number;
}
