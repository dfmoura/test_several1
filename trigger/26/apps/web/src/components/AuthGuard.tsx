"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { LoadingBlock } from "./ui/Feedback";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <LoadingBlock />
      </div>
    );
  }

  return <>{children}</>;
}
