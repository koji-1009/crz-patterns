import { join } from "node:path";
import { tmpdir } from "node:os";

export const PORT = 4321;
export const BASE_URL = `http://127.0.0.1:${PORT}/crz-patterns/`;
export const PREVIEW_URL = BASE_URL;
export const PID_FILE = join(tmpdir(), "crz-patterns-preview.pid");
