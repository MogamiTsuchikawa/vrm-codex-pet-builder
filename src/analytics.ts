const GA_MEASUREMENT_ID = 'G-C2MJEL3PJX';
const GA_HOSTNAME = 'vrm-codex-pet-builder.mogami.dev';

declare global {
  interface Window {
    dataLayer?: IArguments[];
    gtag?: (...args: unknown[]) => void;
  }
}

function shouldLoadAnalytics(): boolean {
  return import.meta.env.PROD && window.location.hostname === GA_HOSTNAME;
}

export function initAnalytics(): void {
  if (!shouldLoadAnalytics() || window.gtag) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    window.dataLayer?.push(arguments);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
}
