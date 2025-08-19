const crypto = require('crypto');

const secret = crypto.randomBytes(64).toString('hex');

console.log(`New SESSION_SECRET: ${secret}`);
console.log('Set this value as the SESSION_SECRET environment variable.');
console.log('For rotation, move the previous secret to SESSION_SECRET_PREVIOUS and restart the server.');
