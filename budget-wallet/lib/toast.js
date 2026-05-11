// Tiny pub-sub toast bus. No deps. Safe to import in any client component.
// Usage:
//   import { toast } from '@/lib/toast';
//   toast.success('Saved');
//   toast.error('Boom');
//   toast.show({ message: 'Deleted', type: 'info', action: { label: 'Undo', onClick: () => ... }, duration: 6000 });

let listeners = new Set();
let nextId = 1;

function emit(t) {
  listeners.forEach((fn) => fn(t));
}

export const toast = {
  show(opts) {
    const t = typeof opts === 'string' ? { message: opts } : { ...opts };
    t.id = nextId++;
    t.type = t.type || 'info';
    t.duration = t.duration ?? (t.action ? 6000 : 3500);
    emit(t);
    return t.id;
  },
  success(message, opts = {}) {
    return this.show({ ...opts, message, type: 'success' });
  },
  error(message, opts = {}) {
    return this.show({ ...opts, message, type: 'error' });
  },
  info(message, opts = {}) {
    return this.show({ ...opts, message, type: 'info' });
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
