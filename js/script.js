(function() {
  'use strict';

  // ============================================
  // DOM Cache
  // ============================================

  const cache = {
    navbar: document.querySelector('.navbar'),
    toggler: document.querySelector('.navbar-toggler'),
    navMenu: document.getElementById('navMenu'),
    sections: document.querySelectorAll('section[id]'),
    anchors: document.querySelectorAll('a[href^="#"]:not([href="#"])'),
    currentYear: document.getElementById('currentYear')
  };

  // Populate conditional caches
  if (cache.navMenu) {
    cache.navLinks = cache.navMenu.querySelectorAll('.nav-link');
    cache.ctaButton = cache.navMenu.querySelector('.btn-primary');
  }

  // ============================================
  // Build Link Map for Active Navigation
  // ============================================

  const linkMap = new Map();
  if (cache.navLinks && cache.navLinks.length) {
    cache.navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        linkMap.set(href.substring(1), link);
      }
    });
  }

  // ============================================
  // Observer Cleanup
  // ============================================

  const observers = [];

  const cleanup = () => {
    observers.forEach(obs => obs.disconnect());
    observers.length = 0;
  };

  // ============================================
  // Bootstrap Collapse Helper (with fallback)
  // ============================================

  const getCollapseInstance = (element) => {
    try {
      if (window.bootstrap && window.bootstrap.Collapse) {
        return window.bootstrap.Collapse.getInstance(element);
      }
    } catch (e) {
      // Bootstrap not loaded or error
    }
    return null;
  };

  // ============================================
  // Navbar Scroll Effect
  // ============================================

  if (cache.navbar) {
    let ticking = false;

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollY = window.scrollY;
          cache.navbar.classList.toggle('scrolled', scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================
  // Mobile Navbar Toggle
  // Icon swap is handled by CSS via Bootstrap's .collapsed class.
  // This block only manages closing the menu and focus states.
  // ============================================

  if (cache.toggler && cache.navMenu) {
    // Keep aria-expanded in sync with Bootstrap events
    cache.navMenu.addEventListener('show.bs.collapse', function() {
      cache.toggler.setAttribute('aria-expanded', 'true');
    });

    cache.navMenu.addEventListener('hide.bs.collapse', function() {
      cache.toggler.setAttribute('aria-expanded', 'false');
      // Return focus to toggle button for accessibility
      cache.toggler.focus();
    });

    // Close menu when nav link is clicked
    if (cache.navLinks && cache.navLinks.length) {
      cache.navLinks.forEach(link => {
        link.addEventListener('click', function() {
          const isMobile = window.innerWidth <= 991;
          const isOpen = cache.navMenu.classList.contains('show');

          if (isMobile && isOpen) {
            const collapse = getCollapseInstance(cache.navMenu);
            if (collapse) {
              collapse.hide();
            }
          }
        });
      });
    }

    // Close menu when CTA button is clicked (with smooth scroll)
    if (cache.ctaButton) {
      cache.ctaButton.addEventListener('click', function(e) {
        const isMobile = window.innerWidth <= 991;
        const isOpen = cache.navMenu.classList.contains('show');
        const href = this.getAttribute('href');

        if (isMobile && isOpen && href && href.startsWith('#')) {
          e.preventDefault();

          const collapse = getCollapseInstance(cache.navMenu);
          if (collapse) {
            const scrollToTarget = function() {
              // Remove the listener immediately to avoid multiple calls
              cache.navMenu.removeEventListener('hidden.bs.collapse', scrollToTarget);

              const target = document.querySelector(href);
              if (target) {
                requestAnimationFrame(() => {
                  target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                  });

                  if (history.pushState) {
                    try {
                      history.pushState(null, '', href);
                    } catch (err) {
                      // History API error - ignore
                    }
                  }
                });
              }
            };

            cache.navMenu.addEventListener('hidden.bs.collapse', scrollToTarget);
            collapse.hide();
          }
        }
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      const isClickInside = cache.toggler.contains(e.target) || cache.navMenu.contains(e.target);
      const isOpen = cache.navMenu.classList.contains('show');

      if (!isClickInside && isOpen) {
        const collapse = getCollapseInstance(cache.navMenu);
        if (collapse) {
          collapse.hide();
        }
      }
    });
  }

  // ============================================
  // Active Navigation on Scroll
  // ============================================

  if (cache.sections && cache.sections.length && 'IntersectionObserver' in window) {
    let activeLink = null;

    const observer = new IntersectionObserver(function(entries) {
      // Find the most visible section
      let mostVisibleEntry = null;
      let maxRatio = 0;

      entries.forEach(function(entry) {
        if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisibleEntry = entry;
        }
      });

      if (mostVisibleEntry) {
        const link = linkMap.get(mostVisibleEntry.target.id);

        if (activeLink && activeLink !== link) {
          activeLink.classList.remove('active');
        }

        if (link && link !== activeLink) {
          link.classList.add('active');
          activeLink = link;
        }
      }
    }, {
      rootMargin: '-100px 0px -65% 0px',
      threshold: [0, 0.1, 0.25, 0.5]
    });

    cache.sections.forEach(function(section) {
      observer.observe(section);
    });
    observers.push(observer);
  } else if (cache.sections && cache.sections.length) {
    // Fallback for browsers without IntersectionObserver
    let activeLink = null;
    let scrollTimeout = null;

    const updateActiveLink = () => {
      if (scrollTimeout) {
        cancelAnimationFrame(scrollTimeout);
      }

      scrollTimeout = requestAnimationFrame(() => {
        let currentSection = null;
        let closestDistance = Infinity;

        cache.sections.forEach((section) => {
          const rect = section.getBoundingClientRect();
          const distance = Math.abs(rect.top);

          if (distance < closestDistance && rect.top < window.innerHeight * 0.5) {
            closestDistance = distance;
            currentSection = section;
          }
        });

        if (currentSection) {
          const link = linkMap.get(currentSection.id);

          if (activeLink && activeLink !== link) {
            activeLink.classList.remove('active');
          }

          if (link && link !== activeLink) {
            link.classList.add('active');
            activeLink = link;
          }
        } else if (activeLink) {
          // No section qualifies — clear stale active state
          activeLink.classList.remove('active');
          activeLink = null;
        }

        scrollTimeout = null;
      });
    };

    window.addEventListener('scroll', updateActiveLink, { passive: true });
    window.addEventListener('resize', updateActiveLink, { passive: true });
    updateActiveLink();
  }

  // ============================================
  // Smooth Scrolling
  // ============================================

  if (cache.anchors && cache.anchors.length) {
    let scrollTimeout = null;

    cache.anchors.forEach(function(link) {
      link.addEventListener('click', function(e) {
        const href = this.getAttribute('href');

        // Skip empty or invalid links
        if (!href || href === '#' || href === '') return;

        const target = document.querySelector(href);
        if (!target) return;

        // Don't intercept if user is holding a modifier key
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;

        e.preventDefault();

        if (scrollTimeout) {
          cancelAnimationFrame(scrollTimeout);
        }

        // Offset by navbar height
        const navbarHeight = cache.navbar ? cache.navbar.offsetHeight : 76;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navbarHeight;

        scrollTimeout = requestAnimationFrame(function() {
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          if (history.pushState) {
            try {
              history.pushState(null, '', href);
            } catch (err) {
              // History API error - ignore
            }
          }

          // Focus for accessibility
          if (target.getAttribute('tabindex') === null) {
            target.setAttribute('tabindex', '-1');
          }
          target.focus({ preventScroll: true });

          scrollTimeout = null;
        });
      });
    });
  }

  // ============================================
  // Copyright Year
  // ============================================

  if (cache.currentYear) {
    try {
      cache.currentYear.textContent = new Date().getFullYear();
    } catch (e) {
      cache.currentYear.innerText = new Date().getFullYear();
    }
  }

  // ============================================
  // Animated Counter for Hero Stats
  // ============================================

  const counterElements = document.querySelectorAll('.hero-stat-number');

  if (counterElements.length) {
    const counters = [];
    counterElements.forEach(el => {
      const count = parseInt(el.getAttribute('data-count'), 10);
      const suffix = el.getAttribute('data-suffix') || '';
      counters.push({
        element: el,
        target: count,
        suffix: suffix,
        isAnimated: false
      });
    });

    const animateCounter = (counter, duration = 2000) => {
      const startTime = performance.now();
      const endValue = counter.target;

      const updateCounter = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(endValue * easeOut);

        counter.element.textContent = currentValue + counter.suffix;

        if (progress < 1) {
          requestAnimationFrame(updateCounter);
        } else {
          counter.element.textContent = endValue + counter.suffix;
          counter.isAnimated = true;

          counter.element.classList.add('pop');
          setTimeout(() => {
            counter.element.classList.remove('pop');
          }, 300);
        }
      };

      requestAnimationFrame(updateCounter);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const counter = counters.find(c => c.element === el);

            if (counter && !counter.isAnimated) {
              setTimeout(() => {
                animateCounter(counter);
              }, 300);
            }
          }
        });
      }, {
        threshold: 0.3,
        rootMargin: '0px 0px -50px 0px'
      });

      counters.forEach(counter => {
        observer.observe(counter.element);
      });

      observers.push(observer);
    } else {
      // Fallback: animate immediately
      counters.forEach(counter => {
        animateCounter(counter);
      });
    }
  }

  // ============================================
  // Handle Page Load / Initial Setup
  // ============================================

  document.addEventListener('DOMContentLoaded', function() {
    // Ensure mobile menu is closed on desktop load
    if (cache.navMenu && window.innerWidth > 991) {
      const collapse = getCollapseInstance(cache.navMenu);
      if (collapse && cache.navMenu.classList.contains('show')) {
        collapse.hide();
      }
    }

    if (cache.toggler) {
      cache.toggler.setAttribute('aria-expanded', 'false');
    }

    document.documentElement.classList.add('js-loaded');
  });

  // ============================================
  // Keyboard Accessibility for Mobile Menu
  // ============================================

  if (cache.navMenu && cache.toggler) {
    cache.navMenu.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && cache.navMenu.classList.contains('show')) {
        const collapse = getCollapseInstance(cache.navMenu);
        if (collapse) {
          collapse.hide();
          cache.toggler.focus();
        }
      }
    });
  }

  // ============================================
  // Skip to Content Link (if exists)
  // ============================================

  const skipLink = document.querySelector('.skip-to-content');
  if (skipLink) {
    skipLink.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.setAttribute('tabindex', '-1');
        target.focus();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // ============================================
  // Footer Accordion for Mobile
  // ============================================

  (function() {
    const accordionColumns = document.querySelectorAll('.footer-accordion');

    if (!accordionColumns.length) return;

    // Set initial state: first column open, others closed (mobile only)
    const setInitialState = () => {
      const isMobile = window.innerWidth <= 768;

      accordionColumns.forEach((column, index) => {
        if (isMobile) {
          column.classList.toggle('active', index === 0);
        } else {
          column.classList.remove('active');
        }
      });
    };

    // Close all accordions except the one passed
    function closeAllAccordions(exceptElement) {
      accordionColumns.forEach(function(column) {
        if (column !== exceptElement) {
          column.classList.remove('active');
        }
      });
    }

    // Attach click handlers
    accordionColumns.forEach(function(column) {
      const header = column.querySelector('.footer-heading');
      if (!header) return;

      header.addEventListener('click', function() {
        // Only work on mobile
        if (window.innerWidth > 768) return;

        const isActive = column.classList.contains('active');

        closeAllAccordions(column);
        column.classList.toggle('active', !isActive);
      });
    });

    // Apply initial state immediately
    setInitialState();

    // Reset state when crossing the breakpoint
    let footerResizeTimer = null;
    window.addEventListener('resize', function() {
      if (footerResizeTimer) {
        clearTimeout(footerResizeTimer);
      }
      footerResizeTimer = setTimeout(function() {
        setInitialState();
        footerResizeTimer = null;
      }, 300);
    }, { passive: true });

  })();

  // ============================================
  // Portfolio Filter
  // ============================================

  (function() {
    const filterButtons = document.querySelectorAll('.portfolio-filter');
    const portfolioItems = document.querySelectorAll('.portfolio-item');

    if (!filterButtons.length || !portfolioItems.length) return;

    let filterAnimationTimeouts = [];

    const applyFilter = (filter) => {
      // Clear any pending timeouts from rapid clicking
      filterAnimationTimeouts.forEach(t => clearTimeout(t));
      filterAnimationTimeouts = [];

      portfolioItems.forEach((item) => {
        const category = item.getAttribute('data-category');
        const matches = filter === 'all' || category === filter;

        if (matches) {
          // If it was hidden, unhide then fade in
          if (item.classList.contains('is-hidden')) {
            item.classList.remove('is-hidden');
            // Force reflow so the transition triggers
            void item.offsetWidth;
          }
          requestAnimationFrame(() => {
            item.classList.remove('is-filtering');
          });
        } else {
          // Fade out, then hide after the transition
          item.classList.add('is-filtering');
          const t = setTimeout(() => {
            item.classList.add('is-hidden');
          }, 180);
          filterAnimationTimeouts.push(t);
        }
      });
    };

    filterButtons.forEach((btn) => {
      btn.addEventListener('click', function() {
        const filter = this.getAttribute('data-filter');
        if (!filter) return;

        // Skip if this filter is already active
        if (this.classList.contains('active')) return;

        // Update active state + aria
        filterButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        this.classList.add('active');
        this.setAttribute('aria-selected', 'true');

        applyFilter(filter);
      });
    });
  })();

  // ============================================
  // Handle Window Unload (single listener)
  // ============================================

  window.addEventListener('beforeunload', function() {
    cleanup();
  });

})();