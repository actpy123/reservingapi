type ApiFetchOptions = RequestInit & {
  skipAuth?: boolean;
};

export async function apiFetch(
  url: string,
  options: ApiFetchOptions = {}
) {
  const token = localStorage.getItem("authToken");

  const headers = new Headers(options.headers || {});

  // ✅ Request Interceptor (Add token)
  if (!options.skipAuth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // headers.set("Content-Type", "application/json");

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // ✅ Response Interceptor (Handle auth errors)
  if (response.status === 401) {
    localStorage.removeItem("authToken");
    window.location.href = "/login";
    return Promise.reject("Unauthorized");
  }

  return response;
}
