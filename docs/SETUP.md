# Setup, folders and branches

## Folders

| Folder | Holds | Built by |
| --- | --- | --- |
| `engine/src/`, `engine/include/`, `engine/core/` | The shared game: gameplay `.cpp`, headers, and the portable C17 core | the web build and PlatformIO |
| `engine/tests/` | The shared code tested on a PC (`host/` harness, `run_host.sh`) | CI, you |
| `firmware/` | `main.cpp`, `rock_random.cpp` and `HARDWARE.md` (wiring, parts, flashing) | PlatformIO |
| `platformio.ini` (root) | `src_dir = firmware`, `-I engine/include`, and `build_src_filter` adding `engine/src/` and `engine/core/` | PlatformIO |
| `web/` | The browser game and, later, the room server | Vercel, Railway |

`web/native/bridge.cpp` includes the engine's `.cpp` files directly, and `web/build.mjs` compiles
`engine/core/*.c`, `engine/src/display.cpp` and `engine/src/sound.cpp` beside it. Only `firmware/`
and `platformio.ini` are handheld-only.

## Commands

Run each from the repository root unless noted.

```sh
cd web && npm ci && npm run check   # lint, format check, WASM builds and the browser suite
sh engine/tests/run_host.sh         # strict C17 core and gameplay checks on this machine
pio run                             # the ESP32 build (~/.platformio/penv/bin/pio if pio is not on PATH)
sh tools/format-core.sh             # format the portable core
```

Editor caches and machine-specific outputs are ignored: `.cache/clangd/` holds the C/C++
symbol index; `compile_commands.json` is regenerated with `pio run -t compiledb`. Deleting
these does not change game source; clangd can recreate its cache while the editor is open.
`web/dist/` and `.pio/build/` are generated builds. Keep the current web build available
while playtesting. `npm start` (or `node web/serve.mjs`) rebuilds a missing `game.wasm`
automatically before starting the local server. Keep dependencies, tests, asset sources
and build tools.

Wiring and flashing the handheld: [firmware/HARDWARE.md](../firmware/HARDWARE.md).

## Branches

- **`main`** is what is deployed. Nothing lands on it except a release from `dev` or a hotfix, and
  every merge is tagged.
- **`dev`** is staging and where daily work goes, directly or on a short branch (`feat/...`) merged
  back by pull request.
- **Release:** open a pull request `dev` → `main`, let CI pass, check staging, merge with a merge
  commit (not a squash), tag the merge, and add the `CHANGELOG.md` entry.
- **Hotfix:** branch from `main` (`fix/...`), pull request to `main`, tag, then merge `main` back
  into `dev` straight away.
- **Handheld work** is an ordinary feature branch off `dev`; the firmware is not deployed, so its
  release is a tag and a flashed board noted in `docs/ACCEPTANCE.md`.

CI (`.github/workflows/check.yml`) runs on every push and pull request to `dev` and `main`: the web
check, the host tests, and `pio run` when `engine/`, `firmware/` or `platformio.ini` changed.
