async function testBulkCreate() {
    try {
        const loginRes = await fetch('http://localhost:3050/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        console.log('Testing bulk create...');
        const bulkRes = await fetch('http://localhost:3050/tables/bulk', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                zoneId: 1,
                count: 3,
                prefix: 'TestMasa',
                capacity: 2
            })
        });
        const bulkData = await bulkRes.json();
        if (Array.isArray(bulkData)) {
            console.log('Created tables:', bulkData.map(t => t.name));
        } else {
            console.log('Bulk create response (not array):', bulkData);
        }

        console.log('Testing skip logic (TestMasa 1, 2, 3 exist)...');
        const bulkRes2 = await fetch('http://localhost:3050/tables/bulk', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({
                zoneId: 1,
                count: 2,
                prefix: 'TestMasa',
                capacity: 2
            })
        });
        const bulkData2 = await bulkRes2.json();
        if (Array.isArray(bulkData2)) {
            console.log('Created more tables:', bulkData2.map(t => t.name));
        } else {
            console.log('Bulk create 2 response (not array):', bulkData2);
        }


    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testBulkCreate();

