async function start() {
  await import('./dist/index.js');
}
start().catch(err => {
  console.error('Failed to start app:', err);
  process.exit(1);
});
