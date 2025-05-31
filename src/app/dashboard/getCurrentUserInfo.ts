export default async function getCurrentUserInfo() {
    try {
      const res = await fetch('/api/auth/session');
      if (!res.ok) return null;
      const { userId, userName, bandName, bandId } = await res.json();
      return { userId, userName, bandName, bandId };
    } catch {
      return null;
    }
  } 