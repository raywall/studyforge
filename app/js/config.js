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

const AWS_ICON_SVG = `
  <svg class="subject-icon subject-icon-wide" viewBox="0 0 180 108" role="img" aria-label="AWS" xmlns="http://www.w3.org/2000/svg">
    <text x="13" y="65" fill="#232F3E" font-family="Arial Black, Arial, sans-serif" font-size="62" font-weight="900">aws</text>
    <path d="M18 78c32 21 84 31 137 8" fill="none" stroke="#FF9900" stroke-width="10" stroke-linecap="round"/>
    <path d="M142 78c13-5 25-3 31 2-4 8-9 17-17 23" fill="none" stroke="#FF9900" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const GOOGLE_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="Google" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 22a38 38 0 0 1 27 11" fill="none" stroke="#EA4335" stroke-width="16" stroke-linecap="square"/>
    <path d="M87 33a38 38 0 0 1 8 27" fill="none" stroke="#4285F4" stroke-width="16" stroke-linecap="square"/>
    <path d="M95 60H61" fill="none" stroke="#4285F4" stroke-width="16" stroke-linecap="square"/>
    <path d="M93 67a38 38 0 0 1-66 18" fill="none" stroke="#34A853" stroke-width="16" stroke-linecap="square"/>
    <path d="M27 85a38 38 0 0 1-3-44" fill="none" stroke="#FBBC05" stroke-width="16" stroke-linecap="square"/>
    <path d="M24 41a38 38 0 0 1 36-19" fill="none" stroke="#EA4335" stroke-width="16" stroke-linecap="square"/>
  </svg>`;

const DATADOG_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="Datadog" xmlns="http://www.w3.org/2000/svg">
    <rect x="19" y="15" width="82" height="82" rx="8" fill="#632CA6" transform="rotate(-8 60 56)"/>
    <path d="M38 42c10-10 29-11 43 1 13 12 17 31 8 43-11 15-35 12-50-4-13-14-14-29-1-40Z" fill="#fff"/>
    <path d="M38 42c-9 1-16 9-14 16 2 8 12 14 20 11M78 42c7-11 18-8 22 1 5 11 2 21-6 19M46 49c3-2 7-2 10 0M72 50c4-2 8-1 11 2M55 66c6-4 14-4 20 0M51 82c13 12 28 12 40-3" fill="none" stroke="#632CA6" stroke-width="6" stroke-linecap="round"/>
    <rect x="58" y="76" width="44" height="31" fill="#fff" stroke="#632CA6" stroke-width="7" transform="rotate(-8 80 92)"/>
    <path d="M66 97l12-19 12 12 8-13 10 16" fill="none" stroke="#632CA6" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const AZURE_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="Azure" xmlns="http://www.w3.org/2000/svg">
    <path d="M54 14 17 96h35l40-82Z" fill="#008AD7"/>
    <path d="M65 32 48 75l24 25 32-1Z" fill="#008AD7"/>
    <path d="M48 75 31 96h41Z" fill="#0078D4"/>
  </svg>`;

const KUBERNETES_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="Kubernetes" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 8 96 24l15 38-23 33-42 11-34-27V39L28 18Z" fill="#326CE5"/>
    <circle cx="60" cy="60" r="29" fill="none" stroke="#fff" stroke-width="7"/>
    <circle cx="60" cy="60" r="6" fill="#fff"/>
    <g stroke="#fff" stroke-width="6" stroke-linecap="round">
      <path d="M60 18v24"/>
      <path d="M60 78v24"/>
      <path d="M18 60h24"/>
      <path d="M78 60h24"/>
      <path d="M30 30l18 18"/>
      <path d="M72 72l18 18"/>
      <path d="M90 30 72 48"/>
      <path d="M48 72 30 90"/>
    </g>
  </svg>`;

