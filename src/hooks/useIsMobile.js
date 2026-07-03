import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    function atualizarTela() {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }

    mediaQuery.addEventListener('change', atualizarTela);
    atualizarTela();

    return () => mediaQuery.removeEventListener('change', atualizarTela);
  }, []);

  return isMobile;
}
