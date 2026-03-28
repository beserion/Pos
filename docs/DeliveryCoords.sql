use AntigravityPOS;

-- Kocaeli Kartepe (40.7663, 29.9175) Merkezli Örnek Veri Koordinatları Güncellemesi

UPDATE deliveries SET currentLat = 40.76812, currentLng = 29.92144 WHERE status = 'PENDING';
UPDATE deliveries SET currentLat = 40.75123, currentLng = 29.90512 WHERE status = 'IN_TRANSIT';
UPDATE deliveries SET currentLat = 40.78166, currentLng = 29.93121 WHERE status = 'DELIVERED';
UPDATE deliveries SET currentLat = 40.76100, currentLng = 29.91500 WHERE status = 'CANCELLED';

-- Eğer yukarıdaki değerler aynı çıkarsa, id'ye göre randomize simüle edilebilir:
UPDATE deliveries
SET currentLat = 40.7663 + (CAST(id as float) * 0.005),
    currentLng = 29.9175 - (CAST(id as float) * 0.005)
WHERE currentLat IS NULL OR currentLat = 0;
