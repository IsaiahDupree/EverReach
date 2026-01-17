/**
 * Perplexity AI Client - Lead Enrichment Examples
 * 
 * Comprehensive examples demonstrating how to use the Perplexity client
 * for B2B lead enrichment, company research, and intelligence gathering.
 * 
 * Run: node perplexity-examples.mjs
 */

import PerplexityClient from './perplexity-client.js';

// =============================================================================
// EXAMPLE 1: Basic Company Enrichment
// =============================================================================
async function basicCompanyEnrichment() {
  console.log('\n🏢 Example 1: Basic Company Enrichment');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  try {
    const result = await client.enrichCompany("Salesforce");
    
    console.log('Company Information:');
    console.log(client.extractContent(result));
    console.log('\nSources:', client.extractCitations(result));
    console.log('\nToken Usage:', result.usage);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 2: Person/Executive Enrichment
// =============================================================================
async function personEnrichment() {
  console.log('\n👤 Example 2: Executive Profile Enrichment');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  try {
    const result = await client.enrichPerson("Satya Nadella", "Microsoft");
    
    console.log('Executive Profile:');
    console.log(client.extractContent(result));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 3: Email to Company Profile
// =============================================================================
async function emailToProfile() {
  console.log('\n📧 Example 3: Email to Full Company Profile');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  const email = "contact@stripe.com";

  try {
    // First, get contact info
    const contactInfo = await client.enrichContact(email);
    const contactData = client.extractContent(contactInfo);
    
    console.log('Step 1: Contact Information');
    console.log(contactData);
    
    // Then enrich the company (Stripe in this case)
    const companyInfo = await client.enrichCompany("Stripe");
    const companyData = client.extractContent(companyInfo);
    
    console.log('\nStep 2: Company Profile');
    console.log(companyData);
    
    console.log('\nEnrichment Complete!');
    console.log('Statistics:', client.getStats());
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 4: Complete Lead Enrichment Pipeline
// =============================================================================
async function completeLeadEnrichment() {
  console.log('\n🎯 Example 4: Complete Lead Enrichment Pipeline');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY,
    requestsPerSecond: 1
  });

  const companyName = "HubSpot";

  try {
    console.log(`Enriching lead: ${companyName}\n`);

    // Step 1: Get basic company info
    console.log('📊 Step 1/4: Gathering company information...');
    const companyInfo = await client.enrichCompany(companyName);
    const company = client.extractContent(companyInfo);
    
    // Step 2: Get recent news
    console.log('📰 Step 2/4: Fetching recent news...');
    const newsInfo = await client.getCompanyNews(companyName, "last 3 months");
    const news = client.extractContent(newsInfo);
    
    // Step 3: Analyze competitors
    console.log('🔍 Step 3/4: Analyzing competitors...');
    const competitorInfo = await client.analyzeCompetitors(companyName);
    const competitors = client.extractContent(competitorInfo);
    
    // Step 4: Qualify the lead
    console.log('✅ Step 4/4: Qualifying lead...');
    const qualificationInfo = await client.qualifyLead(
      companyName,
      "B2B SaaS company, growth stage, strong market position"
    );
    const qualification = client.extractContent(qualificationInfo);
    
    // Present results
    console.log('\n' + '='.repeat(60));
    console.log('ENRICHMENT REPORT');
    console.log('='.repeat(60));
    
    console.log('\n📊 COMPANY PROFILE:');
    console.log(company.substring(0, 500) + '...\n');
    
    console.log('📰 RECENT NEWS:');
    console.log(news.substring(0, 500) + '...\n');
    
    console.log('🔍 COMPETITIVE LANDSCAPE:');
    console.log(competitors.substring(0, 500) + '...\n');
    
    console.log('✅ LEAD QUALIFICATION:');
    console.log(qualification + '\n');
    
    const stats = client.getStats();
    console.log('📈 STATISTICS:');
    console.log(`   Total Requests: ${stats.totalRequests}`);
    console.log(`   Tokens Used: ${stats.totalTokensUsed}`);
    console.log(`   Avg Response Time: ${stats.averageResponseTime.toFixed(0)}ms`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 5: Batch Lead Enrichment
// =============================================================================
async function batchLeadEnrichment() {
  console.log('\n📦 Example 5: Batch Lead Enrichment');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY,
    requestsPerSecond: 1 // Adjust based on your tier
  });

  const companies = ["Stripe", "Square", "PayPal"];

  console.log(`Enriching ${companies.length} companies...\n`);

  try {
    const results = [];
    
    for (const company of companies) {
      console.log(`Processing: ${company}`);
      
      const info = await client.enrichCompany(company);
      results.push({
        company,
        data: client.extractContent(info),
        citations: client.extractCitations(info)
      });
      
      console.log(`✓ Completed: ${company}\n`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('BATCH RESULTS');
    console.log('='.repeat(60));
    
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.company}:`);
      console.log(result.data.substring(0, 200) + '...');
      console.log(`Sources: ${result.citations.length} citations`);
    });

    console.log('\nStatistics:', client.getStats());
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 6: Industry Research & Market Intelligence
// =============================================================================
async function industryResearch() {
  console.log('\n🔬 Example 6: Industry Research & Market Intelligence');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  try {
    const research = await client.researchIndustry(
      "Cloud Computing",
      "AI and Machine Learning adoption trends"
    );
    
    console.log('Industry Research Report:');
    console.log(client.extractContent(research));
    console.log('\nSources:', client.extractCitations(research).slice(0, 5));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 7: Lead Scoring System
// =============================================================================
class LeadScoringSystem {
  constructor(apiKey) {
    this.client = new PerplexityClient({
      apiKey,
      requestsPerSecond: 2
    });
    this.scoringCriteria = {
      companySize: 25,
      industry: 20,
      growthSignals: 25,
      techStack: 15,
      funding: 15
    };
  }

  async scoreCompany(companyName) {
    console.log(`\n🎯 Scoring: ${companyName}`);
    
    // Get company info
    const info = await this.client.enrichCompany(companyName);
    const infoText = this.client.extractContent(info);
    
    // Get recent news for growth signals
    const news = await this.client.getCompanyNews(companyName, "last 3 months");
    const newsText = this.client.extractContent(news);
    
    // Simple keyword-based scoring (in production, use more sophisticated analysis)
    let score = 0;
    
    // Company size signals
    if (infoText.toLowerCase().includes('employee') && 
        (infoText.includes('500') || infoText.includes('1000'))) {
      score += this.scoringCriteria.companySize;
    }
    
    // Growth signals
    if (newsText.toLowerCase().includes('funding') || 
        newsText.toLowerCase().includes('expansion') ||
        newsText.toLowerCase().includes('growth')) {
      score += this.scoringCriteria.growthSignals;
    }
    
    // Industry fit
    if (infoText.toLowerCase().includes('software') || 
        infoText.toLowerCase().includes('saas')) {
      score += this.scoringCriteria.industry;
    }
    
    return {
      company: companyName,
      score: Math.min(score, 100),
      details: {
        profile: infoText.substring(0, 300) + '...',
        recentNews: newsText.substring(0, 300) + '...'
      }
    };
  }
}

async function leadScoringExample() {
  console.log('\n📊 Example 7: Automated Lead Scoring');
  console.log('─'.repeat(60));

  const scorer = new LeadScoringSystem(process.env.PERPLEXITY_API_KEY);
  
  try {
    const score = await scorer.scoreCompany("Atlassian");
    
    console.log('\nLead Score Report:');
    console.log(`Company: ${score.company}`);
    console.log(`Score: ${score.score}/100`);
    console.log('\nProfile Summary:');
    console.log(score.details.profile);
    console.log('\nRecent Activity:');
    console.log(score.details.recentNews);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 8: Real-time Competitive Intelligence
// =============================================================================
async function competitiveIntelligence() {
  console.log('\n🔍 Example 8: Real-time Competitive Intelligence');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  const targetCompany = "Shopify";

  try {
    // Get competitor analysis
    const competitors = await client.analyzeCompetitors(targetCompany);
    const competitorData = client.extractContent(competitors);
    
    console.log(`Competitive Analysis for ${targetCompany}:`);
    console.log(competitorData);
    
    // Get recent news about the company and market
    const news = await client.getCompanyNews(targetCompany, "last week");
    const newsData = client.extractContent(news);
    
    console.log('\nRecent Developments:');
    console.log(newsData);
    
    console.log('\nIntelligence Gathered!');
    console.log('Use this for sales positioning, market analysis, and strategy.');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 9: Multi-Source Lead Enrichment with Perplexity + Social Links
// =============================================================================
async function multiSourceEnrichment() {
  console.log('\n🌐 Example 9: Multi-Source Enrichment');
  console.log('─'.repeat(60));
  console.log('Combining Perplexity AI + Social Links Search for complete profiles\n');

  const perplexity = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY
  });

  const companyName = "Zoom Video Communications";
  const executiveName = "Eric Yuan";

  try {
    // Get company intelligence from Perplexity
    console.log('📊 Fetching company intelligence...');
    const companyInfo = await perplexity.enrichCompany(companyName);
    
    // Get executive information
    console.log('👤 Enriching executive profile...');
    const executiveInfo = await perplexity.enrichPerson(executiveName, companyName);
    
    console.log('\n' + '='.repeat(60));
    console.log('ENRICHED PROFILE');
    console.log('='.repeat(60));
    
    console.log('\n🏢 COMPANY INTELLIGENCE:');
    console.log(perplexity.extractContent(companyInfo).substring(0, 400) + '...');
    
    console.log('\n👤 EXECUTIVE PROFILE:');
    console.log(perplexity.extractContent(executiveInfo).substring(0, 400) + '...');
    
    console.log('\n💡 Next Steps:');
    console.log('   - Use Social Links Search API to find social profiles');
    console.log('   - Cross-reference information from multiple sources');
    console.log('   - Build comprehensive lead database');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 10: Custom Enrichment Prompts
// =============================================================================
async function customPrompts() {
  console.log('\n🎨 Example 10: Custom Enrichment Prompts');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY,
    temperature: 0.3 // Slightly higher for creative responses
  });

  try {
    // Custom prompt for finding decision makers
    const decisionMakers = await client.chat({
      messages: `Who are the key decision makers and executives at ServiceNow 
                 responsible for partnerships and business development? 
                 Provide names, titles, and brief backgrounds.`,
      returnCitations: true
    });
    
    console.log('Decision Makers:');
    console.log(client.extractContent(decisionMakers));
    
    // Custom prompt for technology stack analysis
    const techStack = await client.chat({
      messages: `What technologies and tools does Shopify use in their tech stack? 
                 Focus on infrastructure, databases, programming languages, and cloud services.`,
      returnCitations: true
    });
    
    console.log('\n\nTechnology Stack:');
    console.log(client.extractContent(techStack));
    
    console.log('\n\nSources:', client.extractCitations(techStack).slice(0, 3));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// EXAMPLE 11: Token Usage Monitoring
// =============================================================================
async function tokenMonitoring() {
  console.log('\n📊 Example 11: Token Usage Monitoring');
  console.log('─'.repeat(60));

  const client = new PerplexityClient({
    apiKey: process.env.PERPLEXITY_API_KEY,
    maxTokens: 500 // Limit tokens per request
  });

  try {
    console.log('Performing multiple operations...\n');
    
    client.resetStats();
    
    // Operation 1
    await client.enrichCompany("Adobe");
    console.log('✓ Operation 1 complete');
    
    // Operation 2
    await client.enrichPerson("Shantanu Narayen", "Adobe");
    console.log('✓ Operation 2 complete');
    
    // Get detailed stats
    const stats = client.getStats();
    
    console.log('\n' + '='.repeat(60));
    console.log('TOKEN USAGE REPORT');
    console.log('='.repeat(60));
    console.log(`Total Requests: ${stats.totalRequests}`);
    console.log(`Successful: ${stats.successfulRequests}`);
    console.log(`Failed: ${stats.failedRequests}`);
    console.log(`\nTotal Tokens Used: ${stats.totalTokensUsed}`);
    console.log(`Prompt Tokens: ${stats.totalPromptTokens}`);
    console.log(`Completion Tokens: ${stats.totalCompletionTokens}`);
    console.log(`Average per Request: ${stats.averageTokensPerRequest.toFixed(0)}`);
    console.log(`\nAvg Response Time: ${stats.averageResponseTime.toFixed(0)}ms`);
    
    // Calculate estimated cost (example pricing)
    const estimatedCost = (stats.totalTokensUsed / 1000000) * 5; // $5 per 1M tokens (example)
    console.log(`\nEstimated Cost: $${estimatedCost.toFixed(4)}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// =============================================================================
// RUN ALL EXAMPLES
// =============================================================================
async function runAllExamples() {
  console.log('\n🚀 Perplexity AI Client - Lead Enrichment Examples');
  console.log('='.repeat(60));

  // Check for API key
  if (!process.env.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY === 'your_api_key_here') {
    console.error('\n❌ Error: PERPLEXITY_API_KEY environment variable not set');
    console.error('Please set your API key:');
    console.error('  Windows: $env:PERPLEXITY_API_KEY="your_key_here"');
    console.error('  Linux/Mac: export PERPLEXITY_API_KEY="your_key_here"\n');
    process.exit(1);
  }

  try {
    // Run examples (comment out any you don't want to run)
    
    await basicCompanyEnrichment();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await personEnrichment();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // await emailToProfile(); // Uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    await completeLeadEnrichment();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // await batchLeadEnrichment(); // Takes longer, uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 3000));
    
    // await industryResearch(); // Uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    // await leadScoringExample(); // Uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    await competitiveIntelligence();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await multiSourceEnrichment();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // await customPrompts(); // Uncomment if needed
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    await tokenMonitoring();

    console.log('\n✅ All examples completed!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
runAllExamples();
