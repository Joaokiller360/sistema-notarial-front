"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * La sección de Seguridad se fusionó con Mi Cuenta.
 * Esta ruta se conserva para no romper enlaces antiguos y redirige al tab correspondiente.
 */
export default function SecurityRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/settings/profile?tab=security");
  }, [router]);

  return null;
}
