/** Read env at runtime so Next does not bake empty secrets into the server bundle. */
export function runtimeEnv(name: string) {
  return process.env[name] || "";
}
