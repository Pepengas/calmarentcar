const assert = require('assert');
const { calculateInclusiveDisplayDays, formatLocationName } = require('../assets/js/utils/date.js');

// Inclusive day calculations
assert.strictEqual(calculateInclusiveDisplayDays('2025-08-19T03:00', '2025-08-20T03:00'), 2);
assert.strictEqual(calculateInclusiveDisplayDays('2025-08-25', '2025-08-28'), 4);
assert.strictEqual(calculateInclusiveDisplayDays('2025-08-19T10:00', '2025-08-19T18:00'), 1);
assert.strictEqual(calculateInclusiveDisplayDays('2025-08-19T23:30', '2025-08-20T00:30'), 2);

// Location name formatting
assert.strictEqual(formatLocationName('agia-marina'), 'Agia-Marina');
assert.strictEqual(formatLocationName('agios nikolaos'), 'Agios Nikolaos');
assert.strictEqual(formatLocationName('HERSONISSOS'), 'Hersonissos');

console.log('date utils tests passed');
