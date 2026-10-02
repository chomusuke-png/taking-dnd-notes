import { useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog';

interface Props {
  open: boolean;
  title: string;
  submitLabel: string;
  initial?: { name: string; description: string };
  onSubmit: (values: { name: string; description: string }) => Promise<void>;
  onClose: () => void;
}

export function CampaignFormDialog({ open, title, submitLabel, initial, onSubmit, onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDescription(initial?.description ?? '');
      setError('');
    }
  }, [open, initial]);

  async function submit() {
    if (!name.trim()) return setError('Escribe un nombre.');
    try {
      await onSubmit({ name, description });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      onSubmit={submit}
      actions={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="field">
        <label htmlFor="campaign-name">Nombre</label>
        <input
          id="campaign-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="La Mina Perdida de Phandelver"
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="campaign-desc">Descripción (opcional)</label>
        <textarea
          id="campaign-desc"
          className="textarea"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      {error && <p className="error-text">{error}</p>}
    </Dialog>
  );
}
