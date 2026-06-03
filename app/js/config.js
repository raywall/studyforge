// =============================================
// App configuration — edit API_BASE_URL after deploy
// =============================================

const Config = {
  // Lambda Function URL (replace after deploy)
  API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8090/api/v1'
    : 'https://exams.raysouz.studio/api/v1',

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
    go:        '🐹',
    golang:    '🐹',
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
