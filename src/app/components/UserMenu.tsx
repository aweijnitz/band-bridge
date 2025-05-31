"use client";
import { useEffect, useState, useCallback } from "react";

export default function UserMenu() {
  const [user, setUser] = useState<{ userId: number; userName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(() => {
    setLoading(true);
    fetch("/api/auth/session?ts=" + Date.now())
      .then((res) => {
        if (!res.ok) {
          setUser(null);
          setLoading(false);
          return null;
        }
        return fetch("/api/mine?ts=" + Date.now());
      })
      .then((res) => {
        if (!res || !res.ok) {
          setUser(null);
          setLoading(false);
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.userName) {
          setUser({ userId: data.userId, userName: data.userName });
        } else {
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchUser();
    const handler = () => fetchUser();
    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, [fetchUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.dispatchEvent(new Event("auth-changed"));
    window.location.href = "/login";
  };

  if (loading) return null;

  if (!user) {
    return (
      <a
        href="/login"
        className="text-zinc-800 hover:underline px-4 py-2 text-sm"
      >
        Sign in
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-800 font-semibold text-sm">{user.userName}</span>
      <button
        onClick={handleLogout}
        className="bg-zinc-300 hover:bg-zinc-400 text-zinc-800 font-semibold px-2 py-0.5 rounded text-xs"
      >
        Sign out
      </button>
    </div>
  );
} 