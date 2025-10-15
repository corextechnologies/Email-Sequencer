// Check if the worker is running and what it's doing
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkWorkerActivity() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking worker activity...');
    
    // Check recent jobs
    const recentJobs = await client.query(`
      SELECT id, queue, status, attempts, run_at, created_at, updated_at
      FROM jobs 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📋 Recent jobs (last hour):');
    if (recentJobs.rows.length === 0) {
      console.log('   • No recent jobs found');
    } else {
      recentJobs.rows.forEach(job => {
        console.log(`   • Job ${job.id}: ${job.queue} - ${job.status} (attempts: ${job.attempts})`);
        console.log(`     Created: ${job.created_at}, Run at: ${job.run_at}`);
      });
    }
    
    // Check if there are any pending jobs
    const pendingJobs = await client.query(`
      SELECT COUNT(*) as count
      FROM jobs 
      WHERE status = 'pending' AND run_at <= NOW()
    `);
    
    console.log('');
    console.log(`⏰ Pending jobs ready to run: ${pendingJobs.rows[0].count}`);
    
    // Check recent events
    const recentEvents = await client.query(`
      SELECT type, COUNT(*) as count, MAX(occurred_at) as latest
      FROM events 
      WHERE occurred_at > NOW() - INTERVAL '10 minutes'
      GROUP BY type
      ORDER BY latest DESC
    `);
    
    console.log('');
    console.log('📊 Recent events (last 10 minutes):');
    if (recentEvents.rows.length === 0) {
      console.log('   • No recent events found');
    } else {
      recentEvents.rows.forEach(event => {
        console.log(`   • ${event.type}: ${event.count} (latest: ${event.latest})`);
      });
    }
    
    // Check email replies
    const replies = await client.query(`
      SELECT COUNT(*) as total, MAX(created_at) as latest
      FROM email_replies
    `);
    
    console.log('');
    console.log('📧 Email replies:');
    console.log(`   • Total: ${replies.rows[0].total}`);
    console.log(`   • Latest: ${replies.rows[0].latest || 'None'}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkWorkerActivity().catch(console.error);
