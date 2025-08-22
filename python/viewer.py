import argparse
import json

try:
    import polars as pl
except Exception as e:
    print(json.dumps({"error": f"Failed to import polars: {e}"}))
    raise SystemExit(0)


def main():
    parser = argparse.ArgumentParser(description="Read feather file and output page as JSON")
    parser.add_argument('file', help='Path to feather file')
    parser.add_argument('--page', type=int, default=0, help='Page number (0-based)')
    parser.add_argument('--page_size', type=int, default=100, help='Number of rows per page')
    parser.add_argument('--filter', default='', help='Polars filter expression, e.g., col("a") == 1')
    args = parser.parse_args()

    try:
        df = pl.read_ipc(args.file)
    except Exception as e:
        print(json.dumps({"error": f"Failed to read file: {e}"}))
        return

    if args.filter:
        try:
            expr = eval(args.filter, {"pl": pl, "col": pl.col})
            df = df.filter(expr)
        except Exception as e:
            print(json.dumps({"error": f"Bad filter expression: {e}"}))
            return

    total_rows = df.height
    start = args.page * args.page_size
    df_page = df.slice(start, args.page_size)

    result = {
        "columns": df.columns,
        "rows": df_page.to_dicts(),
        "totalRows": total_rows
    }
    # datetimes and other complex types need string conversion for JSON serialization
    print(json.dumps(result, default=str))


if __name__ == '__main__':
    main()
