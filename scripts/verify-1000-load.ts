import axios from 'axios';

const API_BASE = process.env.API_BASE || 'http://localhost:5000/api';

async function test1000LoadScale() {
  console.log('🚀 Starting 1000+ Recipients Batch Schedule Load Test...');

  // Generate 1050 unique recipient email addresses
  const TOTAL_RECIPIENTS = 1050;
  const recipients: string[] = [];
  for (let i = 1; i <= TOTAL_RECIPIENTS; i++) {
    recipients.push(`scale.lead.${i}@batch-test-1000.com`);
  }

  console.log(`1️⃣ Generated ${recipients.length} unique recipient leads for load test.`);

  const scheduledAt = new Date(Date.now() + 30 * 1000).toISOString(); // 30 seconds in future

  try {
    console.log('2️⃣ Dispatching single HTTP POST /api/emails/schedule request for 1050 recipients...');
    const startTime = Date.now();

    const response = await axios.post(`${API_BASE}/emails/schedule`, {
      recipients,
      subject: 'Large Scale Batch Outreach (1000+ Test)',
      body: '<h3>Scale Audit</h3><p>Testing BullMQ & Redis handling under 1000+ scheduled items.</p>',
      scheduledAt,
      multiSenderMode: 'round-robin',
      delayBetweenEmailsMs: 10, // 10ms stagger between queue additions
    });

    const durationMs = Date.now() - startTime;
    console.log(`✅ Batch request completed in ${durationMs}ms`);
    console.log(`   Response status: ${response.status}`);
    console.log(`   Scheduled count returned: ${response.data.scheduledCount}`);
    console.log(`   Batch ID: ${response.data.batchId}`);

    // Fetch dashboard stats to verify system state
    console.log('\n3️⃣ Fetching live telemetry stats from /api/emails/stats...');
    const statsRes = await axios.get(`${API_BASE}/emails/stats`);
    console.log('   Stats:', statsRes.data.data);

    console.log('\n🎉 1000+ Scheduled-at-once verification test completed successfully!');
  } catch (error: any) {
    console.error('❌ 1000+ load test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

test1000LoadScale();
