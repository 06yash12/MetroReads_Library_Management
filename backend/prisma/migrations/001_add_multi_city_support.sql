-- Migration: Add Multi-City Support
-- This migration adds City and Library tables and updates existing tables

-- Create Cities table
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(100) NOT NULL DEFAULT 'USA',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create Libraries table
CREATE TABLE IF NOT EXISTS libraries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city_id INTEGER NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add library_id to users table for librarian assignments
ALTER TABLE users ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_updated_at TIMESTAMP DEFAULT NOW();

-- Add library_id to book_copies table
ALTER TABLE book_copies ADD COLUMN IF NOT EXISTS library_id INTEGER REFERENCES libraries(id);

-- Create default city and library for existing data
INSERT INTO cities (name, state, country, created_at, updated_at) 
VALUES ('Metro City', 'State', 'USA', NOW(), NOW())
ON CONFLICT DO NOTHING;

INSERT INTO libraries (name, address, city_id, created_at, updated_at)
SELECT 'Main Library', '123 Main Street, Metro City', cities.id, NOW(), NOW()
FROM cities 
WHERE cities.name = 'Metro City'
ON CONFLICT DO NOTHING;

-- Update existing book_copies to belong to the main library
UPDATE book_copies 
SET library_id = (
    SELECT libraries.id 
    FROM libraries 
    JOIN cities ON libraries.city_id = cities.id 
    WHERE cities.name = 'Metro City' AND libraries.name = 'Main Library'
)
WHERE library_id IS NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_libraries_city_id ON libraries(city_id);
CREATE INDEX IF NOT EXISTS idx_users_library_id ON users(library_id);
CREATE INDEX IF NOT EXISTS idx_book_copies_library_id ON book_copies(library_id);

-- Update UserRole enum to include OWNER (if using PostgreSQL enum)
-- Note: This might need to be handled differently depending on your setup