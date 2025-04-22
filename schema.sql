-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS cars;

-- Create cars table to store car information
CREATE TABLE cars (
  id VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_per_day NUMERIC(10, 2) NOT NULL,
  image_url VARCHAR(255)
);

-- Create bookings table
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  car_id VARCHAR(30) REFERENCES cars(id),
  pickup_location VARCHAR(100) NOT NULL,
  dropoff_location VARCHAR(100) NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time TIME NOT NULL,
  dropoff_date DATE NOT NULL,
  dropoff_time TIME NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_age INTEGER NOT NULL,
  additional_requests TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial car data from our existing JSON
-- These should match the records in cars.json
INSERT INTO cars (id, name, description, price_per_day, image_url)
VALUES 
  ('aygo', 'Toyota Aygo', 'Compact and fuel-efficient, perfect for city driving.', 35, 'images/CalmaAygo.jpg'),
  ('tiguan', 'Volkswagen Tiguan', 'Spacious SUV with advanced features for comfort.', 75, 'images/CalmaTiguan.jpg'),
  ('golf', 'Volkswagen Golf', 'Versatile hatchback with excellent handling.', 55, 'images/CalmaGolf.jpg'),
  ('i10', 'Hyundai i10', 'Economical and easy to drive mini car.', 32, 'images/Calmai10.jpg'),
  ('c3', 'Citroen C3', 'Stylish compact car with excellent comfort.', 40, 'images/CalmaCitroen.jpg'),
  ('swift', 'Suzuki Swift', 'Sporty and nimble, ideal for exploring Crete.', 38, 'images/CalmaSuzuki.jpg');

-- Create index for faster queries
CREATE INDEX idx_bookings_car_id ON bookings(car_id);
CREATE INDEX idx_bookings_dates ON bookings(pickup_date, dropoff_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer_email ON bookings(customer_email); 