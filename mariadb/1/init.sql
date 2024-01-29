-- Create a sample table and insert data
CREATE TABLE user (
    id INT PRIMARY KEY,
    name VARCHAR(255),
    dt_nasc DATE)

INSERT INTO user (id, name, dt_nasc) VALUES (1, 'John','01-01-1980');
INSERT INTO user (id, name, dt_nasc) VALUES (2, 'Jane','02-06-1975');
