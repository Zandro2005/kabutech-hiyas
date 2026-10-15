#!/usr/bin/env python3
"""
Kabutech Hiyas - Precision Proteus ISIS Master Wiring Schematic Generator (V2.4)
Final Polish: Perfect clearance in Section 1, Section 5, and Section 6.
"""

import os
import subprocess

def build_schematic_svg():
    W = 2860
    H = 1720

    svg = []
    svg.append(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
<defs>
    <!-- Proteus signature dot grid -->
    <pattern id="dotGrid" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="1.0" fill="#B5C0AB" />
    </pattern>
    <style>
        .wire {{ stroke: #005500; stroke-width: 2.2; fill: none; stroke-linecap: round; stroke-linejoin: round; }}
        .pin-lead {{ stroke: #990000; stroke-width: 1.8; fill: none; }}
        .comp-body {{ stroke: #990000; stroke-width: 2.0; fill: #D5DAC8; }}
        .ic-box {{ stroke: #880000; stroke-width: 2.4; fill: #CED5C2; }}
        .sub-box {{ stroke: #667A5E; stroke-width: 1.5; stroke-dasharray: 6,4; fill: rgba(225,232,216,0.35); }}
        .resistor-box {{ stroke: #990000; stroke-width: 1.8; fill: #FFFFFF; }}
        .text-ref {{ font-family: 'Consolas', 'Courier New', monospace; font-size: 15px; font-weight: bold; fill: #000000; }}
        .text-val {{ font-family: 'Consolas', 'Courier New', monospace; font-size: 13px; font-weight: bold; fill: #004400; }}
        .text-placeholder {{ font-family: 'Consolas', monospace; font-size: 11px; fill: #556B55; }}
        .text-pin-name {{ font-family: 'Arial', sans-serif; font-size: 13px; font-weight: bold; fill: #000000; }}
        .text-pin-num {{ font-family: 'Consolas', monospace; font-size: 12px; font-weight: bold; fill: #990000; }}
        .text-hdr {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; font-weight: 800; fill: #102B19; letter-spacing: 0.5px; }}
        .text-desc {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; fill: #334433; }}
        .symbol-part {{ stroke: #990000; stroke-width: 2.0; fill: none; }}
        .symbol-solid {{ fill: #990000; stroke: #990000; stroke-width: 1.5; }}
        .junction-dot {{ fill: #005500; stroke: none; }}
        .gnd-bar {{ stroke: #005500; stroke-width: 2.2; }}
        .title-hdr {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 21px; font-weight: 800; fill: #0D2214; }}
        .title-sub {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 13.5px; font-weight: 600; fill: #244630; }}
    </style>
</defs>

<!-- Canvas Background -->
<rect width="{W}" height="{H}" fill="#DFE5D5" />
<rect width="{W}" height="{H}" fill="url(#dotGrid)" />

<!-- Engineering Borders -->
<rect x="25" y="25" width="{W-50}" height="{H-50}" stroke="#5E6D52" stroke-width="2.6" fill="none" />
<rect x="31" y="31" width="{W-62}" height="{H-62}" stroke="#78896D" stroke-width="1.2" fill="none" />
''')

    # Drawing Utilities
    def wire(pts):
        s = " ".join(f"{x},{y}" for x, y in pts)
        svg.append(f'<polyline points="{s}" class="wire" />')

    def jct(x, y):
        svg.append(f'<circle cx="{x}" cy="{y}" r="4.0" class="junction-dot" />')

    def gnd(x, y, label="VSS", pos="right"):
        svg.append(f'''
        <line x1="{x}" y1="{y}" x2="{x}" y2="{y+14}" class="wire" />
        <line x1="{x-14}" y1="{y+14}" x2="{x+14}" y2="{y+14}" class="gnd-bar" />
        <line x1="{x-9}" y1="{y+19}" x2="{x+9}" y2="{y+19}" class="gnd-bar" />
        <line x1="{x-4}" y1="{y+24}" x2="{x+4}" y2="{y+24}" class="gnd-bar" />
        ''')
        if label:
            lx = x + 16 if pos == "right" else x - 42
            svg.append(f'<text x="{lx}" y="{y+22}" class="text-val" style="font-size:12px;">{label}</text>')

    def vcc(x, y, label="VDD", pos="top"):
        svg.append(f'''
        <line x1="{x}" y1="{y}" x2="{x}" y2="{y-14}" class="wire" />
        <polygon points="{x},{y-22} {x-7},{y-14} {x+7},{y-14}" stroke="#005500" stroke-width="1.8" fill="#DFE5D5" />
        ''')
        if label:
            if pos == "top":
                svg.append(f'<text x="{x}" y="{y-26}" text-anchor="middle" class="text-val" style="font-size:12px; font-weight:bold;">{label}</text>')
            elif pos == "right":
                svg.append(f'<text x="{x+10}" y="{y-16}" class="text-val" style="font-size:12px; font-weight:bold;">{label}</text>')
            elif pos == "left":
                svg.append(f'<text x="{x-10}" y="{y-16}" text-anchor="end" class="text-val" style="font-size:12px; font-weight:bold;">{label}</text>')

    def resistor(x, y, rid, val, orient="v", length=36, width=15):
        if orient == "v":
            ty = y - length//2
            by = y + length//2
            svg.append(f'''
            <line x1="{x}" y1="{ty-12}" x2="{x}" y2="{ty}" class="pin-lead" />
            <rect x="{x-width//2}" y="{ty}" width="{width}" height="{length}" class="resistor-box" />
            <line x1="{x}" y1="{by}" x2="{x}" y2="{by+12}" class="pin-lead" />
            <text x="{x+width//2+6}" y="{y-5}" class="text-ref">{rid}</text>
            <text x="{x+width//2+6}" y="{y+9}" class="text-val">{val}</text>
            <text x="{x+width//2+6}" y="{y+22}" class="text-placeholder">&lt;TEXT&gt;</text>
            ''')
        else:
            lx = x - length//2
            rx = x + length//2
            svg.append(f'''
            <line x1="{lx-12}" y1="{y}" x2="{lx}" y2="{y}" class="pin-lead" />
            <rect x="{lx}" y="{y-width//2}" width="{length}" height="{width}" class="resistor-box" />
            <line x1="{rx}" y1="{y}" x2="{rx+12}" y2="{y}" class="pin-lead" />
            <text x="{x}" y="{y-width//2-16}" text-anchor="middle" class="text-ref">{rid}</text>
            <text x="{x}" y="{y-width//2-3}" text-anchor="middle" class="text-val">{val}</text>
            <text x="{x}" y="{y+width//2+15}" text-anchor="middle" class="text-placeholder">&lt;TEXT&gt;</text>
            ''')

    def capacitor(x, y, cid, val):
        svg.append(f'''
        <line x1="{x}" y1="{y-24}" x2="{x}" y2="{y-7}" class="pin-lead" />
        <rect x="{x-13}" y="{y-7}" width="26" height="4" class="symbol-solid" />
        <rect x="{x-13}" y="{y+4}" width="26" height="4" class="symbol-part" />
        <line x1="{x}" y1="{y+8}" x2="{x}" y2="{y+24}" class="pin-lead" />
        <text x="{x-16}" y="{y-10}" class="text-pin-num" style="font-size:15px;">+</text>
        <text x="{x+16}" y="{y-5}" class="text-ref">{cid}</text>
        <text x="{x+16}" y="{y+9}" class="text-val">{val}</text>
        <text x="{x+16}" y="{y+22}" class="text-placeholder">&lt;TEXT&gt;</text>
        ''')

    def led(x, y, lid, val, color="#009900"):
        svg.append(f'''
        <line x1="{x}" y1="{y-26}" x2="{x}" y2="{y-10}" class="pin-lead" />
        <polygon points="{x-9},{y-10} {x+9},{y-10} {x},{y+8}" class="symbol-solid" fill="{color}" />
        <line x1="{x-11}" y1="{y+8}" x2="{x+11}" y2="{y+8}" class="symbol-part" />
        <line x1="{x}" y1="{y+8}" x2="{x}" y2="{y+26}" class="pin-lead" />
        <!-- Arrows -->
        <line x1="{x+11}" y1="{y-7}" x2="{x+21}" y2="{y+3}" stroke="#990000" stroke-width="1.5" />
        <polyline points="{x+17},{y+3} {x+21},{y+3} {x+21},{y-1}" stroke="#990000" stroke-width="1.5" fill="none" />
        <line x1="{x+15}" y1="{y-13}" x2="{x+25}" y2="{y-3}" stroke="#990000" stroke-width="1.5" />
        <polyline points="{x+21},{y-3} {x+25},{y-3} {x+25},{y-7}" stroke="#990000" stroke-width="1.5" fill="none" />
        <text x="{x+30}" y="{y-4}" class="text-ref">{lid}</text>
        <text x="{x+30}" y="{y+10}" class="text-val">{val}</text>
        <text x="{x+30}" y="{y+23}" class="text-placeholder">&lt;TEXT&gt;</text>
        ''')

    # =========================================================================
    # SECTION DEFINITIONS & BOXES
    # =========================================================================
    svg.append(f'''
    <!-- SECTION 1: POWER SUPPLY -->
    <rect x="55" y="55" width="720" height="465" class="sub-box" rx="6" />
    <text x="75" y="85" class="text-hdr">SECTION 1: 220V AC MAINS &amp; DC POWER DISTRIBUTION</text>
    <text x="75" y="105" class="text-desc">Switching PSU (12V 5A), LM2596 Step-Down (5V/3A) &amp; Dual Rails</text>

    <!-- SECTION 2: RELAY MODULE -->
    <rect x="55" y="540" width="720" height="600" class="sub-box" rx="6" />
    <text x="75" y="570" class="text-hdr">SECTION 2: MULTI-CHANNEL 12V RELAY ACTUATOR CONTROLLERS</text>
    <text x="75" y="590" class="text-desc">Optocoupled 10A Relays, 1N4007 Flyback Suppression &amp; 12V Actuator Loads</text>

    <!-- SECTION 3: LIQUID SENSORS & SYSTEM CONTROLS -->
    <rect x="55" y="1165" width="720" height="495" class="sub-box" rx="6" />
    <text x="75" y="1195" class="text-hdr">SECTION 3: LIQUID HANDLING SENSORS &amp; HARDWARE CONTROLS</text>
    <text x="75" y="1215" class="text-desc">YF-S201 Hall Flow Meter, XKC-Y25 Capacitive Level &amp; Panel Switches</text>

    <!-- SECTION 4: ENVIRONMENTAL SENSOR ARRAYS -->
    <rect x="1330" y="55" width="1475" height="465" class="sub-box" rx="6" />
    <text x="1350" y="85" class="text-hdr">SECTION 4: CORE PROTOTYPE ENVIRONMENTAL SENSORS</text>
    <text x="1350" y="105" class="text-desc">Breadboard Sensing Array: DHT11 Temp/Hum, LDR Lux, MQ-135 Gas &amp; Submersible Water Probe</text>

    <!-- SECTION 5: SUSPENDED I2C AGRICULTURAL PROBE -->
    <rect x="1330" y="545" width="1475" height="285" class="sub-box" rx="6" />
    <text x="1350" y="575" class="text-hdr">SECTION 5: SUSPENDED I2C ENVIRONMENTAL PROBE (WEATHER SHIELD)</text>
    <text x="1350" y="595" class="text-desc">True NDIR CO2 (SCD41), Precision SHT31, BH1750 Lux &amp; SSD1306 Cabinet OLED Display</text>

    <!-- SECTION 6: ACTUATOR OUTPUTS & CONNECTORS -->
    <rect x="1330" y="855" width="1475" height="285" class="sub-box" rx="6" />
    <text x="1350" y="885" class="text-hdr">SECTION 6: PROTOTYPE LED FEEDBACK &amp; EXTERNAL GX16 PORTS</text>
    <text x="1350" y="905" class="text-desc">On-board Diagnostics LEDs + IP65 Screw-Lock Aviation Ports for Field Equipment</text>

    <!-- SECTION 7: SPECIFICATIONS & TITLE BLOCK -->
    <rect x="1330" y="1165" width="1475" height="495" class="sub-box" rx="6" />
    <text x="1350" y="1200" class="text-hdr">SECTION 7: COMPLETE PINOUT DIRECTORY &amp; SYSTEM NETLIST</text>
    <text x="1350" y="1220" class="text-desc">Official Engineering Documentation, Net Connections &amp; Protection Standards</text>
    ''')

    # =========================================================================
    # CENTRAL MICROCONTROLLER: ESP32-S3 DEVKIT (U1)
    # =========================================================================
    MCU_X = 830
    MCU_Y = 160
    MCU_W = 440
    MCU_H = 1450

    svg.append(f'''
    <!-- U1: ESP32-S3 Dev Module -->
    <rect x="{MCU_X}" y="{MCU_Y}" width="{MCU_W}" height="{MCU_H}" class="ic-box" />
    <text x="{MCU_X+20}" y="{MCU_Y-12}" class="text-ref" style="font-size:18px;">U1</text>
    <text x="{MCU_X+20}" y="{MCU_Y+30}" class="text-ref" style="font-size:16px;">ESP32-S3-WROOM-1</text>
    <text x="{MCU_X+20}" y="{MCU_Y+48}" class="text-val">DevKit N16R8 (Xtensa 240MHz)</text>
    <text x="{MCU_X+20}" y="{MCU_Y+64}" class="text-placeholder">&lt;TEXT&gt;</text>
    ''')

    # Pins Left Side of U1 (Actuator Controls & Power & Aux)
    left_pins = [
        ("3V3", "1", "3.3V System VDD Power Rail", 240),
        ("VIN", "2", "5V Power Supply Input (from Buck)", 310),
        ("GND_1", "3", "Digital Common Ground (VSS)", 380),
        ("EN/RST", "4", "Chip Enable / Hardware Reset", 450),
        ("IO9", "5", "Actuator 1: Exhaust Fan Trigger", 670),
        ("IO10", "6", "Actuator 2: Intake Fan Trigger", 755),
        ("IO11", "7", "Actuator 3: Misting Pump Trigger", 840),
        ("IO12", "8", "Actuator 4: Grow Lights Trigger", 925),
        ("IO13", "9", "Actuator 5: Solenoid Valve Trigger", 1010),
        ("IO14", "10", "Water Flow Sensor Pulse (YF-S201)", 1240),
        ("IO21", "11", "Capacitive Water Level In (XKC-Y25)", 1310),
        ("IO38", "12", "Rotary Mode Switch Input (Auto/Man)", 1480),
        ("GND_2", "13", "Secondary Ground Reference", 1550),
    ]

    # Pins Right Side of U1 (Sensors & Status Indicators)
    right_pins = [
        ("IO4", "14", "DHT11 / SHT31 Data Bus", 240),
        ("IO5", "15", "LDR Ambient Light Analog (ADC1)", 310),
        ("IO6", "16", "MQ-135 Gas Analog Output (ADC1)", 380),
        ("IO7", "17", "Water Level Signal S (ADC1)", 450),
        ("IO8", "18", "Water Level Power Strobe V+", 520),
        ("IO1/SDA", "19", "Shared I2C Data Line (SDA)", 670),
        ("IO2/SCL", "20", "Shared I2C Clock Line (SCL)", 740),
        ("IO47", "21", "Front Panel WiFi Status LED", 920),
        ("IO48", "22", "Front Panel Alarm / Fault LED", 990),
        ("GND_3", "23", "Sensor Ground Bus Return", 1060),
    ]

    for name, num, desc, py in left_pins:
        svg.append(f'''
        <line x1="{MCU_X-35}" y1="{py}" x2="{MCU_X}" y2="{py}" class="pin-lead" />
        <text x="{MCU_X-40}" y="{py-4}" text-anchor="end" class="text-pin-num">{num}</text>
        <text x="{MCU_X+15}" y="{py+5}" class="text-pin-name">{name}</text>
        ''')

    for name, num, desc, py in right_pins:
        svg.append(f'''
        <line x1="{MCU_X+MCU_W}" y1="{py}" x2="{MCU_X+MCU_W+35}" y2="{py}" class="pin-lead" />
        <text x="{MCU_X+MCU_W+40}" y="{py-4}" class="text-pin-num">{num}</text>
        <text x="{MCU_X+MCU_W-15}" y="{py+5}" text-anchor="end" class="text-pin-name">{name}</text>
        ''')

    # =========================================================================
    # SECTION 1: POWER SUPPLY (Top-Left)
    # =========================================================================
    AC_X = 90
    AC_Y = 160
    svg.append(f'''
    <!-- AC Inlet J_AC -->
    <rect x="{AC_X}" y="{AC_Y}" width="80" height="110" class="comp-body" />
    <text x="{AC_X+8}" y="{AC_Y-8}" class="text-ref">J_AC</text>
    <text x="{AC_X+8}" y="{AC_Y+128}" class="text-val">IEC C14</text>
    <text x="{AC_X+8}" y="{AC_Y+142}" class="text-placeholder">220VAC PH</text>

    <!-- Pins -->
    <line x1="{AC_X-20}" y1="{AC_Y+25}" x2="{AC_X}" y2="{AC_Y+25}" class="pin-lead" />
    <text x="{AC_X+8}" y="{AC_Y+30}" class="text-pin-name">L</text>
    <line x1="{AC_X-20}" y1="{AC_Y+55}" x2="{AC_X}" y2="{AC_Y+55}" class="pin-lead" />
    <text x="{AC_X+8}" y="{AC_Y+60}" class="text-pin-name">N</text>
    <line x1="{AC_X-20}" y1="{AC_Y+85}" x2="{AC_X}" y2="{AC_Y+85}" class="pin-lead" />
    <text x="{AC_X+8}" y="{AC_Y+90}" class="text-pin-name">PE</text>
    ''')

    # Chassis Earth
    gnd(AC_X+105, AC_Y+85, "EARTH")
    wire([(AC_X+80, AC_Y+85), (AC_X+105, AC_Y+85)])

    # Fuse F1 on Live line
    resistor(AC_X+140, AC_Y+25, "F1", "5A/250V", orient="h", length=34)
    wire([(AC_X+80, AC_Y+25), (AC_X+123, AC_Y+25)])

    # Rocker Switch SW1
    svg.append(f'''
    <!-- SW1 Rocker Switch -->
    <line x1="{AC_X+157}" y1="{AC_Y+25}" x2="{AC_X+185}" y2="{AC_Y+25}" class="wire" />
    <circle cx="{AC_X+185}" cy="{AC_Y+25}" r="3" fill="#990000" />
    <line x1="{AC_X+185}" y1="{AC_Y+25}" x2="{AC_X+212}" y2="{AC_Y+10}" class="symbol-part" stroke-width="2.2" />
    <circle cx="{AC_X+215}" cy="{AC_Y+25}" r="3" fill="#990000" />
    <line x1="{AC_X+215}" y1="{AC_Y+25}" x2="{AC_X+240}" y2="{AC_Y+25}" class="wire" />
    <text x="{AC_X+200}" y="{AC_Y-2}" text-anchor="middle" class="text-ref">SW1</text>
    <text x="{AC_X+200}" y="{AC_Y+42}" text-anchor="middle" class="text-val">KCD1 (Mains)</text>
    ''')

    # Varistor MOV1 across L and N
    wire([(AC_X+240, AC_Y+25), (AC_X+265, AC_Y+25)])
    jct(AC_X+265, AC_Y+25)
    wire([(AC_X+80, AC_Y+55), (AC_X+265, AC_Y+55)])
    jct(AC_X+265, AC_Y+55)
    resistor(AC_X+265, AC_Y+40, "MOV1", "10D431K", orient="v", length=20, width=12)

    # PSU1: 12V 5A (60W)
    PSU_X = 390
    PSU_Y = 150
    svg.append(f'''
    <!-- PSU1: Mean Well 12V 5A -->
    <rect x="{PSU_X}" y="{PSU_Y}" width="150" height="120" class="comp-body" />
    <text x="{PSU_X+10}" y="{PSU_Y-8}" class="text-ref">PSU1</text>
    <text x="{PSU_X+10}" y="{PSU_Y+138}" class="text-val">LRS-75-12 (5A / 60W)</text>
    <text x="{PSU_X+10}" y="{PSU_Y+152}" class="text-desc">220VAC IN &#8594; 12VDC OUT</text>
    <text x="{PSU_X+10}" y="{PSU_Y+166}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Terminals Left -->
    <text x="{PSU_X+10}" y="{PSU_Y+30}" class="text-pin-name">AC (L)</text>
    <text x="{PSU_X+10}" y="{PSU_Y+65}" class="text-pin-name">AC (N)</text>
    <text x="{PSU_X+10}" y="{PSU_Y+100}" class="text-pin-name">FG (Earth)</text>

    <!-- Terminals Right -->
    <text x="{PSU_X+140}" y="{PSU_Y+30}" text-anchor="end" class="text-pin-name">+12V</text>
    <text x="{PSU_X+140}" y="{PSU_Y+85}" text-anchor="end" class="text-pin-name">GND</text>
    ''')

    wire([(AC_X+265, AC_Y+25), (PSU_X, AC_Y+25), (PSU_X, PSU_Y+25)])
    wire([(AC_X+265, AC_Y+55), (PSU_X, AC_Y+55), (PSU_X, PSU_Y+60)])

    # Output 12V + Blade Fuse F2
    resistor(PSU_X+190, PSU_Y+25, "F2", "5A (Blade)", orient="h", length=34)
    wire([(PSU_X+150, PSU_Y+25), (PSU_X+173, PSU_Y+25)])
    wire([(PSU_X+207, PSU_Y+25), (PSU_X+240, PSU_Y+25)])
    vcc(PSU_X+240, PSU_Y+25, "+12V (BUS)")
    jct(PSU_X+240, PSU_Y+25)

    # Filter Cap C1 on 12V
    capacitor(PSU_X+240, PSU_Y+85, "C1", "100uF/35V")
    wire([(PSU_X+240, PSU_Y+25), (PSU_X+240, PSU_Y+61)])
    wire([(PSU_X+240, PSU_Y+109), (PSU_X+240, PSU_Y+125)])
    gnd(PSU_X+240, PSU_Y+125, "GND")

    wire([(PSU_X+150, PSU_Y+80), (PSU_X+180, PSU_Y+80)])
    gnd(PSU_X+180, PSU_Y+80, "GND")

    # Buck Converter U2 (LM2596)
    BUCK_X = 390
    BUCK_Y = 340
    svg.append(f'''
    <!-- U2: LM2596 Buck Converter -->
    <rect x="{BUCK_X}" y="{BUCK_Y}" width="150" height="110" class="comp-body" />
    <text x="{BUCK_X+10}" y="{BUCK_Y-8}" class="text-ref">U2 (BUCK)</text>
    <text x="{BUCK_X+10}" y="{BUCK_Y+128}" class="text-val">LM2596-5.0 DC-DC</text>
    <text x="{BUCK_X+10}" y="{BUCK_Y+142}" class="text-desc">High-Efficiency 3A Step-Down</text>
    <text x="{BUCK_X+10}" y="{BUCK_Y+156}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins with clear vertical separation -->
    <text x="{BUCK_X+10}" y="{BUCK_Y+22}" class="text-pin-name">IN+ (12V)</text>
    <text x="{BUCK_X+10}" y="{BUCK_Y+95}" class="text-pin-name">IN- (GND)</text>
    <text x="{BUCK_X+140}" y="{BUCK_Y+22}" text-anchor="end" class="text-pin-name">OUT+ (5V)</text>
    <text x="{BUCK_X+140}" y="{BUCK_Y+95}" text-anchor="end" class="text-pin-name">OUT- (GND)</text>
    ''')

    # Wire 12V from bus down to Buck IN+ at y=375
    wire([(PSU_X+240, PSU_Y+25), (PSU_X+280, PSU_Y+25), (PSU_X+280, BUCK_Y+35), (BUCK_X, BUCK_Y+35)])
    jct(PSU_X+280, PSU_Y+25)
    gnd(BUCK_X-20, BUCK_Y+80, "GND")
    wire([(BUCK_X-20, BUCK_Y+80), (BUCK_X, BUCK_Y+80)])

    # Output 5V from Buck at y=375
    wire([(BUCK_X+150, BUCK_Y+35), (BUCK_X+200, BUCK_Y+35)])
    jct(BUCK_X+200, BUCK_Y+35)
    vcc(BUCK_X+200, BUCK_Y+35, "+5V (VIN)")

    # Filter Cap C2 on 5V
    capacitor(BUCK_X+200, BUCK_Y+90, "C2", "220uF/16V")
    wire([(BUCK_X+200, BUCK_Y+35), (BUCK_X+200, BUCK_Y+66)])
    wire([(BUCK_X+200, BUCK_Y+114), (BUCK_X+200, BUCK_Y+130)])
    gnd(BUCK_X+200, BUCK_Y+130, "GND")

    wire([(BUCK_X+150, BUCK_Y+80), (BUCK_X+170, BUCK_Y+80)])
    gnd(BUCK_X+170, BUCK_Y+80, "GND")

    # Connect 5V rail to ESP32 VIN (Pin 2, y=310) along clear channel x=710
    wire([(BUCK_X+200, BUCK_Y+35), (710, BUCK_Y+35), (710, 310), (MCU_X-35, 310)])

    # ESP32 3.3V rail (Pin 1, y=240) along clear channel x=640
    wire([(MCU_X-35, 240), (640, 240)])
    vcc(640, 240, "+3.3V (VDD)")
    jct(640, 240)
    # Cap C3 on 3.3V
    capacitor(640, 290, "C3", "10uF/10V")
    wire([(640, 240), (640, 266)])
    wire([(640, 314), (640, 330)])
    gnd(640, 330, "VSS")

    # ESP32 GND_1 (Pin 3, y=380)
    wire([(MCU_X-35, 380), (740, 380)])
    gnd(740, 380, "VSS")

    # ESP32 Reset Circuit (Pin 4, y=450)
    resistor(740, 450, "R_RST", "10k", orient="h", length=32)
    wire([(MCU_X-35, 450), (756, 450)])
    jct(756, 450)
    wire([(724, 450), (690, 450)])
    vcc(690, 450, "+3.3V")
    # Reset button SW_RST
    wire([(756, 450), (756, 480)])
    svg.append(f'''
    <!-- Reset Pushbutton -->
    <line x1="740" y1="480" x2="772" y2="480" class="symbol-part" />
    <line x1="756" y1="480" x2="756" y2="496" class="symbol-lead" />
    <circle cx="748" cy="500" r="3" fill="#990000" />
    <circle cx="764" cy="500" r="3" fill="#990000" />
    <text x="720" y="520" class="text-ref">SW_RST</text>
    <text x="720" y="534" class="text-val">Reset Btn</text>
    ''')
    gnd(756, 510, "VSS")

    # =========================================================================
    # SECTION 2: RELAY MODULE & 12V ACTUATOR DRIVERS (Left-Middle)
    # =========================================================================
    RELAY_X = 90
    RELAY_Y = 610
    svg.append(f'''
    <!-- RLY_MOD1: 8-Channel Relay Module -->
    <rect x="{RELAY_X}" y="{RELAY_Y}" width="650" height="500" class="comp-body" />
    <text x="{RELAY_X+15}" y="{RELAY_Y-8}" class="text-ref">RLY_MOD1 (8-CHANNEL OPTOCOUPLED RELAY BOARD)</text>
    <text x="{RELAY_X+15}" y="{RELAY_Y+520}" class="text-val">Songle SRD-05VDC-SL-C (10A 250VAC / 10A 30VDC Rating)</text>
    <text x="{RELAY_X+15}" y="{RELAY_Y+536}" class="text-desc">Optically Isolated Active-LOW Coil Triggers with 1N4007 Flyback Suppression</text>
    <text x="{RELAY_X+15}" y="{RELAY_Y+550}" class="text-placeholder">&lt;TEXT&gt;</text>
    ''')

    vcc(RELAY_X+30, RELAY_Y+30, "+5V (RELAY VCC)")
    gnd(RELAY_X+80, RELAY_Y+30, "GND")

    actuators = [
        ("K1", "EXHAUST FAN", "12V DC 120mm Ball Bearing Fan (>70 CFM)", "IO9", 670, "D5", "1N4007", "PORT 1"),
        ("K2", "INTAKE FAN", "12V DC Fresh Air Intake / CO2 Purge Fan", "IO10", 755, "D6", "1N4007", "PORT 2"),
        ("K3", "MISTER PUMP", "12V DC Diaphragm Mist Pump (60W Peak)", "IO11", 840, "D7", "1N4007", "PORT 3"),
        ("K4", "GROW LIGHTS", "12V LED Grow Light Strip (Full Spectrum)", "IO12", 925, "D8", "1N4007", "PORT 4"),
        ("K5", "SOLENOID VALVE", "12V DC Water Solenoid (NC, 1/2\" Thread)", "IO13", 1010, "D9", "1N4007", "PORT 5")
    ]

    for idx, (kid, aname, adesc, iopin, mcu_py, did, dval, port) in enumerate(actuators):
        ry = RELAY_Y + 50 + idx * 85
        svg.append(f'''
        <!-- Channel {idx+1}: {kid} -->
        <rect x="{RELAY_X+15}" y="{ry}" width="620" height="70" fill="#DFE5D5" stroke="#7A896F" stroke-width="1.2" rx="4" />
        <text x="{RELAY_X+25}" y="{ry+24}" class="text-ref">{kid}: {aname}</text>
        <text x="{RELAY_X+25}" y="{ry+42}" class="text-desc">{adesc}</text>
        <text x="{RELAY_X+25}" y="{ry+58}" class="text-val" style="font-size:11px;">Flyback Diode: {did} ({dval})</text>

        <!-- Terminals -->
        <text x="{RELAY_X+320}" y="{ry+35}" class="text-pin-name" style="font-size:12px;">POWER: COM &#8592; +12V</text>
        <text x="{RELAY_X+320}" y="{ry+55}" class="text-pin-name" style="font-size:12px; fill:#990000;">LOAD: NO &#8594; {port}</text>
        <text x="{RELAY_X+625}" y="{ry+38}" text-anchor="end" class="text-pin-name" style="font-size:12px; fill:#005500;">IN{idx+1} &#8592; {iopin}</text>
        ''')

        # Direct, beautiful straight wire from ESP32 pin (left side) to Relay Input IN(idx+1)
        wire([(MCU_X-35, mcu_py), (RELAY_X+635, mcu_py)])
        jct(MCU_X-35, mcu_py)

    # =========================================================================
    # SECTION 3: LIQUID HANDLING & PANEL CONTROLS (Bottom-Left)
    # =========================================================================
    # YF-S201 Flow Sensor
    FLOW_X = 90
    FLOW_Y = 1240
    svg.append(f'''
    <!-- YF-S201 Flow Sensor -->
    <rect x="{FLOW_X}" y="{FLOW_Y}" width="300" height="150" class="comp-body" />
    <text x="{FLOW_X+10}" y="{FLOW_Y-8}" class="text-ref">SEN_FLOW (YF-S201)</text>
    <text x="{FLOW_X+10}" y="{FLOW_Y+168}" class="text-val">Hall-Effect Flow Sensor</text>
    <text x="{FLOW_X+10}" y="{FLOW_Y+182}" class="text-desc">1-30 L/min, Pulse: 7.5*Q</text>
    <text x="{FLOW_X+10}" y="{FLOW_Y+196}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins -->
    <text x="{FLOW_X+10}" y="{FLOW_Y+35}" class="text-pin-name">Red: VCC (5V)</text>
    <text x="{FLOW_X+10}" y="{FLOW_Y+75}" class="text-pin-name">Black: GND (VSS)</text>
    <text x="{FLOW_X+10}" y="{FLOW_Y+115}" class="text-pin-name">Yellow: Pulse Out &#8594; IO14</text>
    ''')

    vcc(FLOW_X-25, FLOW_Y+30, "+5V")
    wire([(FLOW_X, FLOW_Y+30), (FLOW_X-25, FLOW_Y+30)])
    gnd(FLOW_X-25, FLOW_Y+70, "GND")
    wire([(FLOW_X, FLOW_Y+70), (FLOW_X-25, FLOW_Y+70)])

    # Pull-up Resistor R9 (10k) on Flow Output
    resistor(FLOW_X+240, FLOW_Y+70, "R9", "10k", orient="v", length=30)
    vcc(FLOW_X+240, FLOW_Y+45, "+5V")
    wire([(FLOW_X+160, FLOW_Y+110), (FLOW_X+240, FLOW_Y+110)])
    jct(FLOW_X+240, FLOW_Y+110)
    wire([(FLOW_X+240, FLOW_Y+85), (FLOW_X+240, FLOW_Y+110)])
    # Connect directly to ESP32 IO14 (Pin 10, y=1240)
    wire([(FLOW_X+240, FLOW_Y+110), (MCU_X-35, 1240)])

    # XKC-Y25 Capacitive Water Level Sensor
    CAP_X = 430
    CAP_Y = 1240
    svg.append(f'''
    <!-- XKC-Y25 Capacitive Level Sensor -->
    <rect x="{CAP_X}" y="{CAP_Y}" width="300" height="150" class="comp-body" />
    <text x="{CAP_X+10}" y="{CAP_Y-8}" class="text-ref">SEN_LEVEL (XKC-Y25)</text>
    <text x="{CAP_X+10}" y="{CAP_Y+168}" class="text-val">Capacitive Non-Contact</text>
    <text x="{CAP_X+10}" y="{CAP_Y+182}" class="text-desc">Penetrates 20mm Tank Wall</text>
    <text x="{CAP_X+10}" y="{CAP_Y+196}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins -->
    <text x="{CAP_X+10}" y="{CAP_Y+35}" class="text-pin-name">Brown: VCC (5-12V)</text>
    <text x="{CAP_X+10}" y="{CAP_Y+75}" class="text-pin-name">Blue: GND (VSS)</text>
    <text x="{CAP_X+10}" y="{CAP_Y+115}" class="text-pin-name">Yellow: Digital Out &#8594; IO21</text>
    ''')

    vcc(CAP_X-25, CAP_Y+30, "+5V")
    wire([(CAP_X, CAP_Y+30), (CAP_X-25, CAP_Y+30)])
    gnd(CAP_X-25, CAP_Y+70, "GND")
    wire([(CAP_X, CAP_Y+70), (CAP_X-25, CAP_Y+70)])
    # Connect directly to ESP32 IO21 (Pin 11, y=1310)
    wire([(CAP_X+170, CAP_Y+110), (MCU_X-35, 1310)])

    # Front Panel Mode Switch SW_MODE (Auto / Off / Manual)
    PANEL_X = 90
    PANEL_Y = 1470
    svg.append(f'''
    <!-- Panel Rotary Mode Switch -->
    <rect x="{PANEL_X}" y="{PANEL_Y}" width="640" height="150" class="comp-body" />
    <text x="{PANEL_X+10}" y="{PANEL_Y-8}" class="text-ref">FRONT PANEL HARDWARE CONTROLS &amp; OVERRIDES</text>
    <text x="{PANEL_X+10}" y="{PANEL_Y+168}" class="text-val">3-Position Heavy Duty Mode Selector</text>
    <text x="{PANEL_X+10}" y="{PANEL_Y+182}" class="text-desc">Allows Growers to Force Autonomous PID, Full Shutdown, or App Bypass</text>

    <!-- Switch Symbol -->
    <text x="{PANEL_X+30}" y="{PANEL_Y+35}" class="text-ref">SW_MODE (3-POS)</text>
    <text x="{PANEL_X+30}" y="{PANEL_Y+52}" class="text-val">Rotary Override</text>
    <circle cx="{PANEL_X+70}" cy="{PANEL_Y+90}" r="4" fill="#990000" />
    <line x1="{PANEL_X+70}" y1="{PANEL_Y+90}" x2="{PANEL_X+110}" y2="{PANEL_Y+75}" class="symbol-part" stroke-width="2.5" />
    <circle cx="{PANEL_X+115}" cy="{PANEL_Y+75}" r="3" fill="#990000" />
    <text x="{PANEL_X+125}" y="{PANEL_Y+79}" class="text-pin-name" style="font-size:12px;">POS 1: AUTO (Local PID)</text>
    <circle cx="{PANEL_X+115}" cy="{PANEL_Y+90}" r="3" fill="#990000" />
    <text x="{PANEL_X+125}" y="{PANEL_Y+94}" class="text-pin-name" style="font-size:12px;">POS 2: SYSTEM OFF</text>
    <circle cx="{PANEL_X+115}" cy="{PANEL_Y+105}" r="3" fill="#990000" />
    <text x="{PANEL_X+125}" y="{PANEL_Y+109}" class="text-pin-name" style="font-size:12px;">POS 3: MANUAL OVERRIDE</text>
    ''')
    # Connect directly to ESP32 IO38 (Pin 12, y=1480)
    wire([(PANEL_X+70, PANEL_Y+90), (PANEL_X+70, 1480), (MCU_X-35, 1480)])

    # =========================================================================
    # SECTION 4: ENVIRONMENTAL SENSOR ARRAYS (Top-Right)
    # =========================================================================
    # S1: DHT11
    DHT_X = 1400
    DHT_Y = 160
    svg.append(f'''
    <!-- S1: DHT11 Sensor -->
    <rect x="{DHT_X}" y="{DHT_Y}" width="180" height="140" class="comp-body" />
    <text x="{DHT_X+10}" y="{DHT_Y-8}" class="text-ref">S1 (DHT11 / SHT31)</text>
    <text x="{DHT_X+10}" y="{DHT_Y+158}" class="text-val">Temp &amp; Relative Humidity</text>
    <text x="{DHT_X+10}" y="{DHT_Y+172}" class="text-desc">&#177;2% RH / 0-100% Humidity</text>
    <text x="{DHT_X+10}" y="{DHT_Y+186}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins -->
    <text x="{DHT_X+10}" y="{DHT_Y+30}" class="text-pin-name">1: VCC (3.3V)</text>
    <text x="{DHT_X+10}" y="{DHT_Y+65}" class="text-pin-name">2: DATA (IO4)</text>
    <text x="{DHT_X+10}" y="{DHT_Y+95}" class="text-pin-name">3: NC (Unused)</text>
    <text x="{DHT_X+10}" y="{DHT_Y+125}" class="text-pin-name">4: GND (VSS)</text>
    ''')

    wire([(DHT_X, DHT_Y+25), (DHT_X-30, DHT_Y+25)])
    vcc(DHT_X-30, DHT_Y+25, "+3.3V")
    wire([(DHT_X, DHT_Y+120), (DHT_X-30, DHT_Y+120)])
    gnd(DHT_X-30, DHT_Y+120, "VSS")

    # Pull-up Resistor R1 (10k) on DATA line
    resistor(DHT_X-45, DHT_Y+15, "R1", "10k", orient="v", length=30)
    vcc(DHT_X-45, DHT_Y-10, "+3.3V")
    wire([(DHT_X, DHT_Y+60), (DHT_X-45, DHT_Y+60)])
    jct(DHT_X-45, DHT_Y+60)
    wire([(DHT_X-45, DHT_Y+30), (DHT_X-45, DHT_Y+60)])
    # Connect DATA directly to ESP32 IO4 (Pin 14, y=240)
    wire([(DHT_X-45, DHT_Y+60), (MCU_X+MCU_W+35, 240)])

    # S2: LDR Light Sensor
    LDR_X = 1750
    LDR_Y = 160
    svg.append(f'''
    <!-- S2: LDR Light Sensor -->
    <rect x="{LDR_X}" y="{LDR_Y}" width="180" height="140" class="comp-body" />
    <text x="{LDR_X+10}" y="{LDR_Y-8}" class="text-ref">S2 (LDR SENSOR)</text>
    <text x="{LDR_X+10}" y="{LDR_Y+158}" class="text-val">GL5528 Photocell</text>
    <text x="{LDR_X+10}" y="{LDR_Y+172}" class="text-desc">0-1000 Lux Light Tracker</text>
    <text x="{LDR_X+10}" y="{LDR_Y+186}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins -->
    <text x="{LDR_X+10}" y="{DHT_Y+30}" class="text-pin-name">1: VCC (3.3V)</text>
    <text x="{LDR_X+10}" y="{DHT_Y+70}" class="text-pin-name">2: DIVIDER JCT</text>
    <text x="{LDR_X+10}" y="{DHT_Y+115}" class="text-pin-name">3: GND (via 10k)</text>
    ''')

    wire([(LDR_X, LDR_Y+25), (LDR_X-30, LDR_Y+25)])
    vcc(LDR_X-30, LDR_Y+25, "+3.3V")

    # Divider Resistor R2 (10k)
    resistor(LDR_X-45, LDR_Y+105, "R2", "10k", orient="v", length=30)
    wire([(LDR_X, LDR_Y+65), (LDR_X-45, LDR_Y+65)])
    jct(LDR_X-45, LDR_Y+65)
    wire([(LDR_X-45, LDR_Y+65), (LDR_X-45, LDR_Y+90)])
    wire([(LDR_X-45, LDR_Y+120), (LDR_X-45, LDR_Y+135)])
    gnd(LDR_X-45, LDR_Y+135, "VSS")
    # Connect LDR junction directly to ESP32 IO5 (Pin 15, y=310)
    wire([(LDR_X-45, LDR_Y+65), (1330, LDR_Y+65), (1330, 310), (MCU_X+MCU_W+35, 310)])

    # S3: MQ-135 Gas Sensor
    MQ_X = 2100
    MQ_Y = 160
    svg.append(f'''
    <!-- S3: MQ-135 Gas Sensor -->
    <rect x="{MQ_X}" y="{MQ_Y}" width="180" height="140" class="comp-body" />
    <text x="{MQ_X+10}" y="{MQ_Y-8}" class="text-ref">S3 (MQ-135 MODULE)</text>
    <text x="{MQ_X+10}" y="{MQ_Y+158}" class="text-val">CO2 / NH3 / Air Index</text>
    <text x="{MQ_X+10}" y="{MQ_Y+172}" class="text-desc">Dedicated 5V Heater Rail</text>
    <text x="{MQ_X+10}" y="{MQ_Y+186}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins -->
    <text x="{MQ_X+10}" y="{MQ_Y+30}" class="text-pin-name">1: VCC (5V VIN)</text>
    <text x="{MQ_X+10}" y="{MQ_Y+65}" class="text-pin-name">2: GND (VSS)</text>
    <text x="{MQ_X+10}" y="{MQ_Y+95}" class="text-pin-name">3: DO (Threshold)</text>
    <text x="{MQ_X+10}" y="{MQ_Y+125}" class="text-pin-name">4: AO (Analog Out)</text>
    ''')

    wire([(MQ_X, MQ_Y+25), (MQ_X-30, MQ_Y+25)])
    vcc(MQ_X-30, MQ_Y+25, "+5V (HEATER)")
    wire([(MQ_X, MQ_Y+60), (MQ_X-30, MQ_Y+60)])
    gnd(MQ_X-30, MQ_Y+60, "VSS")

    # Connect MQ-135 AO to ESP32 IO6 (Pin 16, y=380)
    wire([(MQ_X, MQ_Y+120), (MQ_X-50, MQ_Y+120), (MQ_X-50, 380), (MCU_X+MCU_W+35, 380)])

    # S4: Water Level Resistive Probe
    WTR_X = 2450
    WTR_Y = 160
    svg.append(f'''
    <!-- S4: Submersible Water Level Probe -->
    <rect x="{WTR_X}" y="{WTR_Y}" width="180" height="140" class="comp-body" />
    <text x="{WTR_X+10}" y="{WTR_Y-8}" class="text-ref">S4 (WATER LEVEL)</text>
    <text x="{WTR_X+10}" y="{WTR_Y+158}" class="text-val">Submersible Probe</text>
    <text x="{WTR_X+10}" y="{WTR_Y+172}" class="text-desc">Anti-Corrosion Strobe</text>
    <text x="{WTR_X+10}" y="{WTR_Y+186}" class="text-placeholder">&lt;TEXT&gt;</text>

    <!-- Pins -->
    <text x="{WTR_X+10}" y="{WTR_Y+30}" class="text-pin-name">1: + (PWR STROBE)</text>
    <text x="{WTR_X+10}" y="{WTR_Y+75}" class="text-pin-name">2: - (GND VSS)</text>
    <text x="{WTR_X+10}" y="{WTR_Y+120}" class="text-pin-name">3: S (SIGNAL OUT)</text>
    ''')

    # Water Level GND
    wire([(WTR_X, WTR_Y+70), (WTR_X-30, WTR_Y+70)])
    gnd(WTR_X-30, WTR_Y+70, "VSS")

    # Water Level Power (+) from ESP32 IO8 (Pin 18, y=520)
    wire([(WTR_X, WTR_Y+25), (WTR_X-60, WTR_Y+25), (WTR_X-60, 520), (MCU_X+MCU_W+35, 520)])

    # Water Level Signal (S) to ESP32 IO7 (Pin 17, y=450)
    wire([(WTR_X, WTR_Y+115), (WTR_X-80, WTR_Y+115), (WTR_X-80, 450), (MCU_X+MCU_W+35, 450)])

    # =========================================================================
    # SECTION 5: SUSPENDED I2C PROBE & CABINET DISPLAY (Middle-Right)
    # Generous vertical clearance
    # =========================================================================
    I2C_BASE_X = 1400
    I2C_BASE_Y = 705

    # I2C Pull-Up Resistors R7 (SDA), R8 (SCL)
    resistor(I2C_BASE_X+40, I2C_BASE_Y-30, "R7", "4k7 (SDA)", orient="v", length=28)
    vcc(I2C_BASE_X+40, I2C_BASE_Y-55, "+3.3V")
    resistor(I2C_BASE_X+90, I2C_BASE_Y-30, "R8", "4k7 (SCL)", orient="v", length=28)
    vcc(I2C_BASE_X+90, I2C_BASE_Y-55, "+3.3V")

    wire([(I2C_BASE_X+40, I2C_BASE_Y-16), (I2C_BASE_X+40, 670)])
    jct(I2C_BASE_X+40, 670)
    wire([(I2C_BASE_X+90, I2C_BASE_Y-16), (I2C_BASE_X+90, 740)])
    jct(I2C_BASE_X+90, 740)

    # Connect ESP32 I2C Pins directly across
    # SDA (Pin 19, y=670)
    wire([(MCU_X+MCU_W+35, 670), (I2C_BASE_X+40, 670)])
    # SCL (Pin 20, y=740)
    wire([(MCU_X+MCU_W+35, 740), (I2C_BASE_X+90, 740)])

    # 4 I2C Modules
    i2c_chips = [
        ("U3 (SCD41)", "Sensirion True NDIR CO2", "400-5000 ppm (&#177;40ppm)", I2C_BASE_X+180),
        ("U4 (SHT31-D)", "Sensirion Humidity/Temp", "&#177;0.3&#176;C / &#177;2% RH", I2C_BASE_X+480),
        ("U5 (BH1750)", "Digital Lux Sensor", "1-65535 Lux 16-Bit ADC", I2C_BASE_X+780),
        ("U6 (SSD1306)", "0.96\" OLED Display", "128x64 Enclosure Screen", I2C_BASE_X+1080)
    ]

    for uid, title, spec, mx in i2c_chips:
        svg.append(f'''
        <rect x="{mx}" y="{I2C_BASE_Y-45}" width="240" height="145" class="comp-body" />
        <text x="{mx+12}" y="{I2C_BASE_Y-24}" class="text-ref">{uid}</text>
        <text x="{mx+12}" y="{I2C_BASE_Y-7}" class="text-val">{title}</text>
        <text x="{mx+12}" y="{I2C_BASE_Y+10}" class="text-desc">{spec}</text>
        <line x1="{mx}" y1="{I2C_BASE_Y+20}" x2="{mx+240}" y2="{I2C_BASE_Y+20}" stroke="#999999" stroke-width="0.8" />
        <text x="{mx+12}" y="{I2C_BASE_Y+38}" class="text-pin-name" style="font-size:11px;">1: VDD (3.3V)</text>
        <text x="{mx+12}" y="{I2C_BASE_Y+56}" class="text-pin-name" style="font-size:11px;">2: GND (VSS)</text>
        <text x="{mx+12}" y="{I2C_BASE_Y+74}" class="text-pin-name" style="font-size:11px;">3: SDA (Data)</text>
        <text x="{mx+130}" y="{I2C_BASE_Y+74}" class="text-pin-name" style="font-size:11px;">4: SCL (Clock)</text>
        ''')
        # Power VDD
        wire([(mx+5, I2C_BASE_Y+34), (mx-15, I2C_BASE_Y+34)])
        vcc(mx-15, I2C_BASE_Y+34, "3V3")
        # GND
        wire([(mx+5, I2C_BASE_Y+52), (mx-15, I2C_BASE_Y+52)])
        gnd(mx-15, I2C_BASE_Y+52, "VSS")

    # I2C Bus Distribution Lines across all 4 chips
    wire([(I2C_BASE_X+40, 670), (I2C_BASE_X+1320, 670)])
    wire([(I2C_BASE_X+90, 740), (I2C_BASE_X+1320, 740)])

    # =========================================================================
    # SECTION 6: PROTOTYPE LED FEEDBACK & GX16 PORTS (Lower-Right)
    # =========================================================================
    proto_leds = [
        ("D1", "FANS LED", "Green", "#009900", "R3", 1400),
        ("D2", "VALVE/CO2", "Yellow", "#CCAA00", "R4", 1550),
        ("D3", "MISTERS", "Blue", "#0066CC", "R5", 1700),
        ("D4", "LIGHTS", "White", "#888888", "R6", 1850)
    ]

    for lid, lname, color, chex, rid, lx in proto_leds:
        led(lx, 975, lid, lname, chex)
        resistor(lx, 1030, rid, "220R", orient="v", length=24)
        vcc(lx, 940, "+3.3V")
        wire([(lx, 940), (lx, 949)])
        wire([(lx, 1001), (lx, 1018)])
        wire([(lx, 1042), (lx, 1060)])
        gnd(lx, 1060, "VSS")

    # Front Panel LEDs: WiFi (IO47, y=920) & Alarm (IO48, y=990)
    led(2030, 975, "LED_WF", "WiFi (Blue)", "#0044FF")
    resistor(2030, 1030, "R_WF", "220R", orient="v", length=24)
    wire([(MCU_X+MCU_W+35, 920), (2030, 920), (2030, 949)])
    wire([(2030, 1001), (2030, 1018)])
    wire([(2030, 1042), (2030, 1060)])
    gnd(2030, 1060, "VSS")

    led(2180, 975, "LED_AL", "Alarm (Red)", "#DD0000")
    resistor(2180, 1030, "R_AL", "220R", orient="v", length=24)
    wire([(MCU_X+MCU_W+35, 990), (2180, 990), (2180, 949)])
    wire([(2180, 1001), (2180, 1018)])
    wire([(2180, 1042), (2180, 1060)])
    gnd(2180, 1060, "VSS")

    # External GX16 Aviation Ports (6 ports)
    GX_X = 2300
    GX_Y = 890
    gx_ports = [
        ("PORT 1: [EXHAUST FAN]", "Pin 1: +12V (Relay 1 NO) | Pin 2: GND | Pin 3-4: Aux", GX_X, GX_Y+40),
        ("PORT 2: [INTAKE FAN]", "Pin 1: +12V (Relay 2 NO) | Pin 2: GND | Pin 3-4: Aux", GX_X, GX_Y+80),
        ("PORT 3: [MISTER PUMP]", "Pin 1: +12V (Relay 3 NO) | Pin 2: GND | Pin 3-4: Aux", GX_X, GX_Y+120),
        ("PORT 4: [GROW LIGHTS]", "Pin 1: +12V (Relay 4 NO) | Pin 2: GND | Pin 3-4: Aux", GX_X, GX_Y+160),
        ("PORT 5: [WATER VALVE]", "Pin 1: +12V (Relay 5 NO) | Pin 2: GND | Pin 3-4: Flow", GX_X, GX_Y+200),
    ]

    for pname, pdesc, px, py in gx_ports:
        svg.append(f'''
        <rect x="{px}" y="{py-18}" width="470" height="34" class="comp-body" rx="3" />
        <text x="{px+12}" y="{py}" class="text-ref" style="font-size:12px;">{pname}</text>
        <text x="{px+12}" y="{py+12}" class="text-desc" style="font-size:10.5px;">{pdesc}</text>
        <circle cx="{px+450}" cy="{py-1}" r="9" fill="#D2D7C4" stroke="#990000" stroke-width="1.5" />
        <text x="{px+450}" y="{py+3}" text-anchor="middle" class="text-pin-num" style="font-size:9px;">GX16</text>
        ''')

    # =========================================================================
    # SECTION 7: SPECIFICATIONS TABLE & TITLE BLOCK (Bottom-Right)
    # =========================================================================
    TB_X = 1350
    TB_Y = 1240
    TB_W = 1435
    TB_H = 405

    svg.append(f'''
    <!-- Title Block Outer -->
    <rect x="{TB_X}" y="{TB_Y}" width="{TB_W}" height="{TB_H}" fill="#D6DECA" stroke="#526048" stroke-width="2.2" />

    <!-- Title Header -->
    <rect x="{TB_X+10}" y="{TB_Y+10}" width="{TB_W-20}" height="70" fill="#E2E8D8" stroke="#7A896F" stroke-width="1.2" />
    <text x="{TB_X+25}" y="{TB_Y+38}" class="title-hdr">KABUTECH HIYAS &#8212; SMART MUSHROOM AUTOMATION SYSTEM</text>
    <text x="{TB_X+25}" y="{TB_Y+62}" class="title-sub">MASTER ELECTRICAL WIRING SCHEMATIC &amp; COMPONENT NETLIST (PROTEUS ISIS SPEC)</text>

    <!-- Meta Fields -->
    <line x1="{TB_X+10}" y1="{TB_Y+80}" x2="{TB_X+TB_W-10}" y2="{TB_Y+80}" stroke="#7A896F" stroke-width="1.2" />
    <rect x="{TB_X+10}" y="{TB_Y+80}" width="{TB_W-20}" height="50" fill="#DFE5D5" />
    <text x="{TB_X+25}" y="{TB_Y+102}" class="text-pin-name">DOC ID: <tspan class="text-ref">KBT-HIYAS-SCH-002</tspan></text>
    <text x="{TB_X+25}" y="{TB_Y+120}" class="text-pin-name">DESIGN: <tspan class="text-val">Zandro2005 / Kabutech R&amp;D</tspan></text>
    <text x="{TB_X+450}" y="{TB_Y+102}" class="text-pin-name">MICROCONTROLLER: <tspan class="text-ref">ESP32-S3 (Xtensa Dual-Core 240MHz)</tspan></text>
    <text x="{TB_X+450}" y="{TB_Y+120}" class="text-pin-name">POWER SPECS: <tspan class="text-val">220VAC In / 12VDC 5A Main / 5VDC / 3.3VDC</tspan></text>
    <text x="{TB_X+1050}" y="{TB_Y+102}" class="text-pin-name">REVISION: <tspan class="text-ref">REV 2.4 (MASTER)</tspan></text>
    <text x="{TB_X+1050}" y="{TB_Y+120}" class="text-pin-name">STATUS: <tspan class="text-val" style="fill:#006600;">BENCH TESTED &amp; VERIFIED</tspan></text>

    <!-- Pinout Quick Reference Directory -->
    <line x1="{TB_X+10}" y1="{TB_Y+130}" x2="{TB_X+TB_W-10}" y2="{TB_Y+130}" stroke="#7A896F" stroke-width="1.2" />
    <text x="{TB_X+25}" y="{TB_Y+154}" class="text-hdr" style="font-size:14px;">ESP32-S3 COMPLETE PIN ASSIGNMENT REFERENCE</text>

    <text x="{TB_X+25}" y="{TB_Y+180}" class="text-pin-name">GPIO 4  &#8594; DHT11 / SHT31 Data (+10k&#937; Pull-up to 3.3V)</text>
    <text x="{TB_X+25}" y="{TB_Y+202}" class="text-pin-name">GPIO 5  &#8594; LDR Light Sensor (10k&#937; Divider Junction to GND)</text>
    <text x="{TB_X+25}" y="{TB_Y+224}" class="text-pin-name">GPIO 6  &#8594; MQ-135 Analog Output AO (ADC1 CH5)</text>
    <text x="{TB_X+25}" y="{TB_Y+246}" class="text-pin-name">GPIO 7  &#8594; Water Level Sensor Signal S (ADC1 CH6)</text>
    <text x="{TB_X+25}" y="{TB_Y+268}" class="text-pin-name">GPIO 8  &#8594; Water Level Power V+ (Anti-Electrolysis Gated Strobe)</text>
    <text x="{TB_X+25}" y="{TB_Y+290}" class="text-pin-name">GPIO 1  &#8594; Shared I2C SDA (SCD41, SHT31, BH1750, OLED)</text>
    <text x="{TB_X+25}" y="{TB_Y+312}" class="text-pin-name">GPIO 2  &#8594; Shared I2C SCL (SCD41, SHT31, BH1750, OLED)</text>

    <text x="{TB_X+530}" y="{TB_Y+180}" class="text-pin-name">GPIO 9  &#8594; Relay 1 / D1 LED: Exhaust Fan (12V DC)</text>
    <text x="{TB_X+530}" y="{TB_Y+202}" class="text-pin-name">GPIO 10 &#8594; Relay 2 / D2 LED: Intake Fan / CO2 Valve</text>
    <text x="{TB_X+530}" y="{TB_Y+224}" class="text-pin-name">GPIO 11 &#8594; Relay 3 / D3 LED: Misting Pump (60W 12V)</text>
    <text x="{TB_X+530}" y="{TB_Y+246}" class="text-pin-name">GPIO 12 &#8594; Relay 4 / D4 LED: Grow Light Strip (12V)</text>
    <text x="{TB_X+530}" y="{TB_Y+268}" class="text-pin-name">GPIO 13 &#8594; Relay 5 / D5 LED: Solenoid Water Valve (12V NC)</text>
    <text x="{TB_X+530}" y="{TB_Y+290}" class="text-pin-name">GPIO 14 &#8594; Water Flow Sensor Pulse In (YF-S201 Hall)</text>
    <text x="{TB_X+530}" y="{TB_Y+312}" class="text-pin-name">GPIO 21 &#8594; Capacitive Water Level In (XKC-Y25 Digital)</text>

    <text x="{TB_X+1050}" y="{TB_Y+180}" class="text-pin-name">GPIO 47 &#8594; WiFi Status LED (Blue)</text>
    <text x="{TB_X+1050}" y="{TB_Y+202}" class="text-pin-name">GPIO 48 &#8594; System Alarm LED (Red)</text>
    <text x="{TB_X+1050}" y="{TB_Y+224}" class="text-pin-name">GPIO 38 &#8594; Rotary Mode Selector (Auto/Man)</text>
    <text x="{TB_X+1050}" y="{TB_Y+246}" class="text-pin-name">GPIO 0  &#8594; Setup / Provisioning Button</text>
    <text x="{TB_X+1050}" y="{TB_Y+268}" class="text-pin-name">EN / RST &#8594; Hardware Reset Button</text>

    <!-- Engineering Rules -->
    <line x1="{TB_X+10}" y1="{TB_Y+330}" x2="{TB_X+TB_W-10}" y2="{TB_Y+330}" stroke="#7A896F" stroke-width="1.0" />
    <text x="{TB_X+25}" y="{TB_Y+352}" class="text-desc" style="font-weight:bold;">MANDATORY HARDWARE PROTECTION STANDARDS:</text>
    <text x="{TB_X+25}" y="{TB_Y+370}" class="text-desc">1. Inductive Flyback: Fast 1N4007 recovery diodes MUST be placed across all 12V relay coils, fans, pump motor, and solenoid valve.</text>
    <text x="{TB_X+25}" y="{TB_Y+388}" class="text-desc">2. Anti-Corrosion Strobe: Resistive water level sensor power pin (IO8) is energized ONLY during 15ms sampling cycles to prevent electrolysis.</text>
    <text x="{TB_X+25}" y="{TB_Y+406}" class="text-desc">3. Thermal Isolation: MQ-135 5V internal heater coil must maintain at least 10cm separation from DHT11/SHT31 to prevent radiant heat bias.</text>
    ''')

    svg.append("</svg>")
    return "\n".join(svg)

def main():
    svg_str = build_schematic_svg()

    # Dynamic workspace file paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    assets_dir = os.path.join(script_dir, "firmware", "assets")
    os.makedirs(assets_dir, exist_ok=True)

    ws_svg = os.path.join(assets_dir, "kabutech_hiyas_schematic.svg")
    ws_png = os.path.join(assets_dir, "kabutech_hiyas_schematic.png")
    ws_html = os.path.join(assets_dir, "kabutech_hiyas_schematic_viewer.html")

    with open(ws_svg, "w", encoding="utf-8") as f:
        f.write(svg_str)
    print(f"SVG written successfully: {ws_svg}")

    art_dir = os.environ.get("GEMINI_ARTIFACT_DIR", "")
    if art_dir and os.path.isdir(art_dir):
        with open(os.path.join(art_dir, "kabutech_hiyas_schematic.svg"), "w", encoding="utf-8") as f:
            f.write(svg_str)


    # HTML interactive viewer
    html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kabutech Hiyas - Master Wiring Schematic (Proteus ISIS Spec)</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 0;
    background-color: #272C24;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #E2E8D8;
    overflow: hidden;
  }}
  header {{
    background: #171E17;
    height: 52px;
    padding: 0 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #3B4B38;
    box-shadow: 0 4px 14px rgba(0,0,0,0.5);
  }}
  h1 {{
    margin: 0;
    font-size: 16px;
    color: #9ED89D;
    display: flex;
    align-items: center;
    gap: 12px;
  }}
  .badge {{
    background: #2E5A44;
    color: #E8F4EC;
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    font-weight: bold;
    letter-spacing: 0.5px;
  }}
  .controls {{ display: flex; gap: 8px; align-items: center; }}
  button, .btn {{
    background: #2E5A44;
    color: #FFF;
    border: 1px solid #48805F;
    padding: 6px 14px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    transition: all 0.2s;
  }}
  button:hover, .btn:hover {{
    background: #3D785B;
    box-shadow: 0 0 10px rgba(75, 160, 115, 0.5);
  }}
  #canvas-container {{
    width: 100vw;
    height: calc(100vh - 52px);
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 24px;
    cursor: grab;
  }}
  #canvas-container:active {{ cursor: grabbing; }}
  svg {{
    box-shadow: 0 10px 40px rgba(0,0,0,0.7);
    border-radius: 4px;
    transform-origin: top center;
    transition: transform 0.1s ease-out;
  }}
</style>
</head>
<body>
<header>
  <h1>⚡ KABUTECH HIYAS &#8212; Master Electrical Wiring Schematic <span class="badge">PROTEUS ISIS SPEC</span></h1>
  <div class="controls">
    <button onclick="zoomIn()">Zoom +</button>
    <button onclick="zoomOut()">Zoom -</button>
    <button onclick="resetZoom()">100%</button>
    <button onclick="fitWidth()">Fit Screen</button>
    <a href="kabutech_hiyas_schematic.svg" download="kabutech_hiyas_schematic.svg" class="btn">&#8681; Download SVG</a>
    <a href="kabutech_hiyas_schematic.png" download="kabutech_hiyas_schematic.png" class="btn">&#8681; Download PNG</a>
  </div>
</header>
<div id="canvas-container">
{svg_str}
</div>

<script>
let scale = 0.52;
const svg = document.querySelector('svg');
function applyZoom() {{ svg.style.transform = `scale(${{scale}})`; }}
function zoomIn() {{ scale = Math.min(2.5, scale + 0.15); applyZoom(); }}
function zoomOut() {{ scale = Math.max(0.2, scale - 0.15); applyZoom(); }}
function resetZoom() {{ scale = 1.0; applyZoom(); }}
function fitWidth() {{
  const container = document.getElementById('canvas-container');
  scale = Math.max(0.25, (container.clientWidth - 60) / 2860);
  applyZoom();
}}
window.onload = fitWidth;
window.onresize = fitWidth;
</script>
</body>
</html>
'''
    with open(ws_html, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Interactive HTML viewer written: {ws_html}")

    if art_dir and os.path.isdir(art_dir):
        with open(os.path.join(art_dir, "kabutech_hiyas_schematic_viewer.html"), "w", encoding="utf-8") as f:
            f.write(html)

    # High-resolution PNG via Edge
    edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if os.path.exists(edge_path):
        cmd = [
            edge_path,
            "--headless",
            "--disable-gpu",
            "--force-device-scale-factor=1.6",
            "--window-size=2920,1780",
            f"--screenshot={ws_png}",
            ws_svg
        ]
        print("Rendering ultra high-resolution PNG...")
        res = subprocess.run(cmd, capture_output=True, text=True)
        if os.path.exists(ws_png):
            print(f"Generated PNG: {ws_png} ({os.path.getsize(ws_png)} bytes)")
            if art_dir and os.path.isdir(art_dir):
                with open(ws_png, "rb") as s, open(os.path.join(art_dir, "kabutech_hiyas_schematic.png"), "wb") as d:
                    d.write(s.read())
                print(f"Copied to artifact directory: {art_dir}")
        else:
            print("Edge failed:", res.stderr)


if __name__ == "__main__":
    main()
