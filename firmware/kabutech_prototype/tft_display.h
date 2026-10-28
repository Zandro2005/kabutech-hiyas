#pragma once

/**
 * ══════════════════════════════════════════════════════════════════════
 *   KABUTECH HIYAS — 3.2" SPI TFT DASHBOARD (320x240 LANDSCAPE)
 *   Theme: KabuTech Brand Deep (#032514) & Emerald Palette
 * ══════════════════════════════════════════════════════════════════════
 * 
 * WIRING (ESP32-S3 to 3.2" TFT):
 *   TFT Pin        ESP32-S3 Pin
 *   ───────        ────────────
 *   VCC    ------> 3.3V (with J1 jumper bridged on TFT) or external +5V
 *   GND    ------> GND
 *   CS     ------> GPIO 10
 *   RESET  ------> GPIO 6
 *   DC/RS  ------> GPIO 15
 *   SDI    ------> GPIO 17 (MOSI)
 *   SCK    ------> GPIO 18 (CLK)
 *   LED    ------> 3.3V (direct backlight power)
 *   SDO    ------> (Unconnected / Optional)
 * ══════════════════════════════════════════════════════════════════════
 */

#define LGFX_USE_V1
#include <LovyanGFX.hpp>
#include <time.h>

#ifndef TFT_ROTATION
// Screen Orientation: 1 = Landscape (Header TOP, Normal Left-to-Right Text)
#define TFT_ROTATION 1
#endif

#ifndef TFT_SPI_FREQ
#define TFT_SPI_FREQ 4000000 // 4 MHz: rock-solid clock immunity for 30cm DuPont extension wires
#endif

class LGFX_KabuTech : public lgfx::LGFX_Device {
  lgfx::Panel_ILI9341 _panel_instance;
  lgfx::Bus_SPI       _bus_instance;

public:
  LGFX_KabuTech(void) {
    {
      auto cfg = _bus_instance.config();
      cfg.spi_host = SPI2_HOST; // FSPI on ESP32-S3
      cfg.spi_mode = 0;
      cfg.freq_write = TFT_SPI_FREQ; // 4 MHz clock eliminates ringing & capacitive distortion over 30cm
      cfg.freq_read  = 4000000;
      cfg.pin_sclk = 18; // GPIO 18: SCK
      cfg.pin_mosi = 17; // GPIO 17: SDI (MOSI)
      cfg.pin_miso = -1; // -1: Unused
      cfg.pin_dc   = 15; // GPIO 15: DC / RS
      _bus_instance.config(cfg);
      _panel_instance.setBus(&_bus_instance);
    }
    {
      auto cfg = _panel_instance.config();
      cfg.pin_cs           = 10; // GPIO 10: CS
      cfg.pin_rst          = -1; // -1: Handled manually with full 250ms charge-pump settling delays
      cfg.pin_busy         = -1;
      cfg.panel_width      = 240;
      cfg.panel_height     = 320;
      cfg.offset_x         = 0;
      cfg.offset_y         = 0;
      cfg.offset_rotation  = 0;
      cfg.dummy_read_pixel = 8;
      cfg.dummy_read_bits  = 1;
      cfg.readable         = false;
      cfg.invert           = false;
      cfg.rgb_order        = false;
      cfg.dlen_16bit       = false;
      cfg.bus_shared       = false;
      _panel_instance.config(cfg);
    }
    setPanel(&_panel_instance);
  }
};

static LGFX_KabuTech tft;

// ─── Theme Color Definitions (RGB565) ───
#define COLOR_BG          0x0122  // #032514 Deep Forest Green
#define COLOR_CARD_BG     0x09C4  // #0A3A22 Card Surface
#define COLOR_CARD_BORDER 0x0A86  // #105231 Card Outline
#define COLOR_EMERALD     0x15D0  // #10B981 Nominal / Optimal
#define COLOR_AMBER       0xFCE0  // #F59E0B Warning / Alert
#define COLOR_RED         0xD944  // #DC2626 Critical
#define COLOR_CYAN        0x05B9  // #06B6D4 Mister Cyan
#define COLOR_YELLOW      0xFFE0  // Grow Lights Bright Yellow
#define COLOR_PURPLE      0xC43F  // #C084FC Timed / Scheduled Violet
#define COLOR_WHITE       0xFFFF  // Text Main
#define COLOR_MUTED       0x9536  // #94A3B8 Slate-400
#define COLOR_MUTED_GREEN 0x6776  // Light mint text
#define COLOR_DARK_SLATE  0x1925  // #1E293B Pill Background
#define COLOR_CHIP_OFF    0x08C2  // Dark idle actuator chip

