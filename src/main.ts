import { createGameApp } from './game/app';
import './styles.css';

function boot(): void {
  const host = document.getElementById('app');
  if (!host) throw new Error('#app mount missing');
  const app = createGameApp(host);
  void app.start();
}

boot();
