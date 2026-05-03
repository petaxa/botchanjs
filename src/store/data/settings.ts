import type { settingType } from "../../feature/settings/types";
import { createStore } from "../impl";

export const settingsStore = createStore<settingType>();
