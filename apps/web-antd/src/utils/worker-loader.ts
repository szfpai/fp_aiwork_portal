const workerFiles = import.meta.glob<Record<string, () => Promise<URL>>>(
  '#/workers/*.worker.ts',
  {
    import: 'default',
    eager: false,
    query: '?worker&url',
  },
);

export default async function loadWorkerURL(name: string): Promise<URL> {
  const entry = Object.entries(workerFiles).find(([path]) =>
    path.includes(`${name}.worker.ts`),
  );
  if (!entry) throw new Error(`Worker not found: ${name}.worker.ts`);
  const [, importer] = entry;
  const url = await importer();
  return new URL(url as unknown as URL, import.meta.url);
}
