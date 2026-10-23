// Resolve hook: i sorgenti di src/ importano senza estensione ("../rng"); aggiunge ".ts" quando serve.
// Non tocca src/: la risoluzione avviene solo in questo processo.
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith('.') || specifier.startsWith('/');
    if (!relative || error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    return nextResolve(`${specifier}.ts`, context);
  }
}
