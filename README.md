# Feather Viewer VS Code Extension

View and explore `.feather` files directly inside VS Code using Python's [polars](https://www.pola.rs/) library.

## Features
- Pagination with next/previous and jump to page
- Apply filters using polars expressions, e.g., `col("a") == 1`
- Configurable Python interpreter path (`feather.pythonPath`), defaults to `python`

## Requirements
- Python with the `polars` package installed

## Usage
- Open a `.feather` file from the explorer (double-click) or right-click and choose **Open Feather File**.
- You can also run the command **Feather: Open Feather File** from the Command Palette.
- Use the webview controls to navigate pages or apply filters.

