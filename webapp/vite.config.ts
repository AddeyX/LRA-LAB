import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  // The setup guide bundles firmware sources from the sibling firmware/ project.
  server: { fs: { allow: [".", "../firmware"] } },
});
