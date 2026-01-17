#!/usr/bin/env node
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env' });

const REVENUECAT_API_KEY = process.env.REVENUECAT_SECRET_API_KEY;

async function getProjects() {
  console.log('🔍 Fetching RevenueCat Projects...\n');
  
  try {
    const response = await fetch('https://api.revenuecat.com/v2/projects', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('📊 Projects Found:', data.items?.length || 0);
      console.log('\n');
      
      data.items?.forEach(project => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📦 Project: ${project.name}`);
        console.log(`   ID: ${project.id}`);
        console.log(`   Created: ${project.created_at}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n');
      });
      
      console.log('\n✅ Copy the correct Project ID to your .env file:');
      console.log('   REVENUECAT_PROJECT_ID="<project_id>"\n');
    } else {
      console.log(`❌ Failed to fetch projects: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

getProjects();
