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
        help="Caminho opcional para arquivo local bruto de turmas do SIGAA (CSV/JSON)",
    )
    parser.add_argument(
        "--input-metricas",
        help="Caminho opcional para arquivo local bruto de métricas históricas do DPO/INEP (CSV/JSON)",
    )
    parser.add_argument(
        "--departamento",
        type=int,
        help="ID de um departamento específico para scraping online no SIGAA (ex: 673 para FCTE)",
    )
    parser.add_argument(
        "--max-departamentos",
        type=int,
        help="Limite máximo de departamentos a processar durante o scraping online",
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
    parser.add_argument(
        "--no-ementas",
        action="store_true",
        help="Desativa a extração detalhada de ementas no SIGAA (processamento expresso)",
    )
    parser.add_argument(
        "--no-curriculos",
        action="store_true",
        help="Desativa a extração de matrizes curriculares dos cursos",
    )
    parser.add_argument(
        "--curso",
        type=int,
        help="ID específico de um curso no SIGAA para extração de matriz (ex: 414924 para Software)",
    )
    parser.add_argument(
        "--todos-cursos",
        action="store_true",
        help="Descobre e cataloga todos os 159 cursos de graduação da UnB (Darcy, FCTE, FCE e FUP)",
    )
    parser.add_argument(
        "--todos-curriculos",
        action="store_true",
        help="Extrai a matriz curricular de todos os cursos descobertos",
    )

    args = parser.parse_args()
    runner = ETLRunner()
    export = not args.no_export
    fetch_ementas = not args.no_ementas
    fetch_curriculos = not args.no_curriculos
    cursos_ids = [args.curso] if args.curso else None

    try:
        if args.source in ("sigaa", "all"):
            deptos = [args.departamento] if args.departamento else None
            runner.run_sigaa_pipeline(
                semestre=args.semestre,
                input_file=args.input_file,
                departamentos=deptos,
                max_departamentos=args.max_departamentos,
                dry_run=args.dry_run,
                export=export,
                fetch_ementas=fetch_ementas,
                fetch_curriculos=fetch_curriculos,
                cursos_ids=cursos_ids,
                todos_cursos=args.todos_cursos,
                todos_curriculos=args.todos_curriculos,
            )

        if args.source in ("metricas", "all"):
            # Para fonte métricas isolada, aceita --input-metricas ou --input-file
            metricas_input = args.input_metricas
            if not metricas_input and args.source == "metricas":
                metricas_input = args.input_file

            runner.run_metricas_pipeline(
                ano_inicio=args.ano_inicio,
                ano_fim=args.ano_fim,
                input_file=metricas_input,
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
