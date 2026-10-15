import { useEffect } from "react";

export function PwaSetup() {
  useEffect(() => {
    document.documentElement.lang = "pt-BR";
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest"; link.href = "/manifest.json";
      document.head.appendChild(link);
    }
    if (!__DEV__ && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(error => console.warn("Falha ao registrar PWA", error));
    }
  }, []);
  return null;
}
