import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@mdxeditor/editor"],
  images: {
    unoptimized: true,
  },
  outputFileTracingIncludes: {
    "/blog": ["./content/articles/**/*"],
    "/article/[slug]": ["./content/articles/**/*"],
  },
};

export default nextConfig;
