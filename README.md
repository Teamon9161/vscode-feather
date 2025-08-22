# Feather Viewer VS Code Extension

View and explore `.feather` files directly inside VS Code using Python's [polars](https://www.pola.rs/) library and an interactive table powered by AG Grid.

## Features
- Pagination with next/previous and jump to page
- Apply arbitrary Polars code to transform the DataFrame before display (default `df`)
- Configurable Python interpreter path (`feather.pythonPath`), defaults to `python`
- Interactive grid with column resizing, sorting, filtering, and double-click auto-sizing powered by [AG Grid](https://www.ag-grid.com/) (bundled for offline use)
- Columns are color-coded for easier reading
- Built-in AG Grid column filters and sorting automatically update the expression
- Expression input uses the Monaco editor for syntax highlighting and theme-aware styling

## Requirements
- Python with the `polars` package installed

## Usage
- Open a `.feather` file from the explorer (double-click) or right-click and choose **Open Feather File**.
- You can also run the command **Feather: Open Feather File** from the Command Palette.
- Enter a Polars expression at the top to sort/filter, then use the bottom controls to navigate pages.
