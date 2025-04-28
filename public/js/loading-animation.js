/**
 * Loading Animation Controller
 * Creates an engaging, realistic loading experience with dynamic updates
 */
class LoadingAnimation {
  constructor() {
    this.container = null;
    this.statusElement = null;
    this.progressBar = null;
    this.progressValue = 0;
    this.domain = '';
    this.animationFrame = null;
    this.updateInterval = null;
    this.startTime = null;
    this.maxWaitTime = 120000; // 2 minutes in milliseconds
    this.updates = [];
    this.currentUpdateIndex = 0;
    this.isVisible = false;
  }

  init(domain) {
    this.domain = domain;
    this.createUpdates();
    this.render();
    this.show();
    this.startUpdates();
    this.startProgressAnimation();
    this.startTime = Date.now();
  }

  createUpdates() {
    // Create a list of realistic updates in Dutch
    this.updates = [
      `Bezig met het analyseren van bezoekersgegevens...`,
      `Verkeer voor ${this.domain} wordt geanalyseerd...`,
      `Controleren van opgeslagen verkeersgegevens...`,
      `Zoekwoord rankings worden opgehaald...`,
      `Populaire zoekwoorden voor ${this.domain} worden geanalyseerd...`,
      `Controleren van opgeslagen zoekwoord gegevens...`,
      `Domein autoriteit wordt berekend...`,
      `Moz en Majestic metrics worden opgehaald voor ${this.domain}...`,
      `Website prestaties worden geanalyseerd...`,
      `Google Lighthouse gegevens worden opgehaald...`,
      `Controleren van bestaande prestatie gegevens...`,
      `Concurrentie analyse wordt uitgevoerd...`,
      `Concurrenten van ${this.domain} worden geïdentificeerd...`,
      `Content gaps worden geanalyseerd...`,
      `Vergelijken van content met concurrenten...`,
      `Controleren van opgeslagen content gegevens...`,
      `AI inzichten worden gegenereerd...`,
      `SEO verbeterpunten worden geïdentificeerd...`,
      `Technische SEO problemen worden gecontroleerd...`,
      `Backlink profiel wordt geanalyseerd...`,
      `Mobiele gebruiksvriendelijkheid wordt beoordeeld...`,
      `Core Web Vitals worden geëvalueerd...`,
      `Pagina laadsnelheid wordt geoptimaliseerd...`,
      `Gebruikerservaring wordt geanalyseerd...`,
      `Sociale media integratie wordt gecontroleerd...`,
      `Lokale SEO factoren worden geëvalueerd...`,
      `Schema markup wordt gecontroleerd...`,
      `Interne linkstructuur wordt geanalyseerd...`,
      `Content kwaliteit wordt beoordeeld...`,
      `Zoekwoord dichtheid wordt geoptimaliseerd...`,
      `Meta beschrijvingen worden gecontroleerd...`,
      `Afbeelding optimalisatie wordt geanalyseerd...`,
      `Rapportage wordt samengesteld...`,
      `Laatste controles worden uitgevoerd...`,
      `Rapportage wordt afgerond...`
    ];
  }

  render() {
    // Create the loading overlay
    this.container = document.createElement('div');
    this.container.className = 'loading-overlay';
    this.container.innerHTML = `
      <div class="loading-content">
        <div class="loading-logo">
          <div class="pulse-ring"></div>
          <i class="bi bi-bar-chart-fill"></i>
        </div>
        <h2>SEO Rapportage wordt gegenereerd</h2>
        <p class="loading-domain">${this.domain}</p>
        <div class="loading-status">
          <p id="status-message">Bezig met het analyseren van bezoekersgegevens...</p>
        </div>
        <div class="progress-container">
          <div class="progress-bar" id="progress-bar"></div>
        </div>
        <p class="loading-tip">Dit kan enkele minuten duren. We verzamelen uitgebreide gegevens voor een complete analyse.</p>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.statusElement = document.getElementById('status-message');
    this.progressBar = document.getElementById('progress-bar');
  }

  show() {
    this.isVisible = true;
    this.container.classList.add('visible');
    document.body.classList.add('no-scroll');
  }

  hide() {
    this.isVisible = false;
    this.container.classList.remove('visible');
    document.body.classList.remove('no-scroll');
    
    // Clean up
    this.stopUpdates();
    this.stopProgressAnimation();
    
    // Remove after animation completes
    setTimeout(() => {
      if (this.container && this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
    }, 500);
  }

  startUpdates() {
    // Show the first update immediately
    this.showUpdate(0);
    
    // Set up interval for subsequent updates
    this.updateInterval = setInterval(() => {
      // Check if we've exceeded the maximum wait time
      if (Date.now() - this.startTime > this.maxWaitTime) {
        this.showFinalUpdate();
        return;
      }
      
      // Move to the next update
      this.currentUpdateIndex = (this.currentUpdateIndex + 1) % this.updates.length;
      this.showUpdate(this.currentUpdateIndex);
    }, this.getRandomDuration());
  }

  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  showUpdate(index) {
    if (!this.statusElement) return;
    
    // Add fade-out class
    this.statusElement.classList.add('fade-out');
    
    // After fade-out completes, update text and fade in
    setTimeout(() => {
      this.statusElement.textContent = this.updates[index];
      this.statusElement.classList.remove('fade-out');
      this.statusElement.classList.add('fade-in');
      
      // Remove fade-in class after animation completes
      setTimeout(() => {
        this.statusElement.classList.remove('fade-in');
      }, 500);
    }, 500);
  }

  showFinalUpdate() {
    this.stopUpdates();
    if (this.statusElement) {
      this.statusElement.textContent = `Bijna klaar! De rapportage wordt afgerond...`;
    }
  }

  startProgressAnimation() {
    // Animate the progress bar
    const animateProgress = () => {
      // Calculate progress based on elapsed time
      const elapsed = Date.now() - this.startTime;
      const progress = Math.min(elapsed / this.maxWaitTime, 0.95); // Max at 95% until complete
      
      if (this.progressBar) {
        this.progressBar.style.width = `${progress * 100}%`;
      }
      
      if (this.isVisible) {
        this.animationFrame = requestAnimationFrame(animateProgress);
      }
    };
    
    this.animationFrame = requestAnimationFrame(animateProgress);
  }

  stopProgressAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  getRandomDuration() {
    // Return a random duration between 2-4 seconds (2000-4000ms)
    return Math.floor(Math.random() * 2000) + 2000;
  }
}

// Initialize the loading animation when the form is submitted
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('form[action="/generate-report"]');
  
  if (form) {
    form.addEventListener('submit', (e) => {
      const domainInput = document.getElementById('domain');
      if (domainInput && domainInput.value) {
        const domain = domainInput.value.replace(/^(https?:\/\/)?(www\.)?/, '');
        const loadingAnimation = new LoadingAnimation();
        loadingAnimation.init(domain);
      }
    });
  }
});
