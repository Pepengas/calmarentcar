const DAY_MS = 24 * 60 * 60 * 1000;

function calculateInclusiveDisplayDays(pickupISO, dropoffISO) {
  if (!pickupISO || !dropoffISO) return 1;
  const start = new Date(pickupISO);
  const end = new Date(dropoffISO);
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const diff = endDay - startDay;
  return Math.max(1, Math.floor(diff / DAY_MS) + 1);
}

function formatLocationName(name) {
  if (!name) return '';
  return name
    .trim()
    .split(/([\-\s])/)
    .map((part) => (part === '-' || part === ' ' ? part : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()))
    .join('');
}

export { calculateInclusiveDisplayDays, formatLocationName };
if (typeof module !== 'undefined') {
  module.exports = { calculateInclusiveDisplayDays, formatLocationName };
}
