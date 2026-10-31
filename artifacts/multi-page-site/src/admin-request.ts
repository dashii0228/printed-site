type TokenGetter = () => Promise<string | null>;

/** Keep session tokens confined to this application's protected admin API. */
export function createAdminFetch(getToken: TokenGetter, useBearer = false) {
  return async (path: string, init: RequestInit = {}) => {
    if (
      !path.startsWith("/api/admin/") ||
      /[\\?#]/.test(path) ||
      new URL(path, "https://admin-api.invalid").pathname !== path
    ) {
      throw new Error("Админ хүсэлтийн хаяг буруу байна.");
    }
    const headers = new Headers(init.headers);
    if (useBearer) {
      const token = await getToken();
      if (!token) {
        throw new Error("Нэвтрэлт баталгаажаагүй байна. Гараад дахин нэвтэрнэ үү.");
      }
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(path, {
      ...init,
      headers,
      credentials: "include",
      mode: "same-origin",
      redirect: "error",
    });
  };
}
