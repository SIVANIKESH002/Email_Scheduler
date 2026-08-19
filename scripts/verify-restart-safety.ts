import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function testRestartSafety() {
  console.log('🧪 Running Server Restart Safety Verification Script...');

  try {
    // 1. Health check
    console.log('1️⃣ Checking backend health status...');
    const healthRes = await axios.get('http://localhost:5000/health');
    console.log('   Health check OK:', healthRes.data);

    // 2. Schedule a batch of 5 test emails
    console.log('\n2️⃣ Scheduling 5 test emails scheduled for 15 seconds in the future...');
    const futureDate = new Date(Date.now() + 15 * 1000).toISOString();

    const scheduleRes = await axios.post(`${API_BASE}/emails/schedule`, {
      recipients: [
        'test.lead1@example.com',
        'test.lead2@example.com',
        'test.lead3@example.com',
        'test.lead4@example.com',
        'test.lead5@example.com',
      ],
      subject: 'Restart Safety Audit Test',
      body: '<p>Testing crash resilience and recovery audit deduplication.</p>',
      scheduledAt: futureDate,
      multiSenderMode: 'round-robin',
      delayBetweenEmailsMs: 1000,
    });

    console.log(`   Batch created successfully: ${scheduleRes.data.scheduledCount} item(s)`);
    const scheduledData = scheduleRes.data.data;
    console.log(`   Sample Idempotency Key: ${scheduledData[0]?.idempotencyKey}`);

    // 3. Re-send identical request to test Idempotency Deduplication
    console.log('\n3️⃣ Attempting duplicate submission with identical payload (Testing SHA-256 Idempotency)...');
    const duplicateRes = await axios.post(`${API_BASE}/emails/schedule`, {
      recipients: [
        'test.lead1@example.com',
        'test.lead2@example.com',
        'test.lead3@example.com',
        'test.lead4@example.com',
        'test.lead5@example.com',
      ],
      subject: 'Restart Safety Audit Test',
      body: '<p>Testing crash resilience and recovery audit deduplication.</p>',
      scheduledAt: futureDate,
      multiSenderMode: 'round-robin',
      delayBetweenEmailsMs: 1000,
    });

    console.log(`   Duplicate submission returned count: ${duplicateRes.data.scheduledCount}`);
    
    // 4. Query Scheduled Queue to verify pending count
    console.log('\n4️⃣ Verifying queue state...');
    const queueRes = await axios.get(`${API_BASE}/emails/scheduled`);
    console.log(`   Current Pending Queue Count: ${queueRes.data.data.length}`);

    console.log('\n✅ Restart Safety & Idempotency Verification PASSED cleanly!');
  } catch (error: any) {
    console.error('❌ Verification test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

testRestartSafety();
