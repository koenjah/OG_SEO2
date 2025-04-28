// Test script for Formspree integration
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

async function testFormspree() {
  try {
    const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;
    
    if (!formspreeEndpoint) {
      console.error('Error: FORMSPREE_ENDPOINT not found in .env file');
      console.log('Please make sure you have added FORMSPREE_ENDPOINT=https://formspree.io/f/xvgkjbbv to your .env file');
      return;
    }
    
    console.log(`Using Formspree endpoint: ${formspreeEndpoint}`);
    
    // Format data according to Formspree requirements
    const testData = {
      _replyto: 'koenjah@gmail.com',
      email: 'koenjah@gmail.com',
      message: `Test email from SEO Report Generator at ${new Date().toISOString()}`,
      subject: 'Test Email - SEO Report Generator',
      domain: 'test-domain.com',
      timestamp: new Date().toISOString()
    };
    
    console.log('Sending test email with payload:', JSON.stringify(testData, null, 2));
    
    const response = await fetch(formspreeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const responseData = await response.json();
      console.log('Success! Email sent via Formspree.');
      console.log('Response:', JSON.stringify(responseData, null, 2));
    } else {
      const errorText = await response.text();
      console.error('Failed to send email. Status:', response.status);
      console.error('Error details:', errorText);
    }
  } catch (error) {
    console.error('Error during Formspree test:', error);
  }
}

// Run the test
testFormspree();
