export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const borderColors = {
    success: 'border-emerald-500 text-emerald-400 bg-emerald-950/80',
    error: 'border-rose-500 text-rose-400 bg-rose-950/80',
    warning: 'border-amber-500 text-amber-400 bg-amber-950/80',
    info: 'border-cyan-500 text-cyan-400 bg-slate-900/90',
  };

  const style = borderColors[type] || borderColors.info;
  toast.className = `border-2 px-4 py-3 rounded font-mono text-xs shadow-lg backdrop-blur flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${style}`;
  toast.innerHTML = `<span class="font-bold">[${type.toUpperCase()}]</span> <span>${message}</span>`;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}