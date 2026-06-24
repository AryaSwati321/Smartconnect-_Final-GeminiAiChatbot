export async function searchProviders(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/providers/search?${query}`);
  return res.json();
}
