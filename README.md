# SEO Report Generator

## Features

- Comprehensive SEO analysis of any website
- Traffic trend analysis with visual charts
- Keyword ranking analysis with sorting capabilities
- Domain authority metrics from Moz and Majestic
- Website performance analysis using Lighthouse
- Competitor analysis and content gap identification
- AI-generated insights and recommendations
- Email notifications when reports are generated
- Calendly integration for booking consultations

## Setup Instructions

1. Clone this repository
   ```
   git clone <repository-url>
   cd seo-report-generator
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up environment variables
   - Copy `example.env` to `.env`
   - Fill in your API keys and configuration
   - Make sure to set up `FORMSPREE_ENDPOINT` for email notifications

4. Start the application
   ```
   npm start
   ```

5. Access the application at `http://localhost:3000`

## Environment Variables

The application requires several API keys to function properly:
- `DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`: For SEO data
- `DOMDETAILER_API_KEY`: For domain metrics
- `OPENROUTER_API_KEY` or `OPENAI_API_KEY`: For AI insights
- `FORMSPREE_ENDPOINT`: For email notifications (format: https://formspree.io/f/your-form-id)

## Deployment Instructions

1. Create a new Replit project
   - Choose "Import from GitHub" or upload these files directly
   - Select Node.js as the language

2. Set up environment variables in Replit
   - Go to the "Secrets" tab in your Replit project
   - Add all the variables from your .env file as secrets

3. Run the application
   - Replit should automatically detect the start command from package.json
   - If not, set the run command to `npm start`

4. Access your application
   - Replit will provide you with a URL to access your application
   - You can use this URL in an iframe on your website

## Using with an iframe

To embed this application on your website, create an HTML file with the following code:

```html
<!DOCTYPE html>
<html>
<head>
  <title>SEO Rapportage Tool | OptimaalGroeien</title>
  <style>
    body, html { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: none; }
  </style>
</head>
<body>
  <iframe src="https://your-replit-app-url.repl.co" allowfullscreen></iframe>
</body>
</html>
```

Replace `https://your-replit-app-url.repl.co` with the actual URL of your Replit application.
