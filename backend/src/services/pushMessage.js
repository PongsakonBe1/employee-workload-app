export function pushMessageData(title, body, data = {}) {
  const values = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value)]));
  return { ...values, title: String(title), body: String(body) };
}
