#!/usr/bin/env python3
"""
generate_labels_doc.py
Generates the clean, focused Microsoft Word (.docx) document:
'KABUTECH_HIYAS_LABELS_SPECIFICATION.docx'
Strictly containing ONLY the user-specified hardware labels:
1. Main Box: POWER, MAINS, ON, OFF, VALVE, PSU, BUCK
2. Ports, Output Devices & Probe: PROBE (LIGHT, CO2, T/H), INTAKE, EXHAUST, MIST, LIGHT
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def set_cell_background(cell, fill_hex):
    """Sets cell background shading."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=130, right=130):
    """Sets inner padding for table cell in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'  <w:top w:w="{top}" w:type="dxa"/>'
        f'  <w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'  <w:left w:w="{left}" w:type="dxa"/>'
        f'  <w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="CBD5E1", sz="4", val="single"):
    """Applies clean subtle borders to a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def make_callout(doc, title, text, bg_hex="F0FDF4", border_hex="10B981"):
    """Creates a clean callout box with a colored left accent border."""
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    cell = tbl.cell(0, 0)
    cell.width = Inches(7.0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=120, bottom=120, left=180, right=140)
    
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'  <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_hex}"/>'
        f'  <w:top w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:bottom w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run_title = p.add_run(f"★  {title}\n")
    run_title.bold = True
    run_title.font.size = Pt(10)
    run_title.font.color.rgb = RGBColor(10, 58, 34)
    
    run_text = p.add_run(text)
    run_text.font.size = Pt(9.5)
    run_text.font.color.rgb = RGBColor(30, 41, 59)
    
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_after = Pt(4)

def format_row(row, values, is_header=False, col_widths=None, alt=False):
    """Formats cells in a table row with proper styling."""
    trPr = row._tr.get_or_add_trPr()
    trPr.append(parse_xml(f'<w:cantSplit {nsdecls("w")}/>'))
    
    if is_header:
        trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))

    for i, val in enumerate(values):
        cell = row.cells[i]
        if col_widths and i < len(col_widths):
            cell.width = col_widths[i]
            
        set_cell_margins(cell, top=80 if not is_header else 100, 
                               bottom=80 if not is_header else 100, 
                               left=100, right=100)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        
        p = cell.paragraphs[0]
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.15
        
        if is_header:
            set_cell_background(cell, "0A3A22")  # Deep Emerald
            run = p.add_run(val)
            run.bold = True
            run.font.name = "Segoe UI"
            run.font.size = Pt(9.5)
            run.font.color.rgb = RGBColor(255, 255, 255)
            if i == 0:
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        else:
            bg_color = "F8FAFC" if alt else "FFFFFF"
            set_cell_background(cell, bg_color)
            
            run = p.add_run(val)
            run.font.name = "Segoe UI"
            
            if i == 0:
                # The SINGLE-WORD LABEL
                run.bold = True
                run.font.name = "Consolas"
                run.font.size = Pt(10.5)
                run.font.color.rgb = RGBColor(10, 58, 34)
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            elif i == 4:
                # Tape spec column
                run.font.size = Pt(8.5)
                run.font.color.rgb = RGBColor(71, 85, 105)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            else:
                run.font.size = Pt(9)
                run.font.color.rgb = RGBColor(30, 41, 59)
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT

