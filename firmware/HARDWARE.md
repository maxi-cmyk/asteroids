# ESP32 handheld: wiring, parts and flashing

The handheld build lives in `firmware/` (`main.cpp`, `rock_random.cpp`) and compiles the shared game from
`engine/`. Run the `pio` commands below from the repository root, where `platformio.ini` is. For the
repository layout and branches see [docs/SETUP.md](../docs/SETUP.md).

## Wiring

| Signal        | ESP32 Pin |
|---------------|-----------|
| Joystick X    | 34        |
| Joystick Y    | 35        |
| Joystick CLK  | 32        |
| Fire button   | 25        |
| Buzzer        | 27        |
| OLED SDA      | 21        |
| OLED SCL      | 22        |

- OLED: SSD1306 128×64 I2C at address `0x3C`
- Joystick button and fire button: wired active-low (pulled up internally)
- Buzzer: passive buzzer driven with variable-frequency PWM on pin 27

## Build & Flash

```bash
pio run --target upload
pio device monitor --baud 115200
```

## Upload to esp32 
```bash
 ~/.platformio/penv/bin/pio run --target upload
```

## Troubleshooting

**OLED not found** — check SDA/SCL wiring and I2C address (`0x3C`). The firmware halts with a rapid beep sequence if the display fails to initialise. The check is an I2C probe of `0x3C` before the driver starts; a probe that gets no answer prints `OLED not found`, a failed frame-buffer allocation prints a separate message. (The driver's own `begin()` returns true without confirming the panel is there.)

**Frame time (not yet measured on the board).** `OLED_I2C_CLOCK_HZ` is now the driver's transfer clock. A changed full 128×64 frame is 1024 payload bytes; at 400 kbit/s with 9 bit-times per byte that is at least 23.04 ms, above the 20 ms game tick, before any other bus or CPU overhead. Measure full-frame duration and the simulation/wall-clock ratio on the real board and panel before changing the loop timing or raising the clock.

**Joystick drifts** — hold the joystick centred on power-up; `inputInit()` reads centre calibration from 32 samples at boot.

**No sound** — confirm the buzzer is a *passive* type and shares ground with the ESP32. The firmware generates the tone frequency.

**Double-click to pause not registering** — the detection window is 300 ms (`DBLCLICK_WINDOW` in `engine/include/config.h`). Adjust if needed.

## Controls and board checks

Move up/down with the joystick; press fire once per shot. Holding does not repeat. Rapid presses have no shot cooldown; debounce is 20 ms. Double-click the joystick to pause/resume.

After upload, check vertical direction, center drift, rapid presses, display readability, pause during blinking invincibility, and repeated retries. Set a best score, power-cycle the board, and confirm it remains. Adjust `SHIP_MAX_SPEED` in `engine/include/config.h` if needed.
