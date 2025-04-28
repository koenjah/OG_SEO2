import express from "express";
import { engine } from "express-handlebars";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import fetch from "node-fetch";

// Import our API modules
import { analyzeTrafficHistory } from "./modules/traffic-history.js";
import { getRankedKeywords } from "./modules/ranked-keywords.js";
import { getDomainMetrics } from "./modules/domain-metrics.js";
import { getLighthouseData } from "./modules/lighthouse.js";
import { generateInsights } from "./modules/ai-insights.js";
import { helpers } from "./helpers.js";

// Load environment variables
dotenv.config();

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
const PORT = 5000;

// Add headers to allow iframe embedding from any domain
app.use((req, res, next) => {
  res.setHeader("X-Frame-Options", "ALLOWALL");
  res.setHeader("Content-Security-Policy", "frame-ancestors *");
  next();
});

// Set up Handlebars as the view engine
app.engine(
  "handlebars",
  engine({
    helpers: helpers,
  }),
);
app.set("view engine", "handlebars");
app.set("views", "./views");

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limit middleware for generate-report requests
const TRUSTED_IPS = process.env.TRUSTED_IPS
  ? process.env.TRUSTED_IPS.split(",")
  : [];
const rateLimitMap = new Map();
function getNextResetTime() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next;
}
app.use("/generate-report", (req, res, next) => {
  const visitorId = req.body.visitorId;
  const ip = req.ip || req.connection.remoteAddress;
  if (TRUSTED_IPS.includes(ip)) return next();
  if (!visitorId)
    return res
      .status(400)
      .render("error", { message: "Visitor ID ontbreekt." });
  let entry = rateLimitMap.get(visitorId);
  const now = new Date();
  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: getNextResetTime() };
  }
  if (entry.count >= 3) {
    const msg = `<p>Wat leuk dat je zo'n fan bent van onze tool!</p><p>Helaas heb je je dagelijkse limiet van 3 rapportage al bereikt.</p><p>Neem vrijblijvend contact op voor diepgaander advies:</p><p><strong>Email:</strong> info@optimaalgroeien.nl<br><strong>Telefoon:</strong> +31 57 2700 246</p>`;
    return res.status(429).render("home", {
      title: "SEO Report Generator",
      isReportPage: false,
      rateLimitMsg: msg,
    });
  }
  entry.count++;
  rateLimitMap.set(visitorId, entry);
  next();
});

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Quick health check route for deployment
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Home route
app.get("/", (req, res) => {
  // For health checks, return quick response
  if (req.headers["user-agent"]?.includes("GoogleHC")) {
    return res.status(200).send("OK");
  }

  res.render("home", {
    title: "SEO Report Generator",
    isReportPage: false,
    prefill: { url: req.query.url || "" },
  });
});

// Shared report route
app.get("/:domainSlug", async (req, res) => {
  try {
    const { domainSlug } = req.params;

    // Find the corresponding domain directory
    const domainDirs = fs
      .readdirSync(dataDir)
      .filter((dir) => fs.statSync(path.join(dataDir, dir)).isDirectory());

    // Look for a matching report
    let reportData = null;

    for (const dir of domainDirs) {
      const reportPath = path.join(dataDir, dir, "report.json");

      if (fs.existsSync(reportPath)) {
        try {
          const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));

          // Check if this report has a slug field that matches
          if (report.slug === domainSlug) {
            reportData = report;
            break;
          }

          // If no slug field, generate one from the domain and check
          if (!report.slug) {
            const generatedSlug = report.domain.replace(/\./g, "-");
            if (generatedSlug === domainSlug) {
              // Add the slug to the report data for future reference
              report.slug = generatedSlug;
              reportData = report;

              // Save the updated report with the slug
              fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
              break;
            }
          }
        } catch (error) {
          console.error(`Error parsing report for ${dir}:`, error.message);
        }
      }
    }

    if (!reportData) {
      return res.status(404).render("error", {
        message: "Report not found",
      });
    }

    // Render the report page in view-only mode
    res.render("report", {
      title: `SEO Report for ${reportData.domain}`,
      report: reportData,
      viewOnly: true, // Flag to hide interactive elements
      isReportPage: true,
    });
  } catch (error) {
    console.error("Error viewing shared report:", error);
    res.status(500).render("error", {
      message: `Error viewing report: ${error.message}`,
    });
  }
});

