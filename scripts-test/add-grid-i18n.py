#!/usr/bin/env python3
"""Add Grid i18n keys to all language blocks in i18n.ts"""
import re

GRID_KEYS_EN = {
    "nav.grid": "Grid",
    "grid.title": "Grid",
    "grid.newSpreadsheet": "New spreadsheet",
    "grid.rename": "Rename",
    "grid.delete": "Delete",
    "grid.deleteConfirm": "Delete this spreadsheet?",
    "grid.addSheet": "Add sheet",
    "grid.noSpreadsheets": "No spreadsheets yet",
    "grid.noSpreadsheetsHint": "Create your first spreadsheet to get started.",
    "grid.placeholder": "Untitled spreadsheet",
    "grid.emptyHint": "Click a cell to start editing.",
    "grid.formulaHint": "Start with = for formulas (e.g. =SUM(A1:A10), =AVG(B1:B5), =COUNT(A:A))",
    "grid.bold": "Bold",
    "grid.italic": "Italic",
    "grid.alignLeft": "Align left",
    "grid.alignCenter": "Center",
    "grid.alignRight": "Align right",
    "grid.bgColor": "Background color",
    "grid.textColor": "Text color",
    "grid.clearFormat": "Clear formatting",
    "grid.sheets": "Sheets",
}

TRANSLATIONS = {
    "es": {
        "nav.grid": "Cuadrícula",
        "grid.title": "Cuadrícula",
        "grid.newSpreadsheet": "Nueva hoja de cálculo",
        "grid.rename": "Renombrar",
        "grid.delete": "Eliminar",
        "grid.deleteConfirm": "¿Eliminar esta hoja de cálculo?",
        "grid.addSheet": "Agregar hoja",
        "grid.noSpreadsheets": "No hay hojas de cálculo",
        "grid.noSpreadsheetsHint": "Crea tu primera hoja de cálculo para comenzar.",
        "grid.placeholder": "Hoja sin título",
        "grid.emptyHint": "Haz clic en una celda para comenzar.",
        "grid.bold": "Negrita",
        "grid.italic": "Cursiva",
        "grid.alignLeft": "Alinear izquierda",
        "grid.alignCenter": "Centrar",
        "grid.alignRight": "Alinear derecha",
        "grid.bgColor": "Color de fondo",
        "grid.textColor": "Color de texto",
        "grid.clearFormat": "Borrar formato",
        "grid.sheets": "Hojas",
    },
    "fr": {
        "nav.grid": "Grille",
        "grid.title": "Grille",
        "grid.newSpreadsheet": "Nouvelle feuille",
        "grid.rename": "Renommer",
        "grid.delete": "Supprimer",
        "grid.deleteConfirm": "Supprimer cette feuille ?",
        "grid.addSheet": "Ajouter une feuille",
        "grid.noSpreadsheets": "Aucune feuille",
        "grid.noSpreadsheetsHint": "Créez votre première feuille pour commencer.",
        "grid.placeholder": "Feuille sans titre",
        "grid.emptyHint": "Cliquez sur une cellule pour commencer.",
        "grid.bold": "Gras",
        "grid.italic": "Italique",
        "grid.alignLeft": "Aligner à gauche",
        "grid.alignCenter": "Centrer",
        "grid.alignRight": "Aligner à droite",
        "grid.bgColor": "Couleur de fond",
        "grid.textColor": "Couleur du texte",
        "grid.clearFormat": "Effacer le format",
        "grid.sheets": "Feuilles",
    },
    "de": {
        "nav.grid": "Raster",
        "grid.title": "Raster",
        "grid.newSpreadsheet": "Neues Tabellenblatt",
        "grid.rename": "Umbenennen",
        "grid.delete": "Löschen",
        "grid.deleteConfirm": "Dieses Tabellenblatt löschen?",
        "grid.addSheet": "Blatt hinzufügen",
        "grid.noSpreadsheets": "Noch keine Tabellen",
        "grid.noSpreadsheetsHint": "Erstellen Sie Ihr erstes Tabellenblatt.",
        "grid.placeholder": "Unbenanntes Tabellenblatt",
        "grid.emptyHint": "Klicken Sie auf eine Zelle.",
        "grid.bold": "Fett",
        "grid.italic": "Kursiv",
        "grid.alignLeft": "Links ausrichten",
        "grid.alignCenter": "Zentrieren",
        "grid.alignRight": "Rechts ausrichten",
        "grid.bgColor": "Hintergrundfarbe",
        "grid.textColor": "Textfarbe",
        "grid.clearFormat": "Formatierung löschen",
        "grid.sheets": "Blätter",
    },
}

# Other languages just get English keys

with open("src/lib/i18n.ts", "r", encoding="utf-8") as f:
    content = f.read()

lines = content.split("\n")
new_lines = []
i = 0

# Detect which language block we're in by tracking the top-level key
current_lang = "en"
lang_pattern = re.compile(r'^\s*"([a-z]{2})":\s*\{')

# Known language code positions (approximate line ranges for each lang block)
# We'll track based on the lang key pattern

while i < len(lines):
    line = lines[i]
    new_lines.append(line)
    
    # Detect language block start
    m = lang_pattern.match(line)
    if m:
        current_lang = m.group(1)
    
    # Check if this line has nav.settings
    if '"nav.settings":' in line and 'grid.title' not in line and 'search.title' not in line:
        # Find the next line to see if grid keys already exist
        next_line = lines[i + 1] if i + 1 < len(lines) else ""
        if '"nav.grid"' not in next_line and '"grid.' not in next_line:
            # Determine which translations to use
            if current_lang in TRANSLATIONS:
                tr = TRANSLATIONS[current_lang]
            elif current_lang == "en":
                tr = GRID_KEYS_EN
            else:
                tr = GRID_KEYS_EN  # fallback to English
            
            # Get indentation from the nav.settings line
            indent = re.match(r'(\s*)', line).group(1)
            
            grid_lines = []
            for key, val in tr.items():
                grid_lines.append(f'{indent}"{key}": "{val}",')
            
            new_lines.extend(grid_lines)
    
    i += 1

with open("src/lib/i18n.ts", "w", encoding="utf-8") as f:
    f.write("\n".join(new_lines))

print("Done! Grid i18n keys added to all language blocks.")
