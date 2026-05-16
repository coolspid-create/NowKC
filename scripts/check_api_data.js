async function main() {
  const res = await fetch("http://localhost:3000/api/recall/stats?date_from=2025-05-13&date_to=2026-05-13");
  const data = await res.json();
  if (data && data.data && data.data.by_source) {
    console.log("Sources:", data.data.by_source);
  }
  if (data && data.data && data.data.by_product_group_country) {
    const jp = data.data.by_product_group_country.filter(x => x.country.includes('일본') || x.country.includes('JP'));
    console.log("JP Categories:", jp);
  }
}
main();
