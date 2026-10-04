import { CONFIG } from "../src/config/constants";
import { DEBUG_DEFAULTS } from "../src/config/debugSettings";
import { DOCK_APPS, VSCODE_DOCK_INDEX } from "../src/lib/virtualDesktop";

console.log(JSON.stringify({ CONFIG, DEBUG_DEFAULTS, dockCount: DOCK_APPS.length, editorIndex: VSCODE_DOCK_INDEX }));
