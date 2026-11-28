import type {
  ListaNotificacoesResponse,
  MarcarTodasLidasResponse,
  NotificacaoItem,
} from "../types/notificacao.ts";
import { request } from "./httpClient.ts";

export function listarNotificacoes(limite = 30): Promise<ListaNotificacoesResponse> {
  return request<ListaNotificacoesResponse>(`/notificacoes?limite=${limite}`, {
    cache: "no-store",
  });
}

export function marcarNotificacaoLida(id: number): Promise<NotificacaoItem> {
  return request<NotificacaoItem>(`/notificacoes/${id}/lida`, {
    method: "PATCH",
  });
}

export function marcarTodasNotificacoesLidas(): Promise<MarcarTodasLidasResponse> {
  return request<MarcarTodasLidasResponse>("/notificacoes/ler-todas", {
    method: "POST",
  });
}
