#!/usr/bin/env python3
"""Import a local SQL file into a Postgres database using SQLAlchemy."""

from __future__ import annotations

import argparse
import pathlib
import sys

from sqlalchemy import create_engine


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import a SQL file into Postgres via SQLAlchemy"
    )
    parser.add_argument(
        "--database-url",
        required=True,
        help=(
            "SQLAlchemy database URL, for example: "
            "postgresql+psycopg://user:password@host:5432/db"
        ),
    )
    parser.add_argument(
        "--sql-file",
        default="btw.sql",
        help="Path to SQL file to execute (default: btw.sql)",
    )
    parser.add_argument(
        "--echo",
        action="store_true",
        help="Enable SQLAlchemy SQL echo logging",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sql_path = pathlib.Path(args.sql_file)

    if not sql_path.exists():
        print(f"ERROR: SQL file not found: {sql_path}", file=sys.stderr)
        return 1

    sql_text = sql_path.read_text(encoding="utf-8")
    if not sql_text.strip():
        print(f"ERROR: SQL file is empty: {sql_path}", file=sys.stderr)
        return 1

    engine = create_engine(args.database_url, future=True, echo=args.echo)

    try:
        with engine.begin() as conn:
            # Use raw DB-API cursor to execute multi-statement SQL scripts.
            raw_conn = conn.connection
            with raw_conn.cursor() as cur:
                cur.execute(sql_text)

        print(f"Imported '{sql_path}' successfully.")
        return 0
    except Exception as exc:  # pragma: no cover
        print(f"ERROR: import failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
