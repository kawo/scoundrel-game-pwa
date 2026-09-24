/*
 * Self-hosted fonts, so the game renders the same with no network.
 *
 * Only the weights styles.css uses, and only the Latin subsets: English and
 * French both fit inside latin + latin-ext. Each file carries a unicode-range,
 * so the browser only downloads a subset when the page actually needs it; the
 * service worker precaches them all for offline play.
 */

// Cinzel: headings, counters, buttons.
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-ext-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-ext-600.css';
import '@fontsource/cinzel/latin-700.css';
import '@fontsource/cinzel/latin-ext-700.css';

// Spectral: body text and the chronicle.
import '@fontsource/spectral/latin-300.css';
import '@fontsource/spectral/latin-ext-300.css';
import '@fontsource/spectral/latin-400.css';
import '@fontsource/spectral/latin-ext-400.css';
import '@fontsource/spectral/latin-400-italic.css';
import '@fontsource/spectral/latin-ext-400-italic.css';
import '@fontsource/spectral/latin-600.css';
import '@fontsource/spectral/latin-ext-600.css';
