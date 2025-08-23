# Feather Viewer VS Code Extension

View and explore `.feather` files directly inside VS Code using Python's [polars](https://www.pola.rs/) library and a lightweight table.

## Features
- Pagination with next/previous and jump to page
- Apply arbitrary Polars code to transform the DataFrame before display (default `df`)
- Configurable Python interpreter path (`feather.pythonPath`), defaults to `python`
- Lightweight table with column sorting and filtering (inspired by [jonaraphael/csv](https://github.com/jonaraphael/csv))
- Each column header shows a filter icon with menu options for sorting or entering filter expressions that append to the code so operations apply to the entire table
- Expression input uses a lightweight textarea with Python highlighting that follows VS Code theming and supports Tab indentation, Enter auto-indent, and Ctrl-/ commenting

- Each column uses a distinct font color for better visual separation

## Requirements
- Python with the `polars` package installed

## Usage
- Open a `.feather` file from the explorer (double-click) or right-click and choose **Open Feather File**.
- You can also run the command **Feather: Open Feather File** from the Command Palette.
- Enter a Polars expression at the top to sort/filter, then use the bottom controls to navigate pages.