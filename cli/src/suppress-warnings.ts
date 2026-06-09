/**
 * Suppress Node's experimental warning for `node:sqlite` (Cursor local reads).
 * Must be imported before any code loads node:sqlite.
 */
process.on("warning", (warning) => {
  if (warning.name === "ExperimentalWarning" && warning.message.includes("SQLite")) return;
  const detail = warning.stack ?? warning.message;
  console.warn(detail);
});
