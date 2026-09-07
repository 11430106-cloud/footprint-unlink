import { sites } from '@openai/sites-vite-plugin';
import tailwindcss from '@tailwindcss/postcss';
import vinext from 'vinext';
import { defineConfig } from 'vite';
// This quiz is exported as a static site: all answers stay in browser memory.
export default defineConfig({
 css: { postcss: { plugins: [tailwindcss()] } },
 plugins: [vinext(), sites()],
});