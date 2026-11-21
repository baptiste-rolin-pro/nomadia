import type { Messages } from "@/i18n/types";
import fr from "../fr";
import ui from "./ui";
import domain from "./domain";
import pages from "./pages";
import flow from "./flow";

/** Traduction complète (mêmes clés que le français : vérifié par TypeScript et par tests/unit/i18n.test.ts). */
const messages: Messages = { ...fr, ...ui, ...domain, ...pages, ...flow, };

export default messages;