def build_document():
    doc = docx.Document()
    
    # Page Setup: Letter, 0.75 inch margins
    for section in doc.sections:
        section.page_width = Inches(8.5)
        section.page_height = Inches(11.0)
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # Styles
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Segoe UI'
    normal_style.font.size = Pt(10)
    normal_style.font.color.rgb = RGBColor(30, 41, 59)

    # ══════════════════════════════════════════════════════════════════
    # HEADER / TITLE
    # ══════════════════════════════════════════════════════════════════
    title_p = doc.add_paragraph()
    title_p.paragraph_format.space_before = Pt(0)
    title_p.paragraph_format.space_after = Pt(2)
    r_kabu = title_p.add_run("KABUTECH HIYAS")
    r_kabu.bold = True
    r_kabu.font.size = Pt(22)
    r_kabu.font.color.rgb = RGBColor(10, 58, 34) # Emerald
    
    sub_p = doc.add_paragraph()
    sub_p.paragraph_format.space_before = Pt(0)
    sub_p.paragraph_format.space_after = Pt(4)
    r_sub = sub_p.add_run("Hardware Labeling Specification — Main Box & Output Devices")
    r_sub.bold = True
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(16, 185, 129)

    desc_p = doc.add_paragraph()
    desc_p.paragraph_format.space_before = Pt(0)
    desc_p.paragraph_format.space_after = Pt(8)
    r_desc = desc_p.add_run(
        "Single-word physical labels for the main enclosure controls, power components, "
        "aviation I/O ports, chamber output actuators, and suspended weather probe."
    )
    r_desc.font.size = Pt(9.5)
    r_desc.font.italic = True
    r_desc.font.color.rgb = RGBColor(100, 116, 139)

    # Callout principle
    make_callout(
        doc,
        title="DIRECT DEMO & SECURITY NAMING PRINCIPLE",
        text=(
            "Each label is engineered as an unmistakable single word. "
            "This provides immediate understanding for users and evaluators (<0.2 seconds), "
            "prevents wiring mistakes on the GX16 aviation sockets, and ensures clear electrical safety."
        ),
        bg_hex="F0FDF4",
        border_hex="10B981"
    )

    col_widths = [Inches(1.2), Inches(1.5), Inches(2.0), Inches(1.2), Inches(1.1)]

    # ══════════════════════════════════════════════════════════════════
    # SECTION 1: MAIN BOX CONTROLS & POWER COMPONENTS
    # ══════════════════════════════════════════════════════════════════
    h1 = doc.add_heading("1. Main Box — Controls & Power", level=1)
    h1.paragraph_format.space_before = Pt(10)
    h1.paragraph_format.space_after = Pt(4)
    for r in h1.runs:
        r.font.color.rgb = RGBColor(10, 58, 34)

    p1_info = doc.add_paragraph(
        "Labels applied to the primary power switches, mains inlet, internal/external power supplies, "
        "step-down converters, and solenoid valve control on the main box."
    )
    p1_info.paragraph_format.space_after = Pt(6)

    table1_data = [
        ("POWER", "AC Master Rocker Switch (SW1)", "Main electrical power toggle", "Instant identification of master switch", "White on Red (12mm)"),
        ("MAINS", "AC Inlet Bezel / Grid Feed", "220VAC incoming electrical utility", "Identifies live utility feed source", "Yellow on Black (9mm)"),
        ("ON", "Switch Upper Rocker Position", "Circuit closed / energized state", "Confirms energized switch position", "White on Green (9mm)"),
        ("OFF", "Switch Lower Rocker Position", "Circuit open / de-energized state", "Confirms safe shutoff position", "White on Red (9mm)"),
        ("VALVE", "Solenoid Valve Output Port / Switch", "12V NC Solenoid Water Valve line", "Identifies water shut-off control", "White on Blue (12mm)"),
        ("PSU", "12V 5A Primary Power Supply", "AC-to-DC 60W master switching PSU", "Identifies primary 12V power supply", "Black on Silver (12mm)"),
        ("BUCK", "LM2596 DC-DC Step-Down Board", "12V to 5V 3A logic voltage converter", "Identifies 5V logic supply regulator", "Black on White (9mm)"),
    ]

    t1 = doc.add_table(rows=1, cols=5)
    t1.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t1)
    format_row(t1.rows[0], ["LABEL", "PHYSICAL TARGET", "HARDWARE FUNCTION", "DEMO PURPOSE", "TAPE / COLOR SPEC"], is_header=True, col_widths=col_widths)
    for idx, row in enumerate(table1_data):
        r = t1.add_row()
        format_row(r, row, is_header=False, col_widths=col_widths, alt=(idx % 2 == 1))

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 2: PORTS, OUTPUT DEVICES & PROBE
    # ══════════════════════════════════════════════════════════════════
    h2 = doc.add_heading("2. Output Devices, Ports & Weather Probe", level=1)
    h2.paragraph_format.space_before = Pt(10)
    h2.paragraph_format.space_after = Pt(4)
    for r in h2.runs:
        r.font.color.rgb = RGBColor(10, 58, 34)

    p2_info = doc.add_paragraph(
        "Labels applied to the GX16 aviation ports, the chamber actuator hardware, "
        "and the suspended weather probe containing the environmental sensors."
    )
    p2_info.paragraph_format.space_after = Pt(6)

    table2_data = [
        ("PROBE", "Port J1 / Umbilical Sensor Head", "Chamber environmental sensor probe", "Connects suspended multi-sensor head", "White on Blue (12mm)"),
        ("LIGHT", "Sensor Probe Face / Port J5", "Ambient Lux Sensor (BH1750) & Grow LED", "Photoperiod monitoring & grow lighting", "Black on Yellow (12mm)"),
        ("CO2", "Sensor Probe Face", "True NDIR Carbon Dioxide Sensor (SCD41)", "Chamber respiration / ventilation level", "Black on Yellow (9mm)"),
        ("T/H", "Sensor Probe Face", "Temperature & Humidity Sensor (SHT31)", "Core mushroom fruiting environment", "White on Green (9mm)"),
        ("INTAKE", "Port J3 & 120mm Intake Fan", "Fresh air intake blower fan", "Draws in fresh atmospheric oxygen", "White on Black (12mm)"),
        ("EXHAUST", "Port J2 & 120mm Exhaust Fan", "Air extractor fan", "Expels stale air & CO2 build-up", "White on Black (12mm)"),
        ("MIST", "Port J4 & 60W Misting Pump", "High-pressure fogging pump & nozzles", "Generates high humidity (>85% RH)", "White on Blue (12mm)"),
    ]

    t2 = doc.add_table(rows=1, cols=5)
    t2.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t2)
    format_row(t2.rows[0], ["LABEL", "PHYSICAL TARGET", "HARDWARE FUNCTION", "DEMO PURPOSE", "TAPE / COLOR SPEC"], is_header=True, col_widths=col_widths)
    for idx, row in enumerate(table2_data):
        r = t2.add_row()
        format_row(r, row, is_header=False, col_widths=col_widths, alt=(idx % 2 == 1))

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 3: PROBE BREAKDOWN (PRINT SPECIFICATION)
    # ══════════════════════════════════════════════════════════════════
    h3 = doc.add_heading("3. Weather Probe Print Specification", level=1)
    h3.paragraph_format.space_before = Pt(10)
    h3.paragraph_format.space_after = Pt(4)
    for r in h3.runs:
        r.font.color.rgb = RGBColor(10, 58, 34)

    p3_info = doc.add_paragraph(
        "On the suspended multi-sensor probe body inside the mushroom chamber, "
        "print or stick the following labels directly adjacent to each sensor aperture:"
    )
    p3_info.paragraph_format.space_after = Pt(6)

    table3_data = [
        ("LIGHT", "BH1750 Optical Window", "Ambient illuminance detection (150–1000 lx)", "Indicates photoperiod light sensor", "Black on Yellow (9mm)"),
        ("CO2", "SCD41 Optical NDIR Chamber", "True CO2 gas concentration (<1000 ppm)", "Indicates air exchange CO2 sensor", "Black on Yellow (9mm)"),
        ("T/H", "SHT31-D Sintered Filter Cap", "Temperature & Relative Humidity (18-25°C, 85-95%)", "Indicates primary climate sensor", "White on Green (9mm)"),
    ]

    t3 = doc.add_table(rows=1, cols=5)
    t3.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t3)
    format_row(t3.rows[0], ["LABEL", "PROBE LOCATION", "SENSOR SPECIFICATION", "DEMO PURPOSE", "TAPE / COLOR SPEC"], is_header=True, col_widths=col_widths)
    for idx, row in enumerate(table3_data):
        r = t3.add_row()
        format_row(r, row, is_header=False, col_widths=col_widths, alt=(idx % 2 == 1))

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # ══════════════════════════════════════════════════════════════════
    # SECTION 4: READY-TO-PRINT STICKER CUT SHEET
    # ══════════════════════════════════════════════════════════════════
    h4 = doc.add_heading("4. Ready-to-Print Sticker Checklist", level=1)
    h4.paragraph_format.space_before = Pt(10)
    h4.paragraph_format.space_after = Pt(4)
    for r in h4.runs:
        r.font.color.rgb = RGBColor(10, 58, 34)

    p4_info = doc.add_paragraph(
        "Quick reference for printing labels with an industrial label maker (Brother P-Touch, Dymo, or Brady):"
    )
    p4_info.paragraph_format.space_after = Pt(6)

    table4_data = [
        ("POWER", "12mm Tape", "White on Red", "Main AC Rocker Switch"),
        ("MAINS", "9mm Tape", "Yellow on Black", "220VAC Grid Inlet"),
        ("ON", "9mm Tape", "White on Green", "Switch Energized Position"),
        ("OFF", "9mm Tape", "White on Red", "Switch De-energized Position"),
        ("VALVE", "12mm Tape", "White on Blue", "Solenoid Valve Output Port"),
        ("PSU", "12mm Tape", "Black on Silver", "12V 5A Master Power Supply"),
        ("BUCK", "9mm Tape", "Black on White", "LM2596 DC-DC Converter"),
        ("PROBE", "12mm Tape", "White on Blue", "Port J1 & Umbilical Probe Head"),
        ("LIGHT", "9mm / 12mm Tape", "Black on Yellow", "Probe Optical Sensor & Grow LED"),
        ("CO2", "9mm Tape", "Black on Yellow", "Probe NDIR Sensor"),
        ("T/H", "9mm Tape", "White on Green", "Probe Temp/Humidity Sensor"),
        ("INTAKE", "12mm Tape", "White on Black", "Port J3 & Intake Fan"),
        ("EXHAUST", "12mm Tape", "White on Black", "Port J2 & Exhaust Fan"),
        ("MIST", "12mm Tape", "White on Blue", "Port J4 & Misting Pump"),
    ]

    t4 = doc.add_table(rows=1, cols=4)
    t4.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(t4)
    cut_widths = [Inches(1.5), Inches(1.5), Inches(1.8), Inches(2.2)]
    format_row(t4.rows[0], ["SINGLE-WORD LABEL", "TAPE WIDTH", "COLOR SPEC", "APPLICATION TARGET"], is_header=True, col_widths=cut_widths)
    for idx, row in enumerate(table4_data):
        r = t4.add_row()
        format_row(r, row, is_header=False, col_widths=cut_widths, alt=(idx % 2 == 1))

    # Save to both paths
    root_path = os.path.abspath("KABUTECH_HIYAS_LABELS_SPECIFICATION.docx")
    assets_path = os.path.abspath("firmware/assets/KABUTECH_HIYAS_LABELS_SPECIFICATION.docx")
    
    doc.save(root_path)
    os.makedirs(os.path.dirname(assets_path), exist_ok=True)
    doc.save(assets_path)
    
    print(f"[SUCCESS] Updated Word Document saved to:")
    print(f"  1. {root_path}")
    print(f"  2. {assets_path}")

if __name__ == "__main__":
    build_document()
