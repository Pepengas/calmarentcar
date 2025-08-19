require('dotenv').config();
const { pool } = require('../database');

(async () => {
  const baseId = 'citroen-c3-777';
  let carId = baseId;
  try {
    // Check for existing slug
    const check = await pool.query('SELECT car_id FROM cars WHERE car_id = $1', [carId]);
    if (check.rowCount > 0) {
      carId = `${baseId}-b`;
      const checkB = await pool.query('SELECT car_id FROM cars WHERE car_id = $1', [carId]);
      if (checkB.rowCount > 0) {
        console.log(`Car with id ${baseId} and fallback already exists. Skipping seeding.`);
        await pool.end();
        return;
      }
    }

    const features = [
      'Air Condition',
      'ABS',
      'Airbag',
      'Bluetooth',
      'Parking Sensors (\u0391\u03b9\u03c3\u03b8\u03b7\u03c4\u03ae\u03c1\u03b5\u03c2)',
      'Rear Camera (\u039a\u03ac\u03bc\u03b5\u03c1\u03b1)',
      'Heated Seats (\u0398\u03b5\u03c1\u03bc\u03b1\u03b9\u03bd\u03cc\u03bc\u03b5\u03bd\u03b1 \u03ba\u03b1\u03b8\u03af\u03c3\u03bc\u03b1\u03c4\u03b1)'
    ];

    const specs = {
      engine: '1.2 Gasoline',
      gearbox: 'Manual',
      fuel: 'Petrol',
      passengers: 5,
      doors: 5,
      luggage: '2 small',
      airCondition: true,
      abs: true,
      airbag: true,
      entertainment: 'Bluetooth'
    };

    await pool.query(
      `INSERT INTO cars (car_id, name, description, image, category, features, specs, monthly_pricing, available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (car_id) DO NOTHING`,
      [
        carId,
        'Citro\u00ebn C3',
        'Stylish compact car with excellent comfort.',
        '/images/CitroenC3_A.jpg',
        'Economy',
        JSON.stringify(features),
        JSON.stringify(specs),
        '{}',
        true
      ]
    );

    console.log(`\u2705 Seeded car with id ${carId}`);
  } catch (err) {
    console.error('\u274c Error seeding car:', err.message);
  } finally {
    await pool.end();
  }
})();
