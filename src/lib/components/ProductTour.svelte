<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { userId } from '$lib/stores/auth';

  const TOUR_KEY = 'niosports_tour_done';

  onMount(() => {
    if (!browser || !$userId) return;
    if (localStorage.getItem(TOUR_KEY)) return;

    setTimeout(async () => {
      const { driver } = await import('driver.js');
      await import('driver.js/dist/driver.css');

      const d = driver({
        showProgress: true,
        animate: true,
        overlayColor: 'rgba(0, 0, 0, 0.7)',
        popoverClass: 'nio-tour',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Empezar',
        progressText: '{{current}} de {{total}}',
        steps: [
          {
            popover: {
              title: 'Bienvenido a NioSports Pro',
              description: 'Motor predictivo de totales NBA con XGBoost y 26 features. Te guiamos en 30 segundos.',
              side: 'center',
              align: 'center',
            }
          },
          {
            element: '[data-tour="kpi"]',
            popover: {
              title: 'Tus KPIs',
              description: 'Win Rate, ROI, Racha y CLV Promedio. Estos números se actualizan automáticamente con cada pick resuelto.',
              side: 'bottom',
            }
          },
          {
            element: '[data-tour="actions"]',
            popover: {
              title: 'Acciones Rápidas',
              description: 'Accede a Picks del modelo, Análisis por período, Estadísticas y Bankroll desde aquí.',
              side: 'bottom',
            }
          },
          {
            element: '[data-tour="games"]',
            popover: {
              title: 'Partidos de Hoy',
              description: 'Los partidos NBA del día con horarios. Haz clic en "Ver análisis completo" para predicciones.',
              side: 'top',
            }
          },
          {
            element: 'nav a[href="/totales"]',
            popover: {
              title: 'Análisis de Totales',
              description: 'Selecciona dos equipos y obtén predicciones por período (Q1, HALF, FULL) con probabilidad calibrada y Expected Value.',
              side: 'bottom',
            }
          },
          {
            element: 'nav a[href="/picks"]',
            popover: {
              title: 'Picks del Modelo',
              description: 'El motor analiza todos los partidos del día y recomienda los que tienen mayor edge. Guarda los que te gusten.',
              side: 'bottom',
            }
          },
          {
            element: 'nav a[href="/results"]',
            popover: {
              title: 'Track Record',
              description: 'Resultados públicos y verificables. Profit curve, win rate por período, CLV evolution, y calibración del modelo.',
              side: 'bottom',
            }
          },
          {
            popover: {
              title: '¡Listo!',
              description: 'Ya conoces lo esencial. Empieza explorando los Picks del Día o analiza un partido en Totales.',
              side: 'center',
              align: 'center',
            }
          },
        ],
        onDestroyed: () => {
          localStorage.setItem(TOUR_KEY, 'true');
        }
      });

      d.drive();
    }, 1500);
  });
</script>

<style>
  :global(.nio-tour) {
    background: #111318 !important;
    border: 1px solid rgba(99, 102, 241, 0.25) !important;
    border-radius: 14px !important;
    color: #E8EAED !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
  }
  :global(.nio-tour .driver-popover-title) {
    font-family: 'Inter', sans-serif !important;
    font-weight: 800 !important;
    font-size: 1rem !important;
    color: #fff !important;
  }
  :global(.nio-tour .driver-popover-description) {
    font-size: 0.88rem !important;
    color: rgba(255, 255, 255, 0.6) !important;
    line-height: 1.5 !important;
  }
  :global(.nio-tour .driver-popover-progress-text) {
    font-size: 0.72rem !important;
    color: rgba(255, 255, 255, 0.3) !important;
  }
  :global(.nio-tour .driver-popover-next-btn),
  :global(.nio-tour .driver-popover-done-btn) {
    background: #6366F1 !important;
    color: #fff !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 700 !important;
    padding: 8px 16px !important;
    font-size: 0.82rem !important;
  }
  :global(.nio-tour .driver-popover-prev-btn) {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.5) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    padding: 8px 16px !important;
    font-size: 0.82rem !important;
  }
  :global(.driver-overlay) {
    background: rgba(0, 0, 0, 0.7) !important;
  }
</style>