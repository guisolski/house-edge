import { createGameApp } from './game/app';
import './styles.css';

function ensureFavicons(): void {
  const base = import.meta.env.BASE_URL || '/';
  addIcon('icon', `${base}favicon.ico`, { sizes: 'any' });
  addIcon('icon', `${base}favicon.svg`, { type: 'image/svg+xml' });
  addIcon('apple-touch-icon', `${base}favicon.png`);
}

function addIcon(
  rel: string,
  href: string,
  extra: { type?: string; sizes?: string } = {},
): void {
  if (document.querySelector(`link[rel="${rel}"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (extra.type) link.type = extra.type;
  if (extra.sizes) link.sizes = extra.sizes;
  document.head.appendChild(link);
}

function boot(): void {
  ensureFavicons();
  const host = document.getElementById('app');
  if (!host) throw new Error('#app mount missing');
  const app = createGameApp(host);
  void app.start();
}

boot();