// Generate report route
app.post("/generate-report", async (req, res) => {
  try {
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).render("error", {
        message: "Please provide a valid domain",
      });
    }

    // Clean domain format
    const cleanDomain = domain
      .replace(/^(https?:\/\/)?(www\.)?/, "")
      .toLowerCase();

    // Create domain-specific data directory
    const domainDir = path.join(dataDir, cleanDomain);
    if (!fs.existsSync(domainDir)) {
      fs.mkdirSync(domainDir, { recursive: true });
    }

    // Send notification email via Formspree
    try {
      // You need to create a Formspree account and form at https://formspree.io/
      // Then add FORMSPREE_ENDPOINT=https://formspree.io/f/your-form-id to your .env file
      const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT;

      console.log(
        "Formspree endpoint from env:",
        formspreeEndpoint ? formspreeEndpoint : "Not configured",
      );

      if (formspreeEndpoint) {
        console.log(
          `Attempting to send email notification for domain: ${cleanDomain}`,
        );

        // Format data according to Formspree requirements
        // Formspree expects form data with specific fields
        const emailData = {
          _replyto: "koenjah@gmail.com", // This is important for Formspree
          email: "koenjah@gmail.com",
          message: `Nieuwe SEO rapport aanvraag voor: ${cleanDomain}`,
          domain: cleanDomain,
          timestamp: new Date().toISOString(),
        };

        console.log("Email payload:", JSON.stringify(emailData));

        const response = await fetch(formspreeEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(emailData),
        });

        console.log("Formspree response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            "Failed to send email notification. Status:",
            response.status,
          );
          console.error("Error details:", errorText);
        } else {
          const responseData = await response.json();
          console.log(
            `Email notification sent successfully for domain: ${cleanDomain}`,
          );
          console.log("Formspree response:", JSON.stringify(responseData));
        }
      } else {
        console.log(
          "Formspree endpoint not configured. Email notification skipped.",
        );
      }
    } catch (emailError) {
      console.error("Error sending email notification:", emailError);
      // Continue with report generation even if email fails
    }

    // Generate report data
    const reportData = {
      domain: cleanDomain,
      slug: cleanDomain.replace(/\./g, "-"),
      timestamp: new Date().toISOString(),
      sections: {},
    };

    // 1. Traffic History Analysis
    console.log("Analyzing traffic history...");
    reportData.sections.trafficHistory = await analyzeTrafficHistory(
      cleanDomain,
      domainDir,
    );

    // 2. Ranked Keywords Analysis
    console.log("Analyzing ranked keywords...");
    reportData.sections.rankedKeywords = await getRankedKeywords(
      cleanDomain,
      domainDir,
    );

    // 3. Domain Metrics (Moz DA, Majestic TF)
    console.log("Fetching domain metrics...");
    reportData.sections.domainMetrics = await getDomainMetrics(
      cleanDomain,
      domainDir,
    );

    // 4. Lighthouse Performance Data
    console.log("Analyzing website performance...");
    reportData.sections.lighthouse = await getLighthouseData(
      cleanDomain,
      domainDir,
    );

    // 5. Competitor and content-gap analysis removed (unused in frontend)

    // 6. Generate AI Insights
    console.log("Generating AI insights...");
    reportData.sections.insights = await generateInsights(
      reportData,
      domainDir,
    );

    // Save the complete report data
    fs.writeFileSync(
      path.join(domainDir, "report.json"),
      JSON.stringify(reportData, null, 2),
    );

    // Render the report page
    res.render("report", {
      title: `SEO Report for ${cleanDomain}`,
      report: reportData,
      shareUrl: `${req.protocol}://${req.get("host")}/${reportData.slug}`,
      viewOnly: false,
      isReportPage: true,
    });
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).render("error", {
      message: `Error generating report: ${error.message}`,
    });
  }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
