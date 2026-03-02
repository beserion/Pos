async function addCouriers() {
    try {
        const loginRes = await fetch('http://localhost:3050/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@antigravity.com', password: 'YourStrong@Passw0rd' })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;

        if (!token) {
            console.error('Login failed', loginData);
            return;
        }

        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

        const couriers = [
            { firstName: 'Ahmet', lastName: 'Yılmaz', roleTitle: 'Kurye', phone: '05551112233', vehicleType: 'Motosiklet', licensePlate: '34 AB 123', courierStatus: 'AVAILABLE', isActive: true },
            { firstName: 'Mehmet', lastName: 'Kaya', roleTitle: 'Motor Kurye', phone: '05324445566', vehicleType: 'Motosiklet', licensePlate: '34 CD 456', courierStatus: 'BUSY', isActive: true },
            { firstName: 'Ayşe', lastName: 'Demir', roleTitle: 'Kurye', phone: '05447778899', vehicleType: 'Bisiklet', licensePlate: 'Yok', courierStatus: 'OFF_DUTY', isActive: true },
            { firstName: 'Ali', lastName: 'Veli', roleTitle: 'Kurye', phone: '05339990011', vehicleType: 'Araba', licensePlate: '06 XYZ 98', courierStatus: 'AVAILABLE', isActive: true }
        ];

        for (const c of couriers) {
            const res = await fetch('http://localhost:3050/employees', { method: 'POST', headers, body: JSON.stringify(c) });
            const data = await res.json();
            console.log('Inserted Result:', data);
        }
    } catch (e) { console.error(e); }
}
addCouriers();
