export function log(message: string) {
  console.log(`[LOG] ${new Date().toISOString()} - ${message}`);
}

export function err(message: string, error?: unknown) {
  console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
  if (error) {
    console.error(error);
  }
}