// ─── Dynamic Mode Themes (RGB565) ───
struct DashboardTheme {
  uint16_t bg;          // Deep background
  uint16_t cardBg;      // Card surface
  uint16_t cardBorder;  // Border lines & dividers
  uint16_t primary;     // Brand logo, active chips, mode accent
  uint16_t subText;     // Card titles / subtitles
  uint16_t chipOff;     // Inactive chip background
  const char* modeName;
};

// 1. AUTO / AI AUTO: Emerald Forest Palette (#10B981)
static const DashboardTheme THEME_AUTO = {
  0x0122,  // #032514 Deep Forest Green
  0x09C4,  // #0A3A22 Card Surface (Deep Emerald Green)
  0x0A86,  // #105231 Card Outline
  0x15D0,  // #10B981 Vibrant Emerald
  0x6776,  // #6EE7B7 Light Mint Text
  0x08C2,  // Dark Forest Idle Chip
  "AUTO"
};

// 2. MANUAL: Industrial Emerald Yellow / Warm Amber Gold Palette (#FACC15 / #EAB308)
static const DashboardTheme THEME_MANUAL = {
  0x20C0,  // #1F1704 Deep Warm Charcoal Amber Background
  0x49C0,  // #4E3806 Rich Glowing Emerald Yellow / Amber Gold Card Surface
  0xE580,  // #EAB308 Radiant Emerald Yellow / Gold Border
  0xFDE0,  // #FACC15 Bright Emerald Yellow Accent
  0xFF90,  // #FEF08A Warm Light Gold Title
  0x2940,  // Dark Amber Idle Chip
  "MANUAL"
};

// 3. TIMED / SCHEDULED: Royal Purple Palette (#C084FC / #A855F7)
static const DashboardTheme THEME_TIMED = {
  0x1845,  // #180828 Deep Midnight Purple Background
  0x388C,  // #3B1366 Rich Royal Purple Card Surface
  0x92BF,  // #9355F8 Vivid Purple Border
  0xC43F,  // #C084FC Bright Violet Accent
  0xE6BF,  // #E6D5FF Soft Lavender Title
  0x2067,  // Dark Violet Idle Chip
  "TIMED"
};

// Active theme state
static DashboardTheme curTheme = THEME_AUTO;
static String prevThemeMode = "";

inline DashboardTheme getThemeForMode(const String& mode) {
  if (mode == "MANUAL") {
    return THEME_MANUAL;
  } else if (mode == "TIMED" || mode == "SCHEDULED") {
    return THEME_TIMED;
  } else {
    return THEME_AUTO;
  }
}

// Track previous values to eliminate screen redraw flicker
static float prevT = -999.0;
static float prevH = -999.0;
static int   prevC = -999;
static int   prevL = -999;
static int   prevExh = -1;
static int   prevInt = -1;
static int   prevMist = -1;
static int   prevLight = -1;
static String prevMode = "";
static bool  prevWifi = false;
static bool  prevFb = false;
static int   prevMinute = -1;
static unsigned long lastUptimeDraw = 0;
static bool  baseDrawn = false;
static uint8_t currentTftRotation = TFT_ROTATION;

// ─── Forward Declarations ───
void initDisplay(bool skipBootSplash = true);
void healTftDisplay(const String& mode = "");
void drawBootSplash();
void updateBootStep(const char* label, bool success);
void drawReconnectingScreen(const char* status = nullptr, int progressPercent = -1);
void updateReconnectingStatus(const char* status, const char* subtext = nullptr, int progressPercent = -1);
void drawStaticDashboard(const String& mode = "");
void drawDashboard(float temp, float hum, int light, int co2,
                   bool shtErr, bool lightErr, bool co2Err,
                   bool exhOn, bool intOn, bool mistOn, bool lightOn,
                   const String& mode, bool wifiOk, bool fbOk,
                   bool aiActive = false, const char* aiAct = "none");

