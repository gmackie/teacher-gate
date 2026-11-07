// Downloads the Learning Commons Knowledge Graph misconception extract into the data directory.
import { downloadKgMisconceptions } from "../src/lc-knowledge-graph";

const path = await downloadKgMisconceptions((s) => console.log(s));
console.log(`Wrote ${path}`);
