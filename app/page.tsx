"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getDefaultRedirectRoute } from "@/lib/permissions-helper";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const token = localStorage.getItem("admin_token");
    const userDataStr = localStorage.getItem("user");

    if (isAuthenticated !== "true" || !token) {
      router.replace("/login");
    } else {
      let permissions: string[] = [];
      let role = "";
      if (userDataStr) {
        try {
          const u = JSON.parse(userDataStr);
          permissions = u.permissions || [];
          role = u.role || "";
        } catch (e) {}
      }
      const targetRoute = getDefaultRedirectRoute(permissions, role);
      router.replace(targetRoute);
    }
  }, [router]);

  return null;
}


