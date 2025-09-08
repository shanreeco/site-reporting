diff --git a//dev/null b/tailwind.config.js
index 0000000000000000000000000000000000000000..38278f7823d3fc8c26410e3a2fc39331b2777740 100644
--- a//dev/null
+++ b/tailwind.config.js
@@ -0,0 +1,8 @@
+/** @type {import('tailwindcss').Config} */
+export default {
+  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
+  theme: {
+    extend: {},
+  },
+  plugins: [],
+};
