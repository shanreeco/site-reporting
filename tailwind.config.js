diff --git a//dev/null b/tailwind.config.js
index 0000000000000000000000000000000000000000..6dc94c5e6d9905205eae11ebcf6241efc49fd25a 100644
--- a//dev/null
+++ b/tailwind.config.js
@@ -0,0 +1,9 @@
+/** @type {import('tailwindcss').Config} */
+export default {
+  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
+  theme: {
+    extend: {},
+  },
+  plugins: [],
+}
+