// ─── Initialize TFT (BOOT SCREEN COMPLETELY REMOVED — Go Direct to Live Dashboard!) ───
void initDisplay(bool skipBootSplash) {
  (void)skipBootSplash;
  Serial.println("📺 [TFT] Initializing 3.2\" SPI ILI9341 Display directly to Live Dashboard...");

  // 1. Ensure Backlight pin is HIGH (GPIO 2) & CS is deselected HIGH (GPIO 10)
  pinMode(2, OUTPUT);
  digitalWrite(2, HIGH);
  pinMode(10, OUTPUT);
  digitalWrite(10, HIGH);

  // 2. Perform deep hardware reset with long settling time for 30cm wire capacitance
  pinMode(6, OUTPUT);
  digitalWrite(6, HIGH);
  delay(20);
  digitalWrite(6, LOW);   // Drive RESET LOW
  delay(80);              // Hold reset LOW for 80ms to discharge internal charge pumps
  digitalWrite(6, HIGH);  // Release RESET
  delay(250);             // Wait 250ms for internal VCOM/VGH/VGL voltage boosters to settle

  // 3. Initialize LovyanGFX bus and panel
  bool ok = tft.init();
  if (ok) {
    Serial.println("✅ [TFT] LovyanGFX bus & panel initialized.");
  } else {
    Serial.println("⚠️ [TFT] LovyanGFX init returned false — check CS, DC, or MOSI connections.");
  }

  tft.setRotation(currentTftRotation); // 320x240 Landscape Mode
  tft.setBrightness(255);

  // 4. Force explicit MIPI DCS wake-up sequence (forces chip out of hardware sleep)
  // CRITICAL: Must wait >= 150ms after 0x01 (Software Reset in Sleep Out mode) so 0x11 is not ignored!
  tft.startWrite();
  tft.writeCommand(0x01); // Software Reset
  delay(150);             // Mandatory >= 150ms post-reset lockout wait (ILI9341 Section 8.2.2)
  tft.writeCommand(0x11); // Sleep Out (Exit Sleep Mode)
  delay(150);             // Mandatory >= 150ms VGH/VGL step-up charge pump stabilization
  tft.writeCommand(0x29); // Display ON
  delay(50);
  tft.endWrite();

  // 5. Polarize liquid crystals to black, then render live dashboard immediately
  tft.fillScreen(0x0000); // Black fill primes and polarizes LCD crystal shutter
  delay(80);
  baseDrawn = false;
  drawStaticDashboard(curTheme.modeName);
  Serial.println("✅ [TFT] Direct Live Dashboard rendered successfully (boot screen eliminated).");
}

// ─── Silent Zero-Wipe TFT Wake Guard (Prevents White Screen after Relay/Light Surge without Screen Wipe) ───
void healTftDisplay(const String& mode) {
  (void)mode;
  // 1. Lock Reset (GPIO 6), Backlight (GPIO 2), and CS (GPIO 10) HIGH to clear any EMI state
  digitalWrite(2, HIGH);
  digitalWrite(6, HIGH);
  digitalWrite(10, HIGH);

  // 2. Silently assert Sleep Out (0x11) and Display ON (0x29) WITHOUT touching 0xB6/0x36 or clearing GRAM!
  tft.startWrite();
  tft.writeCommand(0x11); // Sleep Out (wakes internal VGH/VGL charge pumps if brownout occurred)
  delay(20);              // Mandatory >= 5ms wait after 0x11 before sending 0x29 (ILI9341 Section 8.2.12)
  tft.writeCommand(0x29); // Display ON (keeps liquid crystal shutter active)
  tft.endWrite();

  // 3. Force in-place refresh of actuator chips only (NO full-screen wipe!)
  prevExh = -1;
  prevInt = -1;
  prevMist = -1;
  prevLight = -1;
}

// ─── Boot Splash & Checklist Stubs (Completely Removed from Screen) ───
void drawBootSplash() {
  // Empty stub: boot screen completely removed per user request
}

void updateBootStep(const char* label, bool success) {
  // Empty stub: boot checklist completely removed per user request
  (void)label;
  (void)success;
}

