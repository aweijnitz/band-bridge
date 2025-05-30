"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginFormComponent({ redirect: redirectProp, onLogin }: { redirect?: string, onLogin?: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkedSession, setCheckedSession] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = redirectProp || searchParams.get("redirect") || "/dashboard";

  // Only sign out if there is a session
  useEffect(() => {
    fetch("/api/auth/session").then(res => {
      if (res.ok) {
        // User is logged in, log out and reload
        fetch("/api/auth/logout", { method: "POST" }).then(() => {
          window.location.reload();
        });
      } else {
        // No session, just show the form
        setCheckedSession(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      if (onLogin) onLogin();
      window.dispatchEvent(new Event("auth-changed"));
      window.location.href = redirect;
    } else {
      const data = await res.json();
      setError(data.error || "Login failed");
    }
  };

  if (!checkedSession) {
    // Prevent rendering the form until we've checked the session
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-400">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Sign in</h1>
        {error && <div className="mb-4 text-red-600">{error}</div>}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            autoFocus
            required
            autoComplete="username"
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </div>
  );
} 