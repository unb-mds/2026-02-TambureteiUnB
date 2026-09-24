import argparse
import sys
from app.pipeline.runner import ETLRunner


def main():
    """Interface CLI para execução manual ou programada do pipeline ETL."""
    parser = argparse.ArgumentParser(
        description="Pipeline ETL Tamburetei UnB — Ingestão de SIGAA e Dados Abertos"
    )

    parser.add_argument(
        "--source",
        choices=["sigaa", "metricas", "all"],
        default="sigaa",
        help="Fonte de dados para processamento (padrão: sigaa)",
    )
    parser.add_argument(
        "--semestre",
        default="2026.1",
        help="Semestre letivo de referência para dados do SIGAA (ex: 2026.1)",
    )
    parser.add_argument(
        "--ano-inicio",
        type=int,
        default=2021,
        help="Ano inicial para métricas do DPO/INEP (padrão: 2021)",
    )
    parser.add_argument(
        "--ano-fim",
        type=int,
        default=2026,
        help="Ano final para métricas do DPO/INEP (padrão: 2026)",
    )
    parser.add_argument(
        "--input-file",
        help="Caminho opcional para arquivo local bruto (CSV/JSON) para processamento",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Executa extração, transformação e validação sem persistir no banco de dados",
    )
    parser.add_argument(
        "--no-export",
        action="store_true",
        help="Desativa a exportação dos datasets processados em CSV/JSON",
    )

    args = parser.parse_args()
    runner = ETLRunner()
    export = not args.no_export

    try:
        if args.source in ("sigaa", "all"):
            runner.run_sigaa_pipeline(
                semestre=args.semestre,
                input_file=args.input_file,
                dry_run=args.dry_run,
                export=export,
            )

        if args.source in ("metricas", "all"):
            runner.run_metricas_pipeline(
                ano_inicio=args.ano_inicio,
                ano_fim=args.ano_fim,
                input_file=args.input_file,
                dry_run=args.dry_run,
                export=export,
            )

        print("\nPipeline executado com sucesso.")
        sys.exit(0)
    except Exception as e:
        print(f"\nFalha na execução do pipeline: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