// ─── Cloud Reconnecting Screen (320x240 Landscape) ───
void drawReconnectingScreen(const char* status, int progressPercent) {
  baseDrawn = false; // Invalidate dashboard cache
  tft.fillScreen(COLOR_BG);
  
  // Outer decorative border
  tft.drawRect(4, 4, 312, 232, COLOR_CARD_BORDER);

  // Logo / Header
  tft.setTextDatum(textdatum_t::top_center);
  tft.setTextColor(COLOR_EMERALD, COLOR_BG);
  tft.setFont(nullptr);
  tft.setTextSize(3);
  tft.drawString("KABUTECH", 160, 14);

  tft.setTextSize(1);
  tft.setTextColor(COLOR_MUTED_GREEN, COLOR_BG);
  tft.drawString("HIYAS AUTOMATION - Oyster Mushroom Environment", 160, 42);

  // Divider line
  tft.drawLine(24, 54, 296, 54, COLOR_CARD_BORDER);

  // Reconnecting Card Modal (Clean text-focused design without lingering progress bar)
  tft.fillRoundRect(24, 60, 272, 148, 8, COLOR_CARD_BG);
  tft.drawRoundRect(24, 60, 272, 148, 8, COLOR_AMBER);

  // Status icon and title
  tft.setTextDatum(textdatum_t::top_center);
  tft.setTextColor(COLOR_AMBER, COLOR_CARD_BG);
  tft.setTextSize(2);
  tft.drawString("RECONNECTING", 160, 75);

  // Primary status text
  tft.setTextSize(1);
  tft.setTextColor(COLOR_WHITE, COLOR_CARD_BG);
  tft.drawString(status != nullptr ? status : "Restoring Cloud Link...", 160, 106);

  // Secondary subtext
  tft.setTextColor(COLOR_MUTED_GREEN, COLOR_CARD_BG);
  tft.drawString("Syncing App Mode & Controls...", 160, 128);

  tft.setTextColor(COLOR_MUTED, COLOR_CARD_BG);
  tft.drawString("Sensors & Edge AI running locally", 160, 155);

  // Footer
  tft.setTextDatum(textdatum_t::bottom_center);
  tft.setTextColor(COLOR_MUTED, COLOR_BG);
  tft.drawString("Matching mobile app settings...", 160, 226);
}

// Update status dynamically without full redraw flicker or progress bar ghosting
void updateReconnectingStatus(const char* status, const char* subtext, int progressPercent) {
  tft.setTextDatum(textdatum_t::top_center);
  tft.setFont(nullptr);
  tft.setTextSize(1);

  // Clear and update status text line
  tft.fillRect(30, 104, 260, 18, COLOR_CARD_BG);
  tft.setTextColor(COLOR_WHITE, COLOR_CARD_BG);
  if (status != nullptr) {
    tft.drawString(status, 160, 106);
  }

  // Clear and update subtext line
  if (subtext != nullptr) {
    tft.fillRect(30, 126, 260, 18, COLOR_CARD_BG);
    tft.setTextColor(COLOR_MUTED_GREEN, COLOR_CARD_BG);
    tft.drawString(subtext, 160, 128);
  }
}

// ─── Draw Base Landscape Dashboard Layout (320x240) ───
void drawStaticDashboard(const String& mode) {
  if (mode.length() > 0) {
    prevThemeMode = mode;
    curTheme = getThemeForMode(mode);
  }

  // 1. Fill entire screen with the mode background (Purple for TIMED, Emerald Yellow for MANUAL, Forest Green for AUTO)
  tft.fillScreen(curTheme.bg);

  // 2. Top header divider line (Y: 26)
  tft.drawLine(0, 26, 320, 26, curTheme.cardBorder);

  // 3. Static Brand Header (Left)
  tft.setFont(nullptr);
  tft.setTextDatum(textdatum_t::middle_left);
  tft.setTextSize(2);
  tft.setTextColor(curTheme.primary, curTheme.bg);
  tft.drawString("KABUTECH", 8, 13);

  // 4. Draw the 4 Parameter Widget Cards with curTheme.cardBg (Purple when TIMED, Emerald Yellow when MANUAL!)
  // Card 1: Temp (Col 1, Row 1) -> X: 6, Y: 30, W: 152, H: 82
  tft.fillRoundRect(6, 30, 152, 82, 6, curTheme.cardBg);
  tft.drawRoundRect(6, 30, 152, 82, 6, curTheme.cardBorder);

  // Card 2: Hum (Col 2, Row 1) -> X: 162, Y: 30, W: 152, H: 82
  tft.fillRoundRect(162, 30, 152, 82, 6, curTheme.cardBg);
  tft.drawRoundRect(162, 30, 152, 82, 6, curTheme.cardBorder);

  // Card 3: CO2 (Col 1, Row 2) -> X: 6, Y: 116, W: 152, H: 82
  tft.fillRoundRect(6, 116, 152, 82, 6, curTheme.cardBg);
  tft.drawRoundRect(6, 116, 152, 82, 6, curTheme.cardBorder);

  // Card 4: Light (Col 2, Row 2) -> X: 162, Y: 116, W: 152, H: 82
  tft.fillRoundRect(162, 116, 152, 82, 6, curTheme.cardBg);
  tft.drawRoundRect(162, 116, 152, 82, 6, curTheme.cardBorder);

  // 5. Bottom Actuator & Info Container (Y: 202 to 236)
  tft.fillRoundRect(6, 202, 308, 32, 6, curTheme.cardBg);
  tft.drawRoundRect(6, 202, 308, 32, 6, curTheme.cardBorder);

  // 6. Card Titles in new theme subText color
  tft.setTextDatum(textdatum_t::top_left);
  tft.setTextSize(1);
  tft.setTextColor(curTheme.subText, curTheme.cardBg);
  tft.drawString("TEMPERATURE", 14, 36);
  tft.drawString("HUMIDITY",    170, 36);
  tft.drawString("CO2 LEVEL",   14, 122);
  tft.drawString("LIGHT LEVEL", 170, 122);

  // 7. Target Ranges in muted color
  tft.setTextDatum(textdatum_t::bottom_left);
  tft.setTextColor(COLOR_MUTED, curTheme.cardBg);
  tft.drawString("Target: 18 - 25 °C", 16, 30 + 82 - 6);
  tft.drawString("Target: 80 - 95 %",  172, 30 + 82 - 6);
  tft.drawString("Target: < 1000 ppm", 16, 116 + 82 - 6);
  tft.drawString("Target: 150-1000 lx", 172, 116 + 82 - 6);

  // Invalidate previous cache to force immediate redraw of dynamic cards & chips on new theme
  prevT = -999.0;
  prevH = -999.0;
  prevC = -999;
  prevL = -999;
  prevExh = -1;
  prevInt = -1;
  prevMist = -1;
  prevLight = -1;
  prevMinute = -1;
  lastUptimeDraw = 0;
  prevMode = "";

  baseDrawn = true;
}

