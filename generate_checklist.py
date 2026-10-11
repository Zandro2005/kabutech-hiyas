import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

def calc_checklist_row_height(name, specs, notes):
    """Dynamically calculates comfortable row height for 11pt wrapped text."""
    l_name = max(1, (len(name) // 40) + 1)
    l_specs = max(1, (len(specs) // 52) + 1)
    l_notes = max(1, (len(notes) // 45) + 1)
    max_l = max(l_name, l_specs, l_notes)
    if max_l == 1:
        return 32
    elif max_l == 2:
        return 44
    elif max_l == 3:
        return 58
    else:
        return min(78, max_l * 20)

def create_kabutech_checklist(filepath):
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------
    # COLOR PALETTE (Modern Forest & Slate Theme - Agriculture IoT)
    # -------------------------------------------------------------
    NAVY_DARK = "1B3B2B"      # Deep Forest Green (Primary Header)
    NAVY_MED = "2E5A44"       # Medium Forest
    ACCENT_GREEN = "3D8B5F"   # Emerald Accent
    ACCENT_LIGHT = "E8F4EC"   # Mint/Light Green
    GRAY_BG = "F7F9F8"        # Ultra Light Gray/Green background
    WHITE = "FFFFFF"
    BORDER_COLOR = "D0D9D4"
    TEXT_DARK = "1C2826"
    TEXT_MUTED = "52605B"
    
    # -------------------------------------------------------------
    # TYPOGRAPHY (LARGE, CRISP, EXECUTIVE-SCALE FONTS)
    # -------------------------------------------------------------
    font_title = Font(name="Segoe UI", size=20, bold=True, color=WHITE)
    font_subtitle = Font(name="Segoe UI", size=11.5, italic=True, color="D2E5DA")
    font_instruction = Font(name="Segoe UI", size=11, bold=True, color="1B3B2B")
    font_section_hdr = Font(name="Segoe UI", size=13, bold=True, color=WHITE)
    font_tbl_hdr = Font(name="Segoe UI", size=11.5, bold=True, color=WHITE)
    font_cat_title = Font(name="Segoe UI", size=13, bold=True, color=NAVY_DARK)
    
    font_data_bold = Font(name="Segoe UI", size=11, bold=True, color=TEXT_DARK)
    font_data = Font(name="Segoe UI", size=11, color=TEXT_DARK)
    font_data_muted = Font(name="Segoe UI", size=10, color=TEXT_MUTED)
    
    font_price = Font(name="Segoe UI", size=11, color=TEXT_DARK)
    font_price_bold = Font(name="Segoe UI", size=11, bold=True, color=TEXT_DARK)
    
    font_subtotal = Font(name="Segoe UI", size=12.5, bold=True, color=NAVY_DARK)
    font_grand_total = Font(name="Segoe UI", size=14, bold=True, color=NAVY_DARK)
    
    font_kpi_lbl = Font(name="Segoe UI", size=11, bold=True, color=TEXT_MUTED)
    font_kpi_num = Font(name="Segoe UI", size=22, bold=True, color=NAVY_DARK)
    font_kpi_sub = Font(name="Segoe UI", size=10, color=TEXT_MUTED)

    # Fills
    fill_title = PatternFill(start_color=NAVY_DARK, end_color=NAVY_DARK, fill_type="solid")
    fill_tbl_hdr = PatternFill(start_color=NAVY_MED, end_color=NAVY_MED, fill_type="solid")
    fill_cat_hdr = PatternFill(start_color=ACCENT_LIGHT, end_color=ACCENT_LIGHT, fill_type="solid")
    fill_zebra = PatternFill(start_color=GRAY_BG, end_color=GRAY_BG, fill_type="solid")
    fill_subtotal = PatternFill(start_color="DCEFE3", end_color="DCEFE3", fill_type="solid")
    fill_grand_total = PatternFill(start_color="C2E2CE", end_color="C2E2CE", fill_type="solid")
    fill_kpi = PatternFill(start_color="F2F8F4", end_color="F2F8F4", fill_type="solid")

    # Borders
    thin_border_side = Side(border_style="thin", color=BORDER_COLOR)
    double_bottom_side = Side(border_style="double", color=NAVY_DARK)
    thick_top_side = Side(border_style="medium", color=NAVY_DARK)
    
    border_cell = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    border_subtotal = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    border_grand_total = Border(left=thin_border_side, right=thin_border_side, top=thick_top_side, bottom=double_bottom_side)
    border_kpi = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)

    # Alignments (All vertically centered for clean layout)
    align_center = Alignment(horizontal="center", vertical="center")
    align_left = Alignment(horizontal="left", vertical="center")
    align_left_wrap = Alignment(horizontal="left", vertical="center", wrap_text=True)
    align_right = Alignment(horizontal="right", vertical="center")

    # Number Formats
    CURRENCY_FORMAT = '₱#,##0.00'
    NUMBER_FORMAT = '#,##0'

    # -------------------------------------------------------------
    # DATA DEFINITION (68 ITEMS ACROSS 8 CATEGORIES)
    # -------------------------------------------------------------
    categories = [
        {
            "code": "A",
            "name": "Sensors & Probe Electronics (Quality-Grade)",
            "icon": "🔬",
            "items": [
                ("A1", "SHT31-D Temperature & Humidity Module", "±2% RH, ±0.3°C accuracy. Digital I2C bus. Factory calibrated. Superior to DHT11.", 1, "pc", 120, 180, "Shopee / Lazada / Makerlab PH", "SHT31-D sensor module I2C", "Essential for high-humidity mushroom chamber."),
                ("A2", "BH1750 Digital Light Sensor (GY-302)", "1–65535 lux, 16-bit resolution, direct lux output, I2C. Replaces unreliable LDR.", 1, "pc", 80, 150, "Shopee / Lazada / Circuit Rocks", "BH1750 GY-302 light sensor module", "Mount facing grow bags to track pinhead lighting."),
                ("A3", "SCD41 True NDIR CO₂ Sensor Module", "Photoacoustic NDIR, 400–5000 ppm, ±(40 ppm + 5%), I2C. True CO₂ measurement.", 1, "pc", 1800, 2500, "Shopee PH / AliExpress", "Sensirion SCD41 CO2 sensor module", "Most critical sensor for thesis credibility. Not MQ-135."),
                ("A4", "Capacitive Water Level Sensor (XKC-Y25-T12V)", "Non-contact liquid level, penetrates 20mm plastic wall, 5-24V DC, digital out.", 1, "pc", 250, 400, "Shopee / Lazada / Makerlab PH", "XKC-Y25-T12V non contact water level", "Outside reservoir mounting. No corrosion or electrolysis."),
                ("A5", "YF-S201 Water Flow Sensor (Hall Effect)", "1–30 L/min range, working pressure <1.75MPa, pulse output, food-grade nylon.", 1, "pc", 150, 220, "Shopee / Lazada", "YF-S201 water flow sensor 1/2 inch", "Monitors mist delivery & alerts if reservoir runs dry."),
                ("A6", "0.96\" SSD1306 OLED Display (I2C)", "128×64 resolution, monochrome white/blue, I2C address 0x3C, 3.3V/5V compatible.", 1, "pc", 100, 150, "Shopee / Lazada / Makerlab PH", "0.96 inch I2C OLED display SSD1306", "Cabinet face display for live readings and IP/WiFi."),
                ("A7", "Perfboard / Prototype PCB (5×7cm)", "FR-4 double-sided prototype board with plated through-holes, 2.54mm pitch.", 2, "pcs", 25, 50, "Shopee / Electronics Store", "5x7cm double sided prototype PCB FR4", "For mounting SHT31 + BH1750 + SCD41 inside probe.")
            ]
        },
        {
            "code": "B",
            "name": "Hanging Sensor Probe Housing (PVC Bell Reducer Design)",
            "icon": "🏠",
            "items": [
                ("B1", "2\" to 1\" PVC Bell Reducer (White/Gray)", "Schedule 40 PVC fitting. 2\" bell opening down to 1\" neck. Lightweight housing.", 1, "pc", 25, 45, "Local Hardware (Citi / Wilcon / Ace)", "2 x 1 PVC bell reducer fitting", "Forms inverted bell chamber shielding sensors from mist."),
                ("B2", "M16 or M20 IP68 Waterproof Cable Gland", "Nylon PA66 body, rubber clamping ring, IP68 rated, fits cables 4-8mm / 6-12mm.", 1, "pc", 30, 60, "Shopee / Lazada / Hardware", "M16 or M20 cable gland IP68 waterproof", "Screws into top neck; clamps cable and hangs probe."),
                ("B3", "PG7 Cable Gland (Nylon, IP68)", "Mini cable gland for 3-6.5mm cables, weatherproof sealing.", 2, "pcs", 15, 25, "Shopee / Hardware Store", "PG7 cable gland nylon IP68", "Internal cable strain relief and wire pass-throughs."),
                ("B4", "Fine Stainless Steel Mesh / Nylon Filter", "80-120 mesh SS304 wire cloth or dense nylon micron mesh.", 1, "sheet", 30, 60, "Hardware Store / Shopee", "Stainless steel 304 mesh screen 100 mesh", "Glued to 2\" bottom rim. Stops droplets, passes CO2."),
                ("B5", "PTFE Hydrophobic Membrane Disc (13-25mm)", "ePTFE breathable membrane, hydrophobic IP67 rating, gas permeable.", 1, "pc", 40, 80, "Shopee", "PTFE membrane disc sensor waterproof", "Glued over SCD41 aperture to prevent condensation."),
                ("B6", "PVC Solvent Cement & Rapid Epoxy", "100ml PVC cement + 2-part rapid epoxy (Pioneer/Devcon).", 1, "tube", 45, 80, "Any Hardware Store", "PVC cement Neltex + Pioneer epoxy", "Bonds screen to PVC rim and seals gland threads."),
                ("B7", "Printed Vinyl Label Sticker", "Weatherproof vinyl sticker: 'KABUTECH HIYAS — Probe SN-01'.", 1, "pc", 20, 30, "Print Shop / DIY Vinyl", "Waterproof vinyl sticker printing", "Professional thesis branding for probe assembly."),
                ("B8", "Nylon Cable Zip Ties (100mm)", "2.5mm × 100mm black nylon UV-resistant zip ties (Pack of 100).", 1, "pack", 30, 45, "Hardware Store / Shopee", "Nylon zip ties 100mm black pack", "Internal wire bundling and strain relief.")
            ]
        },
        {
            "code": "C",
            "name": "Controller Board & Core Electronics",
            "icon": "🧠",
            "items": [
                ("C1", "ESP32-S3 DevKit N16R8 (USB-C)", "16MB Flash, 8MB PSRAM, 240MHz Dual Core, WiFi 4 + BLE 5.0. Dual USB-C.", 1, "pc", 350, 500, "Shopee / Makerlab PH / Circuit Rocks", "ESP32-S3 N16R8 DevKit USB-C", "Verify 'N16R8' in listing for full memory & speed."),
                ("C2", "8-Channel Relay Module (5V, Optocoupled)", "8-ch optoisolated relay board, active LOW trigger, 10A 250VAC rating.", 1, "pc", 180, 280, "Shopee / Lazada / Makerlab PH", "8 channel relay module 5V optocoupler", "Controls: Exhaust, Intake, Mister, Light, Solenoid + 3 spares."),
                ("C3", "Logic Level Shifter (3.3V ↔ 5V, 4-Ch)", "Bi-directional I2C / digital logic level converter with BSS138 MOSFETs.", 1, "pc", 30, 50, "Shopee / Lazada", "4 channel logic level converter 3.3V 5V", "Protects ESP32 3.3V GPIOs driving 5V relay inputs."),
                ("C4", "Mini Breadboard / Expansion Strips", "170-tie point mini solderless breadboard with adhesive backing.", 2, "pcs", 25, 40, "Shopee / Electronics Store", "170 tie point mini breadboard", "Prototyping power rail distribution inside cabinet."),
                ("C5", "LM2596 DC-DC Step-Down Buck Converter", "Input 4-40V, Output 1.25-35V adjustable, 3A peak, high efficiency.", 1, "pc", 40, 70, "Shopee / Lazada", "LM2596 DC-DC buck converter module", "Steps down 12V rail to clean 5.0V for MCU & relays."),
                ("C6", "5V 1A Voltage Regulator Module (AMS1117)", "Linear regulator module with input/output filter capacitors & power LED.", 1, "pc", 20, 40, "Shopee / Electronics Store", "AMS1117 5V power supply module", "Dedicated filtered 5V rail to prevent relay-induced brownouts."),
                ("C7", "3-Position Toggle Switch (Auto/Off/Manual)", "Panel-mount 3-position (ON-OFF-ON) heavy-duty toggle switch.", 1, "pc", 30, 50, "Shopee / Hardware Store", "Toggle switch 3 position ON-OFF-ON panel mount", "Hardware override switch: Auto PID / Off / Manual Mode."),
                ("C8", "5mm LEDs (R, G, B, Y) + 220Ω Resistors", "Panel-mount 5mm LEDs with bezels + 1/4W 220Ω current limiting resistors.", 1, "set", 30, 40, "Shopee / Electronics Store", "5mm LED with bezel panel mount set", "Front panel indicators: Power (G), WiFi (B), Alarm (R), Mode (Y)."),
                ("C9", "Momentary Push Button (12mm, Panel-Mount)", "Waterproof momentary push button, normally open (NO), flush metal head.", 1, "pc", 15, 30, "Shopee / Electronics Store", "12mm waterproof momentary push button metal", "External Cabinet System Reset / WiFi Provision button."),
                ("C10", "10kΩ 1/4W Resistors (Pack of 20)", "1% tolerance 1/4W metal film through-hole resistors.", 1, "pack", 20, 30, "Shopee / Electronics Store", "10k ohm 1/4W metal film resistors pack", "I2C pull-ups, button debouncing, switch logic."),
                ("C11", "1N4007 Rectifier Diodes (Pack of 10)", "1000V 1A standard recovery rectifier diode, DO-41 package.", 1, "pack", 15, 30, "Shopee / Electronics Store", "1N4007 diode pack 10pcs", "Flyback diode protection across pump, solenoid & fan coils."),
                ("C12", "Inline Blade Fuse Holder (16AWG) + 5A Fuses", "Waterproof automotive inline fuse holder + 5A blade fuses (Pack of 5).", 2, "pcs", 25, 50, "Shopee / Automotive Store", "Inline blade fuse holder waterproof 16AWG", "Protects main 12V rail and high-draw actuator branches.")
            ]
        },
        {
            "code": "D",
            "name": "Power Supply & Distribution",
            "icon": "⚡",
            "items": [
                ("D1", "12V 5A (60W) Enclosed Switching PSU", "Metal mesh chassis, universal AC in (110-240V), regulated 12VDC ±1%.", 1, "pc", 600, 1000, "Shopee / Lazada / Alexan", "12V 5A switching power supply metal case", "Powers entire system safely: ESP32, fans, pump, valve."),
                ("D2", "IEC C14 Inlet Socket with Fuse & Switch", "Panel-mount AC socket with built-in 5x20mm fuse drawer & illuminated switch.", 1, "pc", 60, 100, "Shopee / Lazada / Alexan", "IEC C14 power socket with fuse switch panel mount", "Professional computer kettle cord inlet on enclosure face."),
                ("D3", "220V AC Power Cord (3-Prong PH, 1.5m)", "Heavy-duty 3-conductor (G, N, L) cable, rated 250V 10A, molded C13 plug.", 1, "pc", 80, 150, "Hardware Store / Shopee", "PC power cord 3 prong IEC C13 1.5m", "Standard wall plug with true safety earth grounding."),
                ("D4", "12-Position Terminal Block Strip (15A)", "Dual-row screw terminal strip with clear cover, 15A 600V rated.", 2, "pcs", 30, 60, "Shopee / Hardware Store", "TB-1512 barrier terminal block 12 position 15A", "Organized 12V (+), GND (-), and relay output distribution."),
                ("D5", "Wago 221 Lever Connectors (3-Wire, 5-Pack)", "Tool-free lever wire connectors, supports 24-12 AWG solid & stranded.", 2, "packs", 50, 80, "Shopee / Lazada", "Wago 221-413 3 wire lever connector", "Safe, reusable vibration-proof wire splicing inside box."),
                ("D6", "KCD1 Rocker Switch (ON-OFF, 220V 6A)", "Snap-in SPST rocker switch with red neon indicator, 19×13mm cutout.", 1, "pc", 25, 40, "Shopee / Hardware Store", "KCD1 rocker switch illuminated red 3 pin", "Master power switch on controller enclosure exterior."),
                ("D7", "Metal Oxide Varistor MOV (275V, 10D431K)", "275VAC RMS surge suppressor, absorbs grid spikes & brownout transients.", 1, "pc", 25, 30, "Shopee / Electronics Store", "Varistor 10D431K 275V surge protector", "Wired across AC Live & Neutral at inlet for surge protection.")
            ]
        },
        {
            "code": "E",
            "name": "Connectors & Wiring",
            "icon": "🔌",
            "items": [
                ("E1", "GX16 4-Pin Aviation Connectors (M+F Sets)", "16mm metal chassis socket + cable plug, screw-locking, 5A rated.", 6, "sets", 50, 100, "Shopee / Lazada", "GX16 4 pin aviation connector male female", "Detachable ports: Exhaust, Intake, Mister, Light, Probe, Flow."),
                ("E2", "4-Core Shielded Cable (22AWG, 3 Meters)", "4 stranded copper cores + aluminum foil shield + drain wire, flexible PVC.", 1, "roll (3m)", 100, 180, "Shopee / Lazada", "4 core shielded cable 22AWG signal wire", "Controller to probe umbilical. Shielding stops I2C noise."),
                ("E3", "18 AWG Silicone Stranded Wire (Red + Black)", "High-temp (200°C) flexible tinned copper silicone wire (5m red, 5m black).", 2, "rolls", 40, 60, "Shopee / Lazada", "18 AWG silicone wire red black 5m", "Main 12V high-current distribution inside cabinet."),
                ("E4", "22 AWG Hookup Wire Assorted (6 Colors, 5m)", "PVC insulated tinned copper wire in 6 distinct colors.", 1, "set", 60, 100, "Shopee / Electronics Store", "22 AWG hookup wire kit assorted colors", "Internal signal wiring: ESP32 to shifters, display, LEDs."),
                ("E5", "Dupont Jumper Wires (40-Pin, 20cm, Assorted)", "Multicolored breadboard jumpers (M-M, M-F, F-F).", 3, "sets", 30, 50, "Shopee / Lazada", "Dupont wire 20cm 40 pin M-M M-F F-F", "Bench prototyping and test jumpers."),
                ("E6", "IP68 Nylon Cable Glands (PG9 / PG11)", "Weatherproof cable entry glands with rubber sealing washers & locknuts.", 6, "pcs", 15, 30, "Shopee / Hardware Store", "PG9 PG11 cable gland IP68 nylon", "Watertight cable pass-throughs into enclosure."),
                ("E7", "Heat Shrink Tubing Kit (120+ pcs Assorted)", "Polyolefin 2:1 shrink tubing in assorted diameters (1.5mm-10mm).", 1, "kit", 60, 100, "Shopee / Lazada", "Heat shrink tubing kit assorted sizes", "Insulates aviation pins, splice joints, and LED legs."),
                ("E8", "JST-XH 2.54mm Connector Kit (2P, 3P, 4P)", "Male PCB headers + female crimp housings + pins in organizer box.", 1, "kit", 50, 80, "Shopee / Lazada", "JST-XH 2.54mm connector kit with crimp pins", "Modular disconnects for sensors & display modules."),
                ("E9", "40-Pin 2.54mm Female Header Strips", "Gold-plated through-hole female socket strips.", 2, "pcs", 15, 20, "Shopee / Electronics Store", "40 pin 2.54mm female header socket strip", "Sockets for ESP32 DevKit so MCU is pluggable/swappable."),
                ("E10", "Rosin Core Solder Wire (60/40, 0.8mm, 50g)", "High purity 60% tin / 40% lead with 2.2% rosin flux core.", 1, "roll", 50, 80, "Shopee / Hardware Store", "Solder wire 60/40 0.8mm rosin core 50g", "Permanent soldering of boards, diodes, and aviation plugs.")
            ]
        },
        {
            "code": "F",
            "name": "Actuators (The Things Being Controlled)",
            "icon": "🌀",
            "items": [
                ("F1", "12V DC Exhaust Fan (120mm / 4-Inch)", "120×120×25mm, 12V DC, ball bearing, moisture-resistant, >70 CFM.", 1, "pc", 180, 400, "Shopee / Lazada", "12V 120mm cooling fan ball bearing high airflow", "Extracts stale CO2 and heat from grow room ceiling."),
                ("F2", "12V DC Circulation / Intake Fan (80-120mm)", "12V DC, brushless, 0.2A, low noise with finger protection grill.", 1, "pc", 130, 300, "Shopee / Lazada", "12V DC brushless fan 80mm or 120mm with grill", "Draws in fresh filtered air & circulates humidity."),
                ("F3", "12V DC High-Pressure Misting Pump (60W)", "Self-priming diaphragm pump, 4-5 L/min, 0.8 MPa (115 PSI), auto pressure switch.", 1, "pc", 350, 800, "Shopee / Lazada", "12V diaphragm pump misting 60W high pressure", "Atomizes water into ultra-fine fog without wetting beds."),
                ("F4", "Brass Misting Nozzles (0.3mm Orifice)", "Solid brass with stainless orifice, anti-drip spring, 20-70 bar rating.", 5, "pcs", 15, 30, "Shopee / Lazada / Hardware", "0.3mm brass misting nozzle anti drip", "Overhead spray nozzles creating 15-30 micron fog."),
                ("F5", "Misting Tubing Kit (6mm PE Tubing 5m + Tees)", "5m 1/4\" (6mm) PE tubing + 5 slip-lock tee fittings + 1 end plug.", 1, "kit", 150, 350, "Shopee / Lazada", "Misting system kit 6mm PE pipe slip lock fittings", "Overhead pipe manifold connecting pump to brass nozzles."),
                ("F6", "12V DC Solenoid Valve (1/2\" NC)", "Direct-acting 12V DC valve, normally closed (NC), brass or nylon body.", 1, "pc", 250, 450, "Shopee / Lazada / Makerlab PH", "12V DC electric solenoid valve 1/2 inch normally closed", "Primary water shutoff. Shuts closed if power fails."),
                ("F7", "Push-Fit Water Fittings (1/2\" Male to 6mm)", "Food-grade POM push-fit adapter, 1/2\" BSP thread to 1/4\" (6mm) OD tube.", 2, "pcs", 30, 60, "Hardware Store / Shopee", "Quick connect fitting 1/2 male thread to 1/4 6mm tube", "Leak-free transition from solenoid/pump to PE misting tube."),
                ("F8", "12V Full-Spectrum LED Grow Light Strip (1m)", "12V SMD5050, 4:1 Red:Blue + White spectrum, IP65 waterproof silicone jacket.", 1, "strip", 300, 800, "Shopee / Lazada", "12V full spectrum LED grow light strip waterproof IP65", "Stimulates oyster mushroom pinhead & cap formation."),
                ("F9", "Water Reservoir Container (5-10 Liters)", "Heavy-duty translucent HDPE plastic container with tight lid & drain port.", 1, "pc", 80, 200, "Hardware Store / Grocery", "Plastic container with lid 10L translucent", "Dedicated clean water supply; holds capacitive level sensor."),
                ("F10", "PTFE Thread Seal Teflon Tape (1/2\" × 10m)", "Standard density PTFE sealant tape for plumbing connections.", 1, "roll", 25, 30, "Any Hardware Store", "Teflon tape 1/2 inch", "Guarantees zero leaks on all threaded water joints."),
                ("F11", "Stainless Hose Clamps (10-16mm, SS304)", "304 stainless steel band & screw, rustproof in 95% humidity.", 4, "pcs", 10, 15, "Hardware Store", "Stainless hose clamps 10-16mm", "Secures intake/discharge hoses to pump barbs under pressure."),
                ("F12", "6mm Inline One-Way Check Valve", "Diaphragm non-return valve, cracking pressure 0.01 MPa, fits 6mm tube.", 1, "pc", 40, 90, "Shopee / Aquarium Store", "Inline one way check valve 6mm", "Prevents backflow and keeps pump head primed.")
            ]
        },
        {
            "code": "G",
            "name": "Enclosure & Mounting",
            "icon": "📦",
            "items": [
                ("G1", "IP65 ABS Waterproof Enclosure (255×200×80mm)", "Weatherproof ABS box with rubber silicone sealing gasket & brass inserts.", 1, "pc", 300, 500, "Shopee / Lazada / Hardware", "IP65 waterproof junction box ABS 255x200x80", "Houses ESP32, PSU, relays, and terminal blocks safely."),
                ("G2", "35mm DIN Rail (15cm) + Mounting Clips", "Standard slotted steel DIN rail 35mm + modular mounting clips & brackets.", 1, "set", 60, 120, "Shopee / Lazada", "DIN rail 35mm 15cm with mounting brackets", "Clean industrial mounting for terminal blocks and PSU."),
                ("G3", "M3 Nylon PCB Standoffs / Spacers Kit", "Assorted M3 nylon threaded pillars (6-20mm), nuts, and screws.", 1, "set", 30, 50, "Shopee / Electronics Store", "M3 nylon hex standoff assortment kit", "Mounts ESP32 board and perfboards elevated off base."),
                ("G4", "Wall-Mount Brackets + Screws (Stainless)", "304 stainless steel L-brackets with masonry wall plugs & screws.", 1, "set", 30, 60, "Hardware Store", "Stainless steel mounting bracket with screws", "Secures controller cabinet firmly to mushroom house wall."),
                ("G5", "Rubber Wiring Grommets Assortment", "Weatherproof nitrile rubber grommets (10mm to 25mm).", 1, "pack", 30, 50, "Shopee / Hardware Store", "Rubber grommets assortment kit", "Protects wiring where cables pass through drilled holes.")
            ]
        },
        {
            "code": "H",
            "name": "Miscellaneous, Tools & Fabrication Consumables",
            "icon": "🔧",
            "items": [
                ("H1", "USB-C Data & Sync Cable (1.0m, Fast Sync)", "28/24 AWG shielded copper cable supporting high-speed serial data (not charge-only).", 1, "pc", 50, 100, "Shopee / Phone Accessories Store", "USB-C data cable 1m high speed", "Required for flashing firmware and Serial Monitor logs."),
                ("H2", "4–20mm Titanium HSS Step Drill Bit", "High-speed steel conical step bit with 9 increment steps (4-20mm).", 1, "pc", 100, 200, "Shopee / Hardware Store", "Step drill bit 4-20mm titanium HSS", "Cuts clean 16mm holes for GX16 sockets, glands & switches."),
                ("H3", "Electrical Tape (3M Scotch or equivalent)", "Heavy-duty vinyl electrical insulating tape, flame retardant.", 2, "rolls", 25, 40, "Any Hardware Store", "3M electrical tape original black", "General wire insulation, color identification, and bundling."),
                ("H4", "3M VHB Double-Sided Foam Tape (12mm × 3m)", "High-strength acrylic foam bonding tape, extreme moisture resistance.", 1, "roll", 40, 80, "Shopee / Hardware Store", "3M VHB double sided tape heavy duty", "Mounts OLED display and indicator bezels to cabinet face."),
                ("H5", "Clear Weatherproof Silicone Sealant (100ml)", "100% RTV silicone sealant, mold-resistant, flexible waterproof seal.", 1, "tube", 80, 120, "Any Hardware Store", "Clear silicone sealant RTV waterproof", "Seals perimeter of all cutouts to keep enclosure IP65."),
                ("H6", "Printable Weatherproof Vinyl Label Sheets", "Waterproof adhesive vinyl sticker paper for labeling ports & switches.", 1, "set", 30, 50, "Shopee / Print Shop", "Waterproof label sticker paper A4 vinyl", "Clear labeling: [MAINS], [EXHAUST], [MISTER], [LIGHT], [PROBE]."),
                ("H7", "40W Soldering Iron with Stand & Sponge", "220V 40W pencil iron with fine tip, wire stand & cleaning sponge.", 1, "pc", 0, 350, "Shopee / Hardware Store (0 if owned)", "Soldering iron 40W with stand", "Essential for perfboard, diodes, and GX16 connectors.")
            ]
        }
    ]

    # -------------------------------------------------------------
    # SHEET 1: 📋 MATERIALS CHECKLIST
    # -------------------------------------------------------------
    ws_chk = wb.active
    wb.remove(ws_chk) # remove default sheet to control order
    ws_checklist = wb.create_sheet(title="📋 Materials Checklist")
    ws_checklist.views.sheetView[0].showGridLines = True

    # Title Banner (Rows 1-2)
    ws_checklist.merge_cells("A1:O1")
    ws_checklist["A1"] = "🍄 KABUTECH HIYAS — COMPLETE MATERIALS & PROCUREMENT CHECKLIST"
    ws_checklist["A1"].font = font_title
    ws_checklist["A1"].fill = fill_title
    ws_checklist["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_checklist.row_dimensions[1].height = 48

    ws_checklist.merge_cells("A2:O2")
    ws_checklist["A2"] = "Precision Mushroom Grow House Automation | Target Budget: ₱15,000 PHP | 68 Components | High-Quality Digital Sensors"
    ws_checklist["A2"].font = font_subtitle
    ws_checklist["A2"].fill = fill_title
    ws_checklist["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_checklist.row_dimensions[2].height = 28

    # Instructions row (Row 3)
    ws_checklist.merge_cells("A3:O3")
    ws_checklist["A3"] = "💡 INSTRUCTIONS: Update 'Status' dropdown (To Buy / Ordered / Received / In Stock) as you purchase items. Enter your 'Actual Spent (₱)' to track budget in real-time."
    ws_checklist["A3"].font = font_instruction
    ws_checklist["A3"].fill = PatternFill(start_color="E2F0D9", end_color="E2F0D9", fill_type="solid")
    ws_checklist["A3"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_checklist.row_dimensions[3].height = 32

    # Column Headers (Row 4) - WIDENED SIGNIFICANTLY TO PREVENT TEXT CLIPPING OR NUMERIC ###
    headers = [
        ("Status", 16),                                # A
        ("Code", 11),                                  # B
        ("Component Name", 44),                        # C
        ("Category", 26),                              # D
        ("Technical Specifications & Rationale", 58),  # E
        ("Qty", 9),                                   # F
        ("Unit", 12),                                  # G
        ("Min Est (₱)", 17),                           # H
        ("Max Est (₱)", 17),                           # I
        ("Min Total (₱)", 18),                         # J
        ("Max Total (₱)", 18),                         # K
        ("Actual Spent (₱)", 20),                      # L
        ("Recommended Vendor / Store", 34),            # M
        ("Search Keywords / Model", 40),               # N
        ("Procurement & Assembly Notes", 50)           # O
    ]

    ws_checklist.row_dimensions[4].height = 36
    for col_idx, (hdr_text, col_width) in enumerate(headers, 1):
        cell = ws_checklist.cell(row=4, column=col_idx, value=hdr_text)
        cell.font = font_tbl_hdr
        cell.fill = fill_tbl_hdr
        cell.alignment = align_center if col_idx in [1, 2, 6, 7] else (align_right if col_idx in [8, 9, 10, 11, 12] else align_left)
        cell.border = border_cell
        ws_checklist.column_dimensions[get_column_letter(col_idx)].width = col_width

    # Data Validation for Status Column (A)
    status_validation = DataValidation(
        type="list",
        formula1='"To Buy,Ordered,Received,In Stock,Not Needed"',
        allow_blank=True
    )
    status_validation.error = 'Please select a valid status from the list'
    status_validation.errorTitle = 'Invalid Status'
    status_validation.prompt = 'Select procurement status'
    status_validation.promptTitle = 'Status'
    ws_checklist.add_data_validation(status_validation)

    current_row = 5
    category_summary_info = [] # Store for Executive Summary sheet and formulas

    for cat in categories:
        cat_start_data_row = current_row + 1
        
        # Category Banner Row
        ws_checklist.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=15)
        cat_cell = ws_checklist.cell(row=current_row, column=1, value=f"{cat['icon']} CATEGORY {cat['code']}: {cat['name'].upper()}")
        cat_cell.font = font_cat_title
        cat_cell.fill = fill_cat_hdr
        cat_cell.alignment = Alignment(horizontal="left", vertical="center", indent=1)
        for c in range(1, 16):
            ws_checklist.cell(row=current_row, column=c).border = border_cell
            ws_checklist.cell(row=current_row, column=c).fill = fill_cat_hdr
        ws_checklist.row_dimensions[current_row].height = 34
        current_row += 1

        # Data Rows
        item_start_row = current_row
        for item_idx, item in enumerate(cat["items"]):
            code, name, specs, qty, unit, min_p, max_p, store, search_kw, notes = item
            
            # Alternating row fill
            row_fill = fill_zebra if item_idx % 2 == 1 else None

            # Col A: Status
            c_status = ws_checklist.cell(row=current_row, column=1, value="To Buy")
            status_validation.add(c_status)
            c_status.alignment = align_center
            c_status.font = font_data_bold
            
            # Col B: Code
            c_code = ws_checklist.cell(row=current_row, column=2, value=code)
            c_code.alignment = align_center
            c_code.font = font_data_bold
            
            # Col C: Name
            c_name = ws_checklist.cell(row=current_row, column=3, value=name)
            c_name.alignment = align_left_wrap
            c_name.font = font_data_bold
            
            # Col D: Category
            c_cat = ws_checklist.cell(row=current_row, column=4, value=cat["name"].split(" (")[0])
            c_cat.alignment = align_left
            c_cat.font = font_data_muted

            # Col E: Specs
            c_specs = ws_checklist.cell(row=current_row, column=5, value=specs)
            c_specs.alignment = align_left_wrap
            c_specs.font = font_data

            # Col F: Qty
            c_qty = ws_checklist.cell(row=current_row, column=6, value=qty)
            c_qty.alignment = align_center
            c_qty.font = font_data_bold
            c_qty.number_format = NUMBER_FORMAT

            # Col G: Unit
            c_unit = ws_checklist.cell(row=current_row, column=7, value=unit)
            c_unit.alignment = align_center
            c_unit.font = font_data_muted

            # Col H: Min Price
            c_min_p = ws_checklist.cell(row=current_row, column=8, value=min_p)
            c_min_p.alignment = align_right
            c_min_p.font = font_price
            c_min_p.number_format = CURRENCY_FORMAT

            # Col I: Max Price
            c_max_p = ws_checklist.cell(row=current_row, column=9, value=max_p)
            c_max_p.alignment = align_right
            c_max_p.font = font_price
            c_max_p.number_format = CURRENCY_FORMAT

            # Col J: Min Total (Formula)
            c_min_tot = ws_checklist.cell(row=current_row, column=10, value=f"=F{current_row}*H{current_row}")
            c_min_tot.alignment = align_right
            c_min_tot.font = font_price_bold
            c_min_tot.number_format = CURRENCY_FORMAT

            # Col K: Max Total (Formula)
            c_max_tot = ws_checklist.cell(row=current_row, column=11, value=f"=F{current_row}*I{current_row}")
            c_max_tot.alignment = align_right
            c_max_tot.font = font_price_bold
            c_max_tot.number_format = CURRENCY_FORMAT

            # Col L: Actual Spent (Empty for user)
            c_act = ws_checklist.cell(row=current_row, column=12, value=None)
            c_act.alignment = align_right
            c_act.font = font_price_bold
            c_act.number_format = CURRENCY_FORMAT

            # Col M: Store
            c_store = ws_checklist.cell(row=current_row, column=13, value=store)
            c_store.alignment = align_left_wrap
            c_store.font = font_data

            # Col N: Search Keywords
            c_kw = ws_checklist.cell(row=current_row, column=14, value=search_kw)
            c_kw.alignment = align_left_wrap
            c_kw.font = font_data_muted

            # Col O: Notes
            c_notes = ws_checklist.cell(row=current_row, column=15, value=notes)
            c_notes.alignment = align_left_wrap
            c_notes.font = font_data

            # Apply borders and row fills
            for col_c in range(1, 16):
                cell = ws_checklist.cell(row=current_row, column=col_c)
                cell.border = border_cell
                if row_fill:
                    cell.fill = row_fill

            # Calculate comfortable row height to avoid any text clipping
            ws_checklist.row_dimensions[current_row].height = calc_checklist_row_height(name, specs, notes)
            current_row += 1

        item_end_row = current_row - 1

        # Subtotal Row for this Category
        ws_checklist.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=9)
        sub_label = ws_checklist.cell(row=current_row, column=1, value=f"Subtotal — Category {cat['code']} ({cat['name'].split(' (')[0]}):")
        sub_label.font = font_subtotal
        sub_label.alignment = Alignment(horizontal="right", vertical="center")
        
        c_sub_min = ws_checklist.cell(row=current_row, column=10, value=f"=SUM(J{item_start_row}:J{item_end_row})")
        c_sub_min.font = font_subtotal
        c_sub_min.alignment = align_right
        c_sub_min.number_format = CURRENCY_FORMAT

        c_sub_max = ws_checklist.cell(row=current_row, column=11, value=f"=SUM(K{item_start_row}:K{item_end_row})")
        c_sub_max.font = font_subtotal
        c_sub_max.alignment = align_right
        c_sub_max.number_format = CURRENCY_FORMAT

        c_sub_act = ws_checklist.cell(row=current_row, column=12, value=f"=SUM(L{item_start_row}:L{item_end_row})")
        c_sub_act.font = font_subtotal
        c_sub_act.alignment = align_right
        c_sub_act.number_format = CURRENCY_FORMAT

        for col_c in range(1, 16):
            cell = ws_checklist.cell(row=current_row, column=col_c)
            cell.border = border_subtotal
            cell.fill = fill_subtotal

        ws_checklist.row_dimensions[current_row].height = 34

        category_summary_info.append({
            "code": cat["code"],
            "name": cat["name"],
            "item_count": len(cat["items"]),
            "subtotal_row": current_row,
            "min_formula": f"'📋 Materials Checklist'!J{current_row}",
            "max_formula": f"'📋 Materials Checklist'!K{current_row}",
            "act_formula": f"'📋 Materials Checklist'!L{current_row}"
        })

        current_row += 1

    # Empty spacer row before grand total
    ws_checklist.row_dimensions[current_row].height = 16
    current_row += 1

    # Grand Total Row
    ws_checklist.merge_cells(start_row=current_row, start_column=1, end_row=current_row, end_column=9)
    grand_label = ws_checklist.cell(row=current_row, column=1, value="★ GRAND TOTAL (ALL 68 COMPONENTS):")
    grand_label.font = font_grand_total
    grand_label.alignment = Alignment(horizontal="right", vertical="center")

    sub_rows = [str(info["subtotal_row"]) for info in category_summary_info]
    min_sum_expr = "+".join([f"J{r}" for r in sub_rows])
    max_sum_expr = "+".join([f"K{r}" for r in sub_rows])
    act_sum_expr = "+".join([f"L{r}" for r in sub_rows])

    c_grand_min = ws_checklist.cell(row=current_row, column=10, value=f"={min_sum_expr}")
    c_grand_min.font = font_grand_total
    c_grand_min.alignment = align_right
    c_grand_min.number_format = CURRENCY_FORMAT

    c_grand_max = ws_checklist.cell(row=current_row, column=11, value=f"={max_sum_expr}")
    c_grand_max.font = font_grand_total
    c_grand_max.alignment = align_right
    c_grand_max.number_format = CURRENCY_FORMAT

    c_grand_act = ws_checklist.cell(row=current_row, column=12, value=f"={act_sum_expr}")
    c_grand_act.font = font_grand_total
    c_grand_act.alignment = align_right
    c_grand_act.number_format = CURRENCY_FORMAT

    for col_c in range(1, 16):
        cell = ws_checklist.cell(row=current_row, column=col_c)
        cell.border = border_grand_total
        cell.fill = fill_grand_total

    ws_checklist.row_dimensions[current_row].height = 40
    grand_total_row_checklist = current_row

    # Freeze panes at row 5 (header stays visible while scrolling)
    ws_checklist.freeze_panes = "C5"


    # -------------------------------------------------------------
    # SHEET 2: 📊 BUDGET & STATUS SUMMARY (DASHBOARD)
    # -------------------------------------------------------------
    ws_summary = wb.create_sheet(title="📊 Executive Summary")
    ws_summary.views.sheetView[0].showGridLines = True

    # Title
    ws_summary.merge_cells("A1:G1")
    ws_summary["A1"] = "🍄 KABUTECH HIYAS — EXECUTIVE BUDGET & PROCUREMENT DASHBOARD"
    ws_summary["A1"].font = font_title
    ws_summary["A1"].fill = fill_title
    ws_summary["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_summary.row_dimensions[1].height = 48

    ws_summary.merge_cells("A2:G2")
    ws_summary["A2"] = "Live Project Financial Overview, Category Allocations & Status Tracking"
    ws_summary["A2"].font = font_subtitle
    ws_summary["A2"].fill = fill_title
    ws_summary["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_summary.row_dimensions[2].height = 28

    # Set Column Dimensions for Summary Sheet (Generously widened)
    summary_col_widths = [16, 48, 16, 20, 20, 20, 20]
    for c_idx, width in enumerate(summary_col_widths, 1):
        ws_summary.column_dimensions[get_column_letter(c_idx)].width = width

    # KPI Summary Cards (Row 4 to 6)
    ws_summary.row_dimensions[4].height = 26
    ws_summary.row_dimensions[5].height = 44
    ws_summary.row_dimensions[6].height = 26

    # KPI 1: Budget (Col A:B)
    ws_summary.merge_cells("A4:B4")
    ws_summary["A4"] = "TOTAL ALLOCATED BUDGET"
    ws_summary["A4"].font = font_kpi_lbl
    ws_summary["A4"].alignment = align_center

    ws_summary.merge_cells("A5:B5")
    ws_summary["A5"] = 15000
    ws_summary["A5"].font = font_kpi_num
    ws_summary["A5"].number_format = CURRENCY_FORMAT
    ws_summary["A5"].alignment = align_center

    ws_summary.merge_cells("A6:B6")
    ws_summary["A6"] = "Fixed Project Ceiling"
    ws_summary["A6"].font = font_kpi_sub
    ws_summary["A6"].alignment = align_center

    for r in range(4, 7):
        for c in range(1, 3):
            cell = ws_summary.cell(row=r, column=c)
            cell.fill = fill_kpi
            cell.border = border_kpi

    # KPI 2: Est Min Total (Col C)
    ws_summary["C4"] = "EST. MIN TOTAL"
    ws_summary["C4"].font = font_kpi_lbl
    ws_summary["C4"].alignment = align_center
    ws_summary["C5"] = f"='📋 Materials Checklist'!J{grand_total_row_checklist}"
    ws_summary["C5"].font = font_kpi_num
    ws_summary["C5"].number_format = CURRENCY_FORMAT
    ws_summary["C5"].alignment = align_center
    ws_summary["C6"] = "Smart Shopee / Lazada"
    ws_summary["C6"].font = font_kpi_sub
    ws_summary["C6"].alignment = align_center
    for r in range(4, 7):
        ws_summary.cell(row=r, column=3).fill = fill_kpi
        ws_summary.cell(row=r, column=3).border = border_kpi

    # KPI 3: Est Max Total (Col D)
    ws_summary["D4"] = "EST. MAX TOTAL"
    ws_summary["D4"].font = font_kpi_lbl
    ws_summary["D4"].alignment = align_center
    ws_summary["D5"] = f"='📋 Materials Checklist'!K{grand_total_row_checklist}"
    ws_summary["D5"].font = font_kpi_num
    ws_summary["D5"].number_format = CURRENCY_FORMAT
    ws_summary["D5"].alignment = align_center
    ws_summary["D6"] = "Worst-case retail buffer"
    ws_summary["D6"].font = font_kpi_sub
    ws_summary["D6"].alignment = align_center
    for r in range(4, 7):
        ws_summary.cell(row=r, column=4).fill = fill_kpi
        ws_summary.cell(row=r, column=4).border = border_kpi

    # KPI 4: Actual Spent (Col E)
    ws_summary["E4"] = "ACTUAL SPENT"
    ws_summary["E4"].font = font_kpi_lbl
    ws_summary["E4"].alignment = align_center
    ws_summary["E5"] = f"='📋 Materials Checklist'!L{grand_total_row_checklist}"
    ws_summary["E5"].font = font_kpi_num
    ws_summary["E5"].number_format = CURRENCY_FORMAT
    ws_summary["E5"].alignment = align_center
    ws_summary["E6"] = "Tracked from purchases"
    ws_summary["E6"].font = font_kpi_sub
    ws_summary["E6"].alignment = align_center
    for r in range(4, 7):
        ws_summary.cell(row=r, column=5).fill = fill_kpi
        ws_summary.cell(row=r, column=5).border = border_kpi

    # KPI 5: Budget Remaining (Col F)
    ws_summary["F4"] = "BUDGET REMAINING"
    ws_summary["F4"].font = font_kpi_lbl
    ws_summary["F4"].alignment = align_center
    ws_summary["F5"] = "=A5-E5"
    ws_summary["F5"].font = Font(name="Segoe UI", size=22, bold=True, color="1E7E34")
    ws_summary["F5"].number_format = CURRENCY_FORMAT
    ws_summary["F5"].alignment = align_center
    ws_summary["F6"] = "Surplus / Buffer"
    ws_summary["F6"].font = font_kpi_sub
    ws_summary["F6"].alignment = align_center
    for r in range(4, 7):
        ws_summary.cell(row=r, column=6).fill = PatternFill(start_color="EAF5EC", end_color="EAF5EC", fill_type="solid")
        ws_summary.cell(row=r, column=6).border = border_kpi

    # KPI 6: Total Items (Col G)
    ws_summary["G4"] = "TOTAL ITEMS"
    ws_summary["G4"].font = font_kpi_lbl
    ws_summary["G4"].alignment = align_center
    ws_summary["G5"] = 68
    ws_summary["G5"].font = font_kpi_num
    ws_summary["G5"].number_format = NUMBER_FORMAT
    ws_summary["G5"].alignment = align_center
    ws_summary["G6"] = "Across 8 Categories"
    ws_summary["G6"].font = font_kpi_sub
    ws_summary["G6"].alignment = align_center
    for r in range(4, 7):
        ws_summary.cell(row=r, column=7).fill = fill_kpi
        ws_summary.cell(row=r, column=7).border = border_kpi

    # Category Breakdown Table
    ws_summary.merge_cells("A8:G8")
    ws_summary["A8"] = "📊 CATEGORY BUDGET BREAKDOWN & SPENDING SUMMARY"
    ws_summary["A8"].font = font_section_hdr
    ws_summary["A8"].font = Font(name="Segoe UI", size=13, bold=True, color=NAVY_DARK)
    ws_summary["A8"].alignment = Alignment(horizontal="left", vertical="center")
    ws_summary.row_dimensions[8].height = 34

    cat_headers = [
        "Cat Code",
        "Category Description",
        "Items Count",
        "Est. Min (₱)",
        "Est. Max (₱)",
        "Actual Spent (₱)",
        "% of Budget (Max)"
    ]

    ws_summary.row_dimensions[9].height = 34
    for col_idx, hdr_text in enumerate(cat_headers, 1):
        cell = ws_summary.cell(row=9, column=col_idx, value=hdr_text)
        cell.font = font_tbl_hdr
        cell.fill = fill_tbl_hdr
        cell.alignment = align_center if col_idx in [1, 3] else (align_right if col_idx in [4, 5, 6, 7] else align_left)
        cell.border = border_cell

    s_row = 10
    for info in category_summary_info:
        # Col A: Code
        c_code = ws_summary.cell(row=s_row, column=1, value=f"Category {info['code']}")
        c_code.font = font_data_bold
        c_code.alignment = align_center
        c_code.border = border_cell

        # Col B: Name
        c_name = ws_summary.cell(row=s_row, column=2, value=info["name"])
        c_name.font = font_data
        c_name.alignment = align_left
        c_name.border = border_cell

        # Col C: Count
        c_cnt = ws_summary.cell(row=s_row, column=3, value=info["item_count"])
        c_cnt.font = font_data_bold
        c_cnt.alignment = align_center
        c_cnt.border = border_cell
        c_cnt.number_format = NUMBER_FORMAT

        # Col D: Min Formula
        c_min = ws_summary.cell(row=s_row, column=4, value=f"={info['min_formula']}")
        c_min.font = font_price
        c_min.alignment = align_right
        c_min.border = border_cell
        c_min.number_format = CURRENCY_FORMAT

        # Col E: Max Formula
        c_max = ws_summary.cell(row=s_row, column=5, value=f"={info['max_formula']}")
        c_max.font = font_price
        c_max.alignment = align_right
        c_max.border = border_cell
        c_max.number_format = CURRENCY_FORMAT

        # Col F: Actual Formula
        c_act = ws_summary.cell(row=s_row, column=6, value=f"={info['act_formula']}")
        c_act.font = font_price_bold
        c_act.alignment = align_right
        c_act.border = border_cell
        c_act.number_format = CURRENCY_FORMAT

        # Col G: % of Budget (Formula: E_row / $A$5)
        c_pct = ws_summary.cell(row=s_row, column=7, value=f"=E{s_row}/$A$5")
        c_pct.font = font_price
        c_pct.alignment = align_right
        c_pct.border = border_cell
        c_pct.number_format = '0.0%'

        if (s_row - 10) % 2 == 1:
            for c in range(1, 8):
                ws_summary.cell(row=s_row, column=c).fill = fill_zebra

        ws_summary.row_dimensions[s_row].height = 30
        s_row += 1

    # Summary Total Row
    ws_summary.cell(row=s_row, column=1, value="TOTALS").font = font_subtotal
    ws_summary.cell(row=s_row, column=1).alignment = align_center
    ws_summary.cell(row=s_row, column=2, value="All 8 System Categories Combined").font = font_subtotal
    ws_summary.cell(row=s_row, column=3, value=f"=SUM(C10:C{s_row-1})").font = font_subtotal
    ws_summary.cell(row=s_row, column=3).alignment = align_center
    ws_summary.cell(row=s_row, column=4, value=f"=SUM(D10:D{s_row-1})").font = font_subtotal
    ws_summary.cell(row=s_row, column=4).alignment = align_right
    ws_summary.cell(row=s_row, column=4).number_format = CURRENCY_FORMAT
    ws_summary.cell(row=s_row, column=5, value=f"=SUM(E10:E{s_row-1})").font = font_subtotal
    ws_summary.cell(row=s_row, column=5).alignment = align_right
    ws_summary.cell(row=s_row, column=5).number_format = CURRENCY_FORMAT
    ws_summary.cell(row=s_row, column=6, value=f"=SUM(F10:F{s_row-1})").font = font_subtotal
    ws_summary.cell(row=s_row, column=6).alignment = align_right
    ws_summary.cell(row=s_row, column=6).number_format = CURRENCY_FORMAT
    ws_summary.cell(row=s_row, column=7, value=f"=SUM(G10:G{s_row-1})").font = font_subtotal
    ws_summary.cell(row=s_row, column=7).alignment = align_right
    ws_summary.cell(row=s_row, column=7).number_format = '0.0%'

    for c in range(1, 8):
        cell = ws_summary.cell(row=s_row, column=c)
        cell.border = border_grand_total
        cell.fill = fill_grand_total
    ws_summary.row_dimensions[s_row].height = 36

    # Budget Health Notes Box
    s_row += 2
    ws_summary.merge_cells(start_row=s_row, start_column=1, end_row=s_row, end_column=7)
    ws_summary.cell(row=s_row, column=1, value="💡 BUDGET ANALYSIS & KEY TAKEAWAYS:").font = Font(name="Segoe UI", size=12, bold=True, color=NAVY_DARK)
    ws_summary.row_dimensions[s_row].height = 28

    notes_text = [
        ("1. Best-Case Budget Target:", "₱9,770 — Achievable by taking advantage of Shopee/Lazada monthly sales (e.g., Payday, 10.10, 11.11), platform vouchers, and free shipping coins."),
        ("2. Realistic Budget Target:", "₱12,000–₱13,500 — Leaves a healthy buffer of ₱1,500–₱3,000 within your ₱15,000 cap for unexpected spares, extra wire, or shipping fees."),
        ("3. High-End Worst-Case:", "₱15,550 — Even if buying every single item at peak retail with zero discounts and buying a brand new soldering iron, it sits right at your ₱15k ceiling."),
        ("4. Key Cost Driver:", "The SCD41 True NDIR CO₂ Sensor (₱1,800–₱2,500) represents ~18% of total expenditure. It is the single most critical investment for your thesis credibility.")
    ]

    for title, desc in notes_text:
        s_row += 1
        ws_summary.cell(row=s_row, column=1, value=title).font = Font(name="Segoe UI", size=10.5, bold=True, color=NAVY_DARK)
        ws_summary.cell(row=s_row, column=1).alignment = align_left
        ws_summary.merge_cells(start_row=s_row, start_column=2, end_row=s_row, end_column=7)
        ws_summary.cell(row=s_row, column=2, value=desc).font = Font(name="Segoe UI", size=10.5, color=TEXT_DARK)
        ws_summary.cell(row=s_row, column=2).alignment = align_left
        ws_summary.row_dimensions[s_row].height = 26


    # -------------------------------------------------------------
    # SHEET 3: 🛒 VENDOR & PROCUREMENT GUIDE
    # -------------------------------------------------------------
    ws_vendors = wb.create_sheet(title="🛒 Vendor & Shopping Guide")
    ws_vendors.views.sheetView[0].showGridLines = True

    # Title
    ws_vendors.merge_cells("A1:E1")
    ws_vendors["A1"] = "🍄 KABUTECH HIYAS — PHILIPPINE SOURCING & PROCUREMENT GUIDE"
    ws_vendors["A1"].font = font_title
    ws_vendors["A1"].fill = fill_title
    ws_vendors["A1"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_vendors.row_dimensions[1].height = 48

    ws_vendors.merge_cells("A2:E2")
    ws_vendors["A2"] = "Recommended Local Vendors, Shopping Batches & Quality Verification Checks"
    ws_vendors["A2"].font = font_subtitle
    ws_vendors["A2"].fill = fill_title
    ws_vendors["A2"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_vendors.row_dimensions[2].height = 28

    # Set Column Dimensions for Vendor Guide Sheet (Generously widened)
    vendor_col_widths = [32, 32, 50, 46, 22]
    for c_idx, width in enumerate(vendor_col_widths, 1):
        ws_vendors.column_dimensions[get_column_letter(c_idx)].width = width

    # Section 1: Where to Buy
    v_row = 4
    ws_vendors.merge_cells(f"A{v_row}:E{v_row}")
    ws_vendors[f"A{v_row}"] = "🏪 RECOMMENDED STORES IN THE PHILIPPINES"
    ws_vendors[f"A{v_row}"].font = font_section_hdr
    ws_vendors[f"A{v_row}"].fill = fill_tbl_hdr
    ws_vendors[f"A{v_row}"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_vendors.row_dimensions[v_row].height = 34

    vendor_headers = ["Store / Vendor", "Platform / Location", "Items to Source Here", "Pros / Recommendations", "Est. Delivery"]
    v_row += 1
    for col_idx, hdr_text in enumerate(vendor_headers, 1):
        cell = ws_vendors.cell(row=v_row, column=col_idx, value=hdr_text)
        cell.fill = fill_cat_hdr
        cell.font = Font(name="Segoe UI", size=11, bold=True, color=NAVY_DARK)
        cell.alignment = align_left
        cell.border = border_cell
    ws_vendors.row_dimensions[v_row].height = 32

    vendors_data = [
        ("Makerlab Electronics", "Shopee Mall / Lazada / QC Physical", "ESP32-S3, Relays, OLED, SHT31, Level Shifter, XKC-Y25", "Fast NCR delivery (1-2 days), tested genuine boards", "1–2 days"),
        ("CircuitRocks Philippines", "Shopee / Website / Mandaluyong", "BH1750, SHT31-D, Prototyping PCBs, Connectors", "High quality verified sensors, technical support", "1–3 days"),
        ("e-Gizmo Mechatronix", "Taft Ave Manila / Online Store", "Sensors, Relays, Breadboards, Headers, Power components", "Long-running local supplier, student thesis friendly", "1–3 days"),
        ("Alexan Commercial", "Raon Quiapo / SM Megamall / Online", "12V Switching PSU, IEC C14 Inlets, Switches, Diodes, Fuses", "Best for industrial power supplies, enclosure accessories", "Same day / 2 days"),
        ("Shopee Overseas (China)", "Shopee App (Search keyword)", "SCD41 NDIR CO2 Sensor, GX16 Connectors, Misting Nozzles", "30-50% cheaper on SCD41 and aviation plugs", "5–8 days"),
        ("Wilcon Depot / Citi Hardware", "Local Physical Branches Nationwide", "PVC Bell Reducer, Teflon Tape, Hose Clamps, Wall Brackets", "Heavy-duty sanitary grade PVC fittings, inspect in-person", "Immediate"),
        ("Ace Hardware / Handyman", "Malls Nationwide", "Electrical tape, 3M VHB tape, Silicone sealant, Zip ties", "Branded adhesives & sealants (3M, Pioneer, Devcon)", "Immediate")
    ]

    for v in vendors_data:
        v_row += 1
        for col_idx, val in enumerate(v, 1):
            cell = ws_vendors.cell(row=v_row, column=col_idx, value=val)
            cell.font = font_data_bold if col_idx == 1 else font_data
            cell.alignment = align_left_wrap
            cell.border = border_cell
        ws_vendors.row_dimensions[v_row].height = 32

    # Section 2: Phased Purchasing Roadmap
    v_row += 2
    ws_vendors.merge_cells(f"A{v_row}:E{v_row}")
    ws_vendors[f"A{v_row}"] = "📅 RECOMMENDED 4-PHASE ORDERING ROADMAP"
    ws_vendors[f"A{v_row}"].font = font_section_hdr
    ws_vendors[f"A{v_row}"].fill = fill_tbl_hdr
    ws_vendors[f"A{v_row}"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_vendors.row_dimensions[v_row].height = 34

    phase_headers = ["Phase", "Target Milestone", "Items to Order", "Purpose & Validation Goal", "Est. Spend"]
    v_row += 1
    for col_idx, hdr_text in enumerate(phase_headers, 1):
        cell = ws_vendors.cell(row=v_row, column=col_idx, value=hdr_text)
        cell.font = Font(name="Segoe UI", size=11, bold=True, color=NAVY_DARK)
        cell.fill = fill_cat_hdr
        cell.alignment = align_left
        cell.border = border_cell
    ws_vendors.row_dimensions[v_row].height = 32

    phases_data = [
        ("Phase 1", "Core Sensors & Logic Bench Test", "ESP32-S3, SHT31, BH1750, SCD41, OLED, Jumpers, Breadboard", "Bench-test sensor polling, I2C bus scan, and Firebase telemetry transmission.", "₱2,800 – ₱3,600"),
        ("Phase 2", "Power & Actuator Control Bench Test", "12V PSU, 8-Ch Relay, Logic Shifter, Fans, Misting Pump, Solenoid Valve", "Validate relay switching, flyback diodes, and actuator trigger responsiveness.", "₱3,500 – ₱4,800"),
        ("Phase 3", "Probe & Enclosure Fabrication", "IP65 Box, PVC Bell Reducer, Cable Glands, GX16 Plugs, Step Drill Bit, Sealant", "Drill enclosure, solder aviation connectors, fabricate waterproof hanging probe.", "₱1,800 – ₱2,600"),
        ("Phase 4", "Plumbing & Final Deployment", "Misting Tubing, Brass Nozzles, Check Valve, Reservoir, Wall Brackets", "Assemble plumbing manifold in grow house, calibrate sensors, end-to-end PID test.", "₱1,200 – ₱2,000")
    ]

    for p in phases_data:
        v_row += 1
        for col_idx, val in enumerate(p, 1):
            cell = ws_vendors.cell(row=v_row, column=col_idx, value=val)
            cell.font = font_data_bold if col_idx in [1, 5] else font_data
            cell.alignment = align_left_wrap
            cell.border = border_cell
        ws_vendors.row_dimensions[v_row].height = 34

    # Section 3: Verification Checks (Quality Tips)
    v_row += 2
    ws_vendors.merge_cells(f"A{v_row}:E{v_row}")
    ws_vendors[f"A{v_row}"] = "🔍 QUALITY VERIFICATION CHECKLIST (BEFORE YOU BUY)"
    ws_vendors[f"A{v_row}"].font = font_section_hdr
    ws_vendors[f"A{v_row}"].fill = fill_tbl_hdr
    ws_vendors[f"A{v_row}"].alignment = Alignment(horizontal="left", vertical="center", indent=1)
    ws_vendors.row_dimensions[v_row].height = 34

    qc_tips = [
        ("ESP32-S3 Flash/PSRAM", "Ensure listing states 'N16R8' (16MB Flash / 8MB PSRAM). Generic N4 (4MB) has insufficient memory for dual-core FreeRTOS, Firebase queue, and web stack simultaneously."),
        ("SCD41 vs SCD30 / MQ-135", "Do NOT accept MQ-135 or CCS811. Only Sensirion SCD40 or SCD41 offers photoacoustic true NDIR CO2 measurement. Look for Sensirion laser-etched metal package."),
        ("SHT31 vs DHT11 / DHT22", "DHT11 will fail rapidly at >85% RH in a mushroom house. The Sensirion SHT31-D features an integrated heater and internal humidity polymer rated for 0-100% RH."),
        ("Aviation Connectors (GX16)", "Order matching Male + Female pairs (GX16-4). 4-pin is standard: Pin 1 = 12V/VCC, Pin 2 = GND, Pin 3 = Signal/SDA, Pin 4 = SCL/Trigger."),
        ("Power Supply Quality", "Verify the 12V 5A PSU has an aluminum casing with ventilation slots and a trimmer pot to fine-tune 12.0VDC. Avoid unbranded lightweight plastic wall-warts for continuous 24/7 duty.")
    ]

    for item, desc in qc_tips:
        v_row += 1
        ws_vendors.cell(row=v_row, column=1, value=item).font = font_data_bold
        ws_vendors.cell(row=v_row, column=1).alignment = align_left
        ws_vendors.cell(row=v_row, column=1).border = border_cell
        ws_vendors.merge_cells(start_row=v_row, start_column=2, end_row=v_row, end_column=5)
        ws_vendors.cell(row=v_row, column=2, value=desc).font = font_data
        ws_vendors.cell(row=v_row, column=2).alignment = align_left_wrap
        for c in range(2, 6):
            ws_vendors.cell(row=v_row, column=c).border = border_cell
        ws_vendors.row_dimensions[v_row].height = 36

    # Save workbook
    wb.save(filepath)
    print(f"Successfully generated: {filepath}")

if __name__ == "__main__":
    output_path = r"c:\Users\ADMIN\Documents\kabutech-hiyas-main\KABUTECH_HIYAS_MATERIALS_CHECKLIST.xlsx"
    create_kabutech_checklist(output_path)
