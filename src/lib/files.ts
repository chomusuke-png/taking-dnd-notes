export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "La Mina Perdida" → "la-mina-perdida" */
export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'export'
  );
}

export function backupFilename(name: string, kind: 'campaña' | 'personaje'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `taking-dnd-notes-${kind === 'campaña' ? 'campana' : 'personaje'}-${slugify(name)}-${date}.json`;
}
