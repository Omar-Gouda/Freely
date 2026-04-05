import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: Boolean(process.env.SENTRY_AUTH_TOKEN),
  serverExternalPackages: ["fs/promises", "fs", "path"],
  webpack: (config) => {
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency: the request of a dependency is an expression/
      }
    ];

    return config;
  }
};

const hasSentryBuildCredentials = Boolean(process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);

export default hasSentryBuildCredentials
  ? withSentryConfig(nextConfig, {
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      disableLogger: true,
      widenClientFileUpload: true,
      telemetry: false,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true
      }
    })
  : nextConfig;