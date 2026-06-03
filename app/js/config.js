// =============================================
// App configuration — edit API_BASE_URL after deploy
// =============================================

const GO_ICON_SVG = `
  <svg class="subject-icon subject-icon-go" viewBox="0 0 300 112" role="img" aria-label="Go" xmlns="http://www.w3.org/2000/svg">
    <g fill="#00ADD8">
      <path d="M8 52h72c4 0 6 3 4 7l-3 6H3c-3 0-4-2-2-5l4-6c1-1 2-2 3-2Z"/>
      <path d="M27 36h67c4 0 6 3 4 7l-3 5H21c-3 0-4-2-2-5l4-5c1-1 2-2 4-2Z"/>
      <path d="M45 69h45c4 0 6 3 4 7l-2 4H39c-3 0-4-2-2-5l4-4c1-1 2-2 4-2Z"/>
    </g>
    <text x="82" y="91" fill="#00ADD8" font-family="Arial Black, Arial, sans-serif" font-size="90" font-weight="900" font-style="italic">GO</text>
  </svg>`;

const Config = {
  // Lambda Function URL (replace after deploy)
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8090/api/v1'
    : (window.__STUDYFORGE_ENV__?.API_BASE_URL || 'https://exams.raysouz.studio/api/v1'),

  APP_NAME: 'StudyForge',
  APP_VERSION: '1.0.0',

  // GitHub Pages origin for CORS reference
  APP_ORIGIN: 'https://raywall.github.io',

  // JWT storage key
  TOKEN_KEY: 'sf_token',
  USER_KEY:  'sf_user',
  THEME_KEY: 'sf_theme',

  // Exam settings
  AUTO_SAVE_INTERVAL_MS: 30_000,

  // Passing score threshold (%)
  DEFAULT_PASS_SCORE: 72,

  // Subject color mapping (for card banners)
  SUBJECT_COLORS: {
    aws:     'aws',
    gcp:     'gcp',
    azure:   'azure',
    go:      'go',
    golang:  'go',
    default: 'default',
  },

  // Subject icons
  SUBJECT_ICONS: {
    aws:       '☁️',
    gcp:       '🌐',
    azure:     '🔷',
    go:        GO_ICON_SVG,
    golang:    GO_ICON_SVG,
    datadog:   '🐶',
    kubernetes:'⎈',
    terraform: '🏗️',
    docker:    '🐳',
    ai:        '🤖',
    mcp:       '🔗',
    default:   '📋',
  },
};

Object.freeze(Config);
