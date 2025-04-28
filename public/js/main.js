/**
 * Main JavaScript for SEO Report Generator
 */

// Format numbers with commas
function formatNumber(number) {
  return number.toLocaleString('nl-NL');
}

// Get CSS class for score progress bars
function getScoreClass(score) {
  if (score >= 90) return 'progress-bar-excellent';
  if (score >= 70) return 'progress-bar-good';
  if (score >= 50) return 'progress-bar-average';
  return 'progress-bar-poor';
}

// Initialize animations and event listeners
document.addEventListener('DOMContentLoaded', function() {
  // Initialize GSAP animations
  initAnimations();
  
  // Add loading indicator when form is submitted
  const reportForm = document.querySelector('form[action="/generate-report"]');
  
  if (reportForm) {
    reportForm.addEventListener('submit', function(e) {
      // Prevent multiple submissions
      if (this.classList.contains('submitting')) {
        e.preventDefault();
        return;
      }
      
      // Add loading state
      this.classList.add('submitting');
      
      // Create loading indicator
      const submitBtn = this.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Bezig met maken...';
      submitBtn.disabled = true;
      
      // Create loading message with simple animation
      const loadingMsg = document.createElement('div');
      loadingMsg.className = 'alert alert-info mt-3';
      loadingMsg.innerHTML = '<p><strong>SEO rapport wordt gemaakt...</strong></p>' +
        '<p>Dit kan tot 2 minuten duren terwijl we gegevens verzamelen.</p>';
      
      this.parentNode.appendChild(loadingMsg);
      
      // Animate the loading message
      gsap.from(loadingMsg, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power2.out"
      });
    });
  }
});

// Initialize GSAP animations for interactive elements
function initAnimations() {
  // Stagger animation for cards on page load
  const cards = document.querySelectorAll('.card');
  if (cards.length > 0) {
    gsap.from(cards, {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: "power3.out",
      delay: 0.2
    });
  }
  
  // Button hover animations
  const buttons = document.querySelectorAll('.btn-primary');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', function() {
      gsap.to(this, {
        scale: 1.05,
        duration: 0.3,
        ease: "power1.out"
      });
    });
    
    btn.addEventListener('mouseleave', function() {
      gsap.to(this, {
        scale: 1,
        duration: 0.3,
        ease: "power1.in"
      });
    });
  });
  
  // Progress bar animations
  const progressBars = document.querySelectorAll('.progress-bar');
  if (progressBars.length > 0) {
    gsap.from(progressBars, {
      width: 0,
      duration: 1.5,
      ease: "elastic.out(1, 0.3)",
      stagger: 0.1,
      delay: 0.5
    });
  }
  
  // Navbar brand subtle animation
  const navbarBrand = document.querySelector('.navbar-brand');
  if (navbarBrand) {
    navbarBrand.addEventListener('mouseenter', function() {
      gsap.to(this, {
        y: -3,
        duration: 0.3,
        ease: "power2.out"
      });
    });
    
    navbarBrand.addEventListener('mouseleave', function() {
      gsap.to(this, {
        y: 0,
        duration: 0.3,
        ease: "power2.in"
      });
    });
  }
}