// ─── Helper: Draw an Environmental Metric Card (Landscape 152x82) ───
void drawMetricCard(int x, int y, int w, int h,
                    const char* title, const char* valStr, const char* unit,
                    const char* pillText, uint16_t pillColor,
                    const char* targetRange) {
  (void)title;
  (void)targetRange;
  (void)h;
  tft.setFont(nullptr);

  // 1. Status Pill (Top Right)
  int pillW = 54;
  int pillH = 14;
  int pillX = x + w - pillW - 6;
  int pillY = y + 5;
  tft.fillRoundRect(pillX, pillY, pillW, pillH, 4, COLOR_DARK_SLATE);
  tft.drawRoundRect(pillX, pillY, pillW, pillH, 4, pillColor);

  tft.setTextDatum(textdatum_t::middle_center);
  tft.setTextSize(1);
  tft.setTextColor(pillColor, COLOR_DARK_SLATE);
  tft.drawString(pillText, pillX + (pillW / 2), pillY + (pillH / 2));

  // 2. Main Numeric Readout (Center Left)
  tft.fillRect(x + 6, y + 23, w - 12, 32, curTheme.cardBg);

  tft.setTextDatum(textdatum_t::middle_left);
  tft.setTextSize(3); // Large bold readout
  tft.setTextColor(COLOR_WHITE, curTheme.cardBg);
  tft.drawString(valStr, x + 10, y + 38);

  // Unit symbol right next to number
  int unitOffsetX = (strlen(valStr) >= 4) ? 88 : 72;
  tft.setTextSize(1);
  tft.setTextColor(COLOR_MUTED, curTheme.cardBg);
  tft.drawString(unit, x + unitOffsetX, y + 34);
}

// ─── Helper: Draw an Actuator Chip ───
void drawActuatorChip(int x, int y, int w, int h, const char* label, bool active, uint16_t activeColor) {
  uint16_t bg = active ? activeColor : curTheme.chipOff;
  uint16_t border = active ? activeColor : curTheme.cardBorder;
  uint16_t txt = active ? curTheme.bg : COLOR_MUTED;

  tft.fillRoundRect(x, y, w, h, 4, bg);
  tft.drawRoundRect(x, y, w, h, 4, border);

  tft.setTextDatum(textdatum_t::middle_center);
  tft.setFont(nullptr);
  tft.setTextSize(1);
  tft.setTextColor(txt, bg);
  tft.drawString(label, x + (w / 2), y + (h / 2));
}

