import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "./src/generated/**/*",
      "./src/backend/admin/generated",
      "./src/backend/admin/dist",
      "./src/backend/audio/dist",
      "./src/backend/media/dist",
      "./dist"
    ],
  },
];

export default eslintConfig;
