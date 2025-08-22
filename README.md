# Feather Viewer VS Code Extension

View and explore `.feather` files directly inside VS Code using Python's [polars](https://www.pola.rs/) library.

## Features
- Pagination with next/previous and jump to page
- Apply filters using polars expressions, e.g., `col("a") == 1`
- Configurable Python interpreter path (`feather.pythonPath`), defaults to `python`

## Requirements
- Python with the `polars` package installed

## Usage
1. Run the command **Feather: Open Feather File** from the Command Palette.
2. Select a `.feather` file to view.
3. Use the webview controls to navigate pages or apply filters.
