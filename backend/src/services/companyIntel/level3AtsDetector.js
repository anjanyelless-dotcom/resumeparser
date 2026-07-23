const cheerio = require('cheerio');

/**
 * Detect ATS provider from URL and HTML
 * @param {string} careerUrl - Career page URL
 * @param {string} pageHtml - HTML content of the page
 * @returns {Object} - { provider: string, confidence: 'high'|'medium'|'low', detectedUrl: string }
 */
function detectATSProvider(careerUrl, pageHtml) {
  const urlLower = careerUrl.toLowerCase();
  const $ = cheerio.load(pageHtml || '');
  
  // Check URL patterns first (highest confidence)
  if (urlLower.includes('boards.greenhouse.io')) {
    return {
      provider: 'greenhouse',
      confidence: 'high',
      detectedUrl: careerUrl,
    };
  }
  
  if (urlLower.includes('jobs.lever.co')) {
    return {
      provider: 'lever',
      confidence: 'high',
      detectedUrl: careerUrl,
    };
  }
  
  if (urlLower.includes('myworkdayjobs.com')) {
    return {
      provider: 'workday',
      confidence: 'high',
      detectedUrl: careerUrl,
    };
  }
  
  if (urlLower.includes('jobs.ashbyhq.com')) {
    return {
      provider: 'ashby',
      confidence: 'high',
      detectedUrl: careerUrl,
    };
  }
  
  if (urlLower.includes('careers.smartrecruiters.com')) {
    return {
      provider: 'smartrecruiters',
      confidence: 'high',
      detectedUrl: careerUrl,
    };
  }
  
  if (urlLower.includes('bamboohr.com/jobs') || urlLower.includes('bamboohr.com/careers')) {
    return {
      provider: 'bamboohr',
      confidence: 'high',
      detectedUrl: careerUrl,
    };
  }
  
  // Check HTML fingerprints (medium confidence)
  const htmlLower = (pageHtml || '').toLowerCase();
  
  // Check for embedded iframes (medium confidence)
  // This check should happen before other HTML fingerprints
  let detectedEmbeddedUrl = null;
  
  $('iframe').each((_, element) => {
    const src = $(element).attr('src');
    if (!src) return;
    
    const srcLower = src.toLowerCase();
    
    if (srcLower.includes('boards.greenhouse.io') && !detectedEmbeddedUrl) {
      detectedEmbeddedUrl = src;
    } else if (srcLower.includes('jobs.lever.co') && !detectedEmbeddedUrl) {
      detectedEmbeddedUrl = src;
    } else if (srcLower.includes('myworkdayjobs.com') && !detectedEmbeddedUrl) {
      detectedEmbeddedUrl = src;
    } else if (srcLower.includes('jobs.ashbyhq.com') && !detectedEmbeddedUrl) {
      detectedEmbeddedUrl = src;
    }
  });
  
  if (detectedEmbeddedUrl) {
    // Determine provider from embedded URL
    if (detectedEmbeddedUrl.includes('greenhouse')) {
      return {
        provider: 'greenhouse',
        confidence: 'medium',
        detectedUrl: detectedEmbeddedUrl,
      };
    }
    if (detectedEmbeddedUrl.includes('lever')) {
      return {
        provider: 'lever',
        confidence: 'medium',
        detectedUrl: detectedEmbeddedUrl,
      };
    }
    if (detectedEmbeddedUrl.includes('workday')) {
      return {
        provider: 'workday',
        confidence: 'medium',
        detectedUrl: detectedEmbeddedUrl,
      };
    }
  // This check should happen before other HTML fingerprints
    if (detectedEmbeddedUrl.includes('ashby')) {
      return {
        provider: 'ashby',
        confidence: 'medium',
        detectedUrl: detectedEmbeddedUrl,
      };
    }
  }
  
  // Greenhouse fingerprints
  if (htmlLower.includes('greenhouse.io') && htmlLower.includes('src=')) {
    return {
      provider: 'greenhouse',
      confidence: 'medium',
      detectedUrl: careerUrl,
    };
  }
  
  if ($('#grnhse_app').length > 0) {
    return {
      provider: 'greenhouse',
      confidence: 'medium',
      detectedUrl: careerUrl,
    };
  }
  
  // Lever fingerprints
  if (htmlLower.includes('lever-jobs') || htmlLower.includes('lever.co')) {
    return {
      provider: 'lever',
      confidence: 'medium',
      detectedUrl: careerUrl,
    };
  }
  
  if ($('.lever-jobs').length > 0) {
    return {
      provider: 'lever',
      confidence: 'medium',
      detectedUrl: careerUrl,
    };
  }
  
  // Ashby fingerprints
  if (htmlLower.includes('ashbyhq') || htmlLower.includes('ashby')) {
    return {
      provider: 'ashby',
      confidence: 'medium',
      detectedUrl: careerUrl,
    };
  }
  
  // Check for fetch calls in inline scripts (low confidence)
  // Only check if no HTML fingerprints were found above
  const hasHtmlFingerprint = 
    (htmlLower.includes('greenhouse.io') && htmlLower.includes('src=')) ||
    $('#grnhse_app').length > 0 ||
    htmlLower.includes('lever-jobs') ||
    $('.lever-jobs').length > 0 ||
    htmlLower.includes('ashby');
  
  if (!hasHtmlFingerprint) {
    const scriptContent = $('script').map((_, element) => $(element).html()).get().join(' ');
    const scriptLower = scriptContent.toLowerCase();
    
    if (scriptLower.includes('fetch(') || scriptLower.includes('axios.get(')) {
      if (scriptLower.includes('greenhouse')) {
        return {
          provider: 'greenhouse',
          confidence: 'low',
          detectedUrl: careerUrl,
        };
      }
      if (scriptLower.includes('lever')) {
        return {
          provider: 'lever',
          confidence: 'low',
          detectedUrl: careerUrl,
        };
      }
      if (scriptLower.includes('workday')) {
        return {
          provider: 'workday',
          confidence: 'low',
          detectedUrl: careerUrl,
        };
      }
    }
  }
  
  // Unknown provider
  return {
    provider: 'unknown',
    confidence: 'low',
    detectedUrl: careerUrl,
  };
}

module.exports = { detectATSProvider };
