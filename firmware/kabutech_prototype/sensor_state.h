#ifndef SENSOR_STATE_H
#define SENSOR_STATE_H

#include <Arduino.h>

// ═══════════════════════════════════════════════
//  SINGLE SOURCE OF TRUTH: SENSOR HEALTH & DATA
// ═══════════════════════════════════════════════

// Sensor operational status
enum SensorStatus : uint8_t {
  S_INIT = 0,   // Power-on / warm-up grace period (first 15s)
  S_OK,         // Normal valid reading available
  S_FAULT       // Confirmed hardware fault / unplugged / persistent read error
};

// Underlying root-cause fault reason
enum FaultReason : uint8_t {
  R_NONE = 0,
  R_NOT_PRESENT,    // Device did not ACK on I2C bus (unplugged / loose cable)
  R_READ_FAIL,      // I2C NACK or CRC checksum mismatch during register read
  R_OUT_OF_RANGE,   // Reading exceeded physical environmental operating envelope
  R_STALLED,        // Sensor stopped producing fresh measurement data
  R_BUS             // I2C bus lockup / failure
};

// Logical sensor channel state
struct SensorChannelState {
  SensorStatus status;      // Single source of truth for health
  FaultReason  reason;      // Diagnostic reason for fault
  float        value;       // Meaningful only when status == S_OK
  uint32_t     lastOkMs;    // Timestamp of last valid reading
  uint8_t      failStreak;  // Debounce counter for consecutive failures
  uint8_t      okStreak;    // Debounce counter for consecutive successes
};

// Complete multi-channel snapshot with sequence number
struct SensorSnapshot {
  SensorChannelState temp;
  SensorChannelState hum;
  SensorChannelState light;
  SensorChannelState co2;
  uint32_t           seq;
};

// Debounced state updater with boot grace support
inline void updateSensorChannel(SensorChannelState &ch,
                                bool rawValid,
                                float rawVal,
                                FaultReason failReason,
                                uint8_t streakToLatch = 2,
                                uint8_t streakToClear = 2,
                                unsigned long nowMs = 0,
                                unsigned long bootMs = 0,
                                unsigned long initGraceMs = 15000) {
  if (nowMs == 0) nowMs = millis();
  bool inBootGrace = (bootMs == 0) ? (nowMs < initGraceMs) : (nowMs >= bootMs && (nowMs - bootMs < initGraceMs));

  if (rawValid) {
    ch.failStreak = 0;
    ch.okStreak++;
    if (ch.status == S_OK || ch.okStreak >= streakToClear) {
      ch.status   = S_OK;
      ch.reason   = R_NONE;
      ch.value    = rawVal;
      ch.lastOkMs = nowMs;
    }
  } else {
    ch.okStreak = 0;
    ch.failStreak++;
    if (ch.failStreak >= streakToLatch) {
      // In boot grace period, stay in S_INIT instead of flashing S_FAULT
      if (inBootGrace && ch.lastOkMs == 0) {
        ch.status = S_INIT;
        ch.reason = failReason;
        ch.value  = -999.0f;
      } else {
        ch.status = S_FAULT;
        ch.reason = failReason;
        ch.value  = -999.0f;
      }
    }
  }
}

#endif // SENSOR_STATE_H