const TERRAFORM_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="Terraform" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 16 49 34v36L18 52Z" fill="#5C4EE5"/>
    <path d="M54 36 85 54v36L54 72Z" fill="#5C4EE5"/>
    <path d="M90 54 112 41v36L90 90Z" fill="#4040B2"/>
    <path d="M54 78 85 96v36L54 114Z" fill="#5C4EE5"/>
  </svg>`;

const AI_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="IA" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="aiIconGradient" x1="18" y1="20" x2="102" y2="100" gradientUnits="userSpaceOnUse">
        <stop stop-color="#6EA8FE"/>
        <stop offset="1" stop-color="#3B82F6"/>
      </linearGradient>
    </defs>
    <path d="M44 18h32l10 18 19 11v28L86 86l-10 18H44L34 86 15 75V47l19-11Z" fill="url(#aiIconGradient)"/>
    <path d="M58 24v72M62 24v72" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
    <path d="M41 35H28M41 35l9 9M41 54H25M41 54l10-8M41 72H27M41 72l10 9M79 35h13M79 35l-9 9M79 54h16M79 54l-10-8M79 72h14M79 72l-10 9" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const DOCKER_ICON_SVG = `
  <svg class="subject-icon subject-icon-wide" viewBox="0 0 150 105" role="img" aria-label="Docker" xmlns="http://www.w3.org/2000/svg">
    <g fill="#1DACE0">
      <rect x="14" y="45" width="18" height="14" rx="1"/>
      <rect x="36" y="45" width="18" height="14" rx="1"/>
      <rect x="58" y="45" width="18" height="14" rx="1"/>
      <rect x="80" y="45" width="18" height="14" rx="1"/>
      <rect x="36" y="27" width="18" height="14" rx="1"/>
      <rect x="58" y="27" width="18" height="14" rx="1"/>
      <rect x="80" y="27" width="18" height="14" rx="1"/>
      <rect x="80" y="9" width="18" height="14" rx="1"/>
      <path d="M0 61h101c10 0 19-3 27-9 6 5 13 7 22 6-6 10-17 17-33 18-12 23-35 33-67 33-26 0-43-8-51-24C-3 78-2 69 0 61Z"/>
    </g>
    <circle cx="44" cy="83" r="5" fill="#071019"/>
    <circle cx="46" cy="81" r="2" fill="#1DACE0"/>
    <path d="M10 88c12 1 23 0 35-4" fill="none" stroke="#071019" stroke-width="3" stroke-linecap="round"/>
    <path d="M126 50c-4-12-1-23 6-32 9 7 15 18 15 31-7 1-14 1-21 1Z" fill="#1DACE0"/>
  </svg>`;

const MCP_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="MCP" xmlns="http://www.w3.org/2000/svg">
    <rect x="17" y="18" width="86" height="84" rx="18" fill="#111827"/>
    <path d="M38 40h17l9 15 9-15h17v40H75V59L64 78 53 59v21H38Z" fill="#fff"/>
    <g fill="#22C55E">
      <circle cx="30" cy="30" r="6"/>
      <circle cx="90" cy="30" r="6"/>
      <circle cx="30" cy="90" r="6"/>
      <circle cx="90" cy="90" r="6"/>
    </g>
    <g stroke="#22C55E" stroke-width="5" stroke-linecap="round">
      <path d="M36 30h15"/>
      <path d="M69 30h15"/>
      <path d="M36 90h15"/>
      <path d="M69 90h15"/>
      <path d="M30 36v15"/>
      <path d="M90 36v15"/>
      <path d="M30 69v15"/>
      <path d="M90 69v15"/>
    </g>
  </svg>`;

const DEFAULT_ICON_SVG = `
  <svg class="subject-icon subject-icon-square" viewBox="0 0 120 120" role="img" aria-label="Simulado" xmlns="http://www.w3.org/2000/svg">
    <rect x="26" y="16" width="68" height="88" rx="10" fill="#64748B"/>
    <path d="M40 39h40M40 57h40M40 75h26" stroke="#fff" stroke-width="8" stroke-linecap="round"/>
    <path d="M33 26h54" stroke="#CBD5E1" stroke-width="5" stroke-linecap="round"/>
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
    google:  'gcp',
    azure:   'azure',
    go:      'go',
    golang:  'go',
    default: 'default',
  },

  // Subject icons
  SUBJECT_ICONS: {
    aws:       AWS_ICON_SVG,
    gcp:       GOOGLE_ICON_SVG,
    google:    GOOGLE_ICON_SVG,
    azure:     AZURE_ICON_SVG,
    go:        GO_ICON_SVG,
    golang:    GO_ICON_SVG,
    datadog:   DATADOG_ICON_SVG,
    kubernetes:KUBERNETES_ICON_SVG,
    terraform: TERRAFORM_ICON_SVG,
    docker:    DOCKER_ICON_SVG,
    ia:        AI_ICON_SVG,
    ai:        AI_ICON_SVG,
    mcp:       MCP_ICON_SVG,
    default:   DEFAULT_ICON_SVG,
  },
};

Object.freeze(Config);
