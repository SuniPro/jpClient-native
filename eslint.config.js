import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginImport from "eslint-plugin-import";
import prettierConfig from "eslint-config-prettier";
import security from "eslint-plugin-security";
import noSecrets from "eslint-plugin-no-secrets";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "web-build/**",
      "coverage/**",
      "android/**",
      "ios/**",
    ],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      import: pluginImport,
      security,
      noSecrets,
    },
    settings: {
      react: {
        version: "detect",
      },
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
          alwaysTryTypes: true,
        },
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
    rules: {
      ...prettierConfig.rules,

      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unknown-property": "off",
      "react/jsx-curly-brace-presence": [
        "error",
        { props: "never", children: "never" },
      ],

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          vars: "all",
          args: "all",
          caughtErrors: "all",
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "no-unused-vars": "off",

      "import/extensions": [
        "error",
        "ignorePackages",
        {
          js: "never",
          jsx: "never",
          ts: "never",
          tsx: "never",
        },
      ],
      "import/no-unresolved": "error",
      "import/no-default-export": "off",

      "arrow-body-style": ["error", "as-needed"],

      "no-console": ["warn", { allow: ["warn", "error"] }],

      "security/detect-object-injection": "off",
      "security/detect-unsafe-regex": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-child-process": "off",
      "security/detect-non-literal-fs-filename": "off",

      "noSecrets/no-secrets": [
        "error",
        {
          tolerance: 4,
          minLength: 6,
          additionalRegexes: {
            "Slack Token":
                /(xox[pboa]-[0-9]{12}-[0-9]{12}-[0-9]{12}-[a-z0-9]{32})/,
            "RSA private key": /-----BEGIN RSA PRIVATE KEY-----/,
            "SSH (OPENSSH) private key": /-----BEGIN OPENSSH PRIVATE KEY-----/,
            "SSH (DSA) private key": /-----BEGIN DSA PRIVATE KEY-----/,
            "SSH (EC) private key": /-----BEGIN EC PRIVATE KEY-----/,
            "PGP private key block": /-----BEGIN PGP PRIVATE KEY BLOCK-----/,
            "Facebook Oauth":
                /[fF][aA][cC][eE][bB][oO][oO][kK].*['"][0-9a-f]{32}['"]/,
            "Twitter Oauth":
                /[tT][wW][iI][tT][tT][eE][rR].*['"][0-9a-zA-Z]{35,44}['"]/,
            GitHub:
                /[gG][iI][tT][hH][uU][bB].*['"][0-9a-zA-Z]{35,40}['"]/,
            "Google Oauth": /("client_secret":"[a-zA-Z0-9-_]{24}")/,
            "AWS API Key": /AKIA[0-9A-Z]{16}/,
            "Heroku API Key":
                /[hH][eE][rR][oO][kK][uU].*[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/,
            "Generic Secret":
                /[sS][eE][cC][rR][eE][tT].*['"][0-9a-zA-Z]{32,45}['"]/,
            "Generic API Key":
                /[aA][pP][iI][_]?[kK][eE][yY].*['"][0-9a-zA-Z]{32,45}['"]/,
            "Slack Webhook":
                /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8}\/B[a-zA-Z0-9_]{8}\/[a-zA-Z0-9_]{24}/,
            "Google (GCP) Service-account": /"type": "service_account"/,
            "Twilio API Key": /SK[a-z0-9]{32}/,
            "Password in URL":
                /[a-zA-Z]{3,10}:\/\/[^/\s:@]{3,20}:[^/\s:@]{3,20}@.{1,100}["'\s]/,
          },
        },
      ],
    },
  },
];
