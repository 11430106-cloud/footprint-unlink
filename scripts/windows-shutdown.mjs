// Let native Vite/Rolldown handles finish closing on Windows after a successful
// CLI build. Forced process.exit(0) races their async cleanup in libuv.
// Failed builds retain the CLI's original nonzero exit behavior.
if (process.platform === 'win32') {
  const exitImmediately = process.exit.bind(process);
  process.exit = (code = 0) => {
    if (Number(code) !== 0) return exitImmediately(code);
    process.exitCode = 0;
  };
}