// ─── Main Non-Blocking Landscape Dashboard Update ───
void drawDashboard(float temp, float hum, int light, int co2,
                   bool shtErr, bool lightErr, bool co2Err,
                   bool exhOn, bool intOn, bool mistOn, bool lightOn,
                   const String& mode, bool wifiOk, bool fbOk,
                   bool aiActive, const char* aiAct) {
  // Keep hardware RESET (GPIO 6) and Backlight (GPIO 2) firmly HIGH
  digitalWrite(6, HIGH);
  digitalWrite(2, HIGH);

  // Silent zero-flicker MIPI DCS guard: ensures Sleep Out (0x11) and Display ON (0x29)
  tft.startWrite();
  tft.writeCommand(0x11); // Sleep Out
  delay(5);               // Mandatory >= 5ms wait after 0x11 before 0x29 (ILI9341 Section 8.2.12)
  tft.writeCommand(0x29); // Display ON
  tft.endWrite();

  // ── Dynamic Mode Theme Switching ──
  // When operating mode transitions (AUTO <-> MANUAL <-> TIMED), switch theme & repaint base
  if (mode != prevThemeMode || !baseDrawn) {
    prevThemeMode = mode;
    curTheme = getThemeForMode(mode);
    drawStaticDashboard(mode);
  }

  // 1. TOP HEADER (320px Width)
  tft.setFont(nullptr);

  // Brand Name (Left)
  tft.setTextDatum(textdatum_t::middle_left);
  tft.setTextSize(2);
  tft.setTextColor(curTheme.primary, curTheme.bg);
  tft.drawString("KABUTECH", 8, 13);

  // ── Calculate In-Range Count exactly matching mobile app dashboard ──
  int inRangeCount = 0;
  // Literature Oyster Fruiting Target Bands (matching environmentRanges.ts evaluateParam):
  // Temp: 18 - 25 °C
  // Hum:  80 - 95 %
  // CO2:  < 1000 ppm
  // Light: 150 - 1000 lx
  bool tempInRange  = (!shtErr   && temp >= 18.0 && temp <= 25.0);
  bool humInRange   = (!shtErr   && hum >= 80.0  && hum <= 95.0);
  bool co2InRange   = (!co2Err   && co2 > 0      && co2 <= 1000);
  bool lightInRange = (!lightErr && light >= 150 && light <= 1000);

  if (tempInRange) inRangeCount++;
  if (humInRange) inRangeCount++;
  if (co2InRange) inRangeCount++;
  if (lightInRange) inRangeCount++;

  bool hasFault = shtErr || lightErr || co2Err || temp <= -900 || hum <= -900 || co2 <= 0;

  // Center Status: e.g. "4/4 IN RANGE", "3/4 IN RANGE", "1/4 IN RANGE"
  tft.setTextDatum(textdatum_t::middle_center);
  tft.setTextSize(1);
  tft.fillRect(110, 4, 114, 18, curTheme.bg);

  char statusBuf[24];
  if (hasFault) {
    snprintf(statusBuf, sizeof(statusBuf), "%d/4 | FAULT", inRangeCount);
    tft.setTextColor(COLOR_AMBER, curTheme.bg);
  } else if (inRangeCount == 4) {
    snprintf(statusBuf, sizeof(statusBuf), "4/4 IN RANGE");
    tft.setTextColor(curTheme.primary, curTheme.bg);
  } else {
    snprintf(statusBuf, sizeof(statusBuf), "%d/4 IN RANGE", inRangeCount);
    tft.setTextColor(inRangeCount <= 1 ? COLOR_RED : COLOR_AMBER, curTheme.bg);
  }
  tft.drawString(statusBuf, 166, 13);

  // Clock from NTP (Right)
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 10) && timeinfo.tm_year > 120) {
    if (timeinfo.tm_min != prevMinute) {
      prevMinute = timeinfo.tm_min;
      char timeBuff[10];
      strftime(timeBuff, sizeof(timeBuff), "%H:%M", &timeinfo);
      tft.fillRect(224, 4, 42, 18, curTheme.bg);
      tft.setTextDatum(textdatum_t::middle_right);
      tft.setTextSize(1);
      tft.setTextColor(COLOR_WHITE, curTheme.bg);
      tft.drawString(timeBuff, 266, 13);
    }
  } else if (prevMinute == -1) {
    tft.fillRect(224, 4, 42, 18, curTheme.bg);
    tft.setTextDatum(textdatum_t::middle_right);
    tft.setTextSize(1);
    tft.setTextColor(COLOR_MUTED, curTheme.bg);
    tft.drawString("--:--", 266, 13);
  }

  // Cloud Link Status Pill (Far Right) - Shows LOCAL when offline, proving main box is alive
  tft.setTextDatum(textdatum_t::middle_right);
  tft.setTextSize(1);
  tft.fillRect(268, 4, 48, 18, curTheme.bg);
  if (wifiOk && fbOk) {
    tft.setTextColor(COLOR_EMERALD, curTheme.bg);
    tft.drawString("ONLINE", 312, 13);
  } else if (wifiOk) {
    tft.setTextColor(COLOR_AMBER, curTheme.bg);
    tft.drawString("SYNC", 312, 13);
  } else {
    tft.setTextColor(COLOR_CYAN, curTheme.bg);
    tft.drawString("LOCAL", 312, 13); // Main box runs 100% autonomous locally
  }

  // 2. ENVIRONMENTAL CARDS (2x2 Grid)

  // ── Temperature Card (X: 6, Y: 30) ──
  // Target: 18 - 25 °C (Grace buffer: 16 - 27 °C)
  if (temp != prevT || shtErr) {
    prevT = temp;
    char valBuf[10];
    const char* pillTxt = "OPTIMAL";
    uint16_t pillCol = COLOR_EMERALD;

    if (shtErr || temp <= -900) {
      snprintf(valBuf, sizeof(valBuf), "--");
      pillTxt = "FAULT";
      pillCol = COLOR_MUTED;
    } else {
      snprintf(valBuf, sizeof(valBuf), "%.1f", temp);
      if (temp < 18.0) {
        pillTxt = (temp < 16.0) ? "CRIT" : "LOW";
        pillCol = (temp < 16.0) ? COLOR_RED : COLOR_AMBER;
      } else if (temp > 25.0) {
        pillTxt = (temp > 27.0) ? "CRIT" : "HIGH";
        pillCol = (temp > 27.0) ? COLOR_RED : COLOR_AMBER;
      } else {
        pillTxt = "OPTIMAL";
        pillCol = COLOR_EMERALD;
      }
    }
    drawMetricCard(6, 30, 152, 82, "TEMPERATURE", valBuf, "°C", pillTxt, pillCol, "Target: 18 - 25 °C");
  }

  // ── Humidity Card (X: 162, Y: 30) ──
  // Target: 80 - 95 % (Grace buffer: 75 - 100 %)
  if (hum != prevH || shtErr) {
    prevH = hum;
    char valBuf[10];
    const char* pillTxt = "OPTIMAL";
    uint16_t pillCol = COLOR_EMERALD;

    if (shtErr || hum <= -900) {
      snprintf(valBuf, sizeof(valBuf), "--");
      pillTxt = "FAULT";
      pillCol = COLOR_MUTED;
    } else {
      snprintf(valBuf, sizeof(valBuf), "%d", (int)round(hum));
      if (hum < 80.0) {
        pillTxt = (hum < 75.0) ? "DRY" : "LOW";
        pillCol = (hum < 75.0) ? COLOR_RED : COLOR_AMBER;
      } else if (hum > 95.0) {
        pillTxt = "SAT";
        pillCol = COLOR_AMBER;
      } else {
        pillTxt = "OPTIMAL";
        pillCol = COLOR_EMERALD;
      }
    }
    drawMetricCard(162, 30, 152, 82, "HUMIDITY", valBuf, "%", pillTxt, pillCol, "Target: 80 - 95 %");
  }

  // ── CO2 Card (X: 6, Y: 116) ──
  // Target: < 1000 ppm (Grace buffer: <= 1150 ppm)
  if (co2 != prevC || co2Err) {
    prevC = co2;
    char valBuf[10];
    const char* pillTxt = "OPTIMAL";
    uint16_t pillCol = COLOR_EMERALD;

    if (co2Err || co2 <= 0) {
      if (millis() < 10000 && co2 <= 0) {
        snprintf(valBuf, sizeof(valBuf), "...");
        pillTxt = "WARM";
        pillCol = COLOR_CYAN;
      } else {
        snprintf(valBuf, sizeof(valBuf), "--");
        pillTxt = "FAULT";
        pillCol = COLOR_MUTED;
      }
    } else {
      snprintf(valBuf, sizeof(valBuf), "%d", co2);
      if (co2 > 1150) {
        pillTxt = (co2 > 1500) ? "CRIT" : "HIGH";
        pillCol = (co2 > 1500) ? COLOR_RED : COLOR_AMBER;
      } else if (co2 > 1000) {
        pillTxt = "HIGH";
        pillCol = COLOR_AMBER;
      } else {
        pillTxt = "OPTIMAL";
        pillCol = COLOR_EMERALD;
      }
    }
    drawMetricCard(6, 116, 152, 82, "CO2 LEVEL", valBuf, "ppm", pillTxt, pillCol, "Target: < 1000 ppm");
  }

  // ── Light Card (X: 162, Y: 116) ──
  // Target: 150 - 1000 lx (Grace buffer: 100 - 1050 lx)
  if (light != prevL || lightErr) {
    prevL = light;
    char valBuf[10];
    const char* pillTxt = "OPTIMAL";
    uint16_t pillCol = COLOR_EMERALD;

    if (lightErr || light < 0) {
      snprintf(valBuf, sizeof(valBuf), "--");
      pillTxt = "FAULT";
      pillCol = COLOR_MUTED;
    } else {
      snprintf(valBuf, sizeof(valBuf), "%d", light);
      if (light < 150) {
        pillTxt = (light < 100) ? "DARK" : "LOW";
        pillCol = (light < 100) ? COLOR_RED : COLOR_AMBER;
      } else if (light > 1000) {
        pillTxt = "HIGH";
        pillCol = COLOR_AMBER;
      } else {
        pillTxt = "OPTIMAL";
        pillCol = COLOR_EMERALD;
      }
    }
    drawMetricCard(162, 116, 152, 82, "LIGHT LEVEL", valBuf, "lx", pillTxt, pillCol, "Target: 150-1000 lx");
  }

  // 3. ACTUATOR STATUS CHIPS (Y: 207, H: 22) - Dynamic theme primary active color
  if (exhOn != prevExh || intOn != prevInt || mistOn != prevMist || lightOn != prevLight) {
    prevExh = exhOn;
    prevInt = intOn;
    prevMist = mistOn;
    prevLight = lightOn;

    drawActuatorChip(12,  207, 44, 22, "EXH", exhOn, curTheme.primary);
    drawActuatorChip(60,  207, 44, 22, "INT", intOn, curTheme.primary);
    drawActuatorChip(108, 207, 46, 22, "MIST", mistOn, curTheme.primary);
    drawActuatorChip(158, 207, 48, 22, "LIGHT", lightOn, curTheme.primary);
  }

  // 4. FOOTER INFO: Mode, Edge AI & Uptime (Right side of bottom container)
  static bool   prevAiActive = false;
  static String prevAiAct    = "";
  String curAiAct = (aiAct != nullptr) ? String(aiAct) : "none";

  if (mode != prevMode || aiActive != prevAiActive || curAiAct != prevAiAct) {
    prevMode = mode;
    prevAiActive = aiActive;
    prevAiAct = curAiAct;

    tft.fillRect(208, 206, 52, 24, curTheme.cardBg);
    tft.setTextDatum(textdatum_t::middle_left);
    tft.setTextSize(1);
    if (mode == "MANUAL") {
      tft.setTextColor(curTheme.primary, curTheme.cardBg);
      tft.drawString("MANUAL", 210, 218);
    } else if (mode == "TIMED" || mode == "SCHEDULED") {
      tft.setTextColor(curTheme.primary, curTheme.cardBg);
      tft.drawString("TIMED", 210, 218);
    } else if (curAiAct.startsWith("preempt_")) {
      tft.setTextColor(COLOR_AMBER, curTheme.cardBg);
      tft.drawString("PREEMPT", 210, 218); // Pre-emptive fan/mister triggered by Edge AI
    } else {
      tft.setTextColor(curTheme.primary, curTheme.cardBg);
      tft.drawString("AI AUTO", 210, 218); // TinyML forecasting active on ESP32
    }
  }

  // Uptime
  if (millis() - lastUptimeDraw >= 60000 || lastUptimeDraw == 0) {
    lastUptimeDraw = millis() == 0 ? 1 : millis();
    unsigned long upMins = millis() / 60000;
    unsigned long upHours = upMins / 60;
    upMins = upMins % 60;

    char upBuf[16];
    snprintf(upBuf, sizeof(upBuf), "Up:%luh%02lum", upHours, upMins);

    tft.fillRect(260, 206, 50, 24, curTheme.cardBg);
    tft.setTextDatum(textdatum_t::middle_right);
    tft.setTextSize(1);
    tft.setTextColor(COLOR_MUTED, curTheme.cardBg);
    tft.drawString(upBuf, 308, 218);
  }

  // Ensure SPI Chip Select (GPIO 10) is deselected HIGH when idle so relay EMI cannot clock into ILI9341
  digitalWrite(10, HIGH);
}
