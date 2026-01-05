-- Create secondary user 'espressivove'
CREATE USER IF NOT EXISTS 'espressivove'@'%' IDENTIFIED BY 'G0ku*1896';
GRANT ALL PRIVILEGES ON diario_mercantil.* TO 'espressivove'@'%';
FLUSH PRIVILEGES;
