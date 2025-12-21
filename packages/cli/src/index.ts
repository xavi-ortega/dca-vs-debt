#!/usr/bin/env node
import kleur from "kleur";
import { main } from "./main.js";

// Nice error output
main().catch((err: unknown) => {
  console.error(
    kleur.red(
      `\nError: ${err && typeof err === "object" && "message" in err ? String(err.message) : String(err)}`,
    ),
  );
  process.exit(1);
});
