import dotenv from 'dotenv';
import { analyzePegStability } from './server/services/pegService.js';

dotenv.config();

async function testPegStability() {
  try {
    console.log('Testing peg stability analysis for USDS...');
    const pegEvents = await analyzePegStability('usds');
    
    if (pegEvents.length === 0) {
      console.log('No peg events found');
      return;
    }

    console.log(`Found ${pegEvents.length} peg events:`);
    pegEvents.forEach((event, index) => {
      console.log(`\nEvent ${index + 1}:`);
      console.log(`Date: ${event.date}`);
      console.log(`Price: $${event.price.toFixed(4)}`);
      console.log(`Description: ${event.description}`);
      console.log(`Deviation: ${((event.price - 1.0) / 1.0 * 100).toFixed(2)}%`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testPegStability();