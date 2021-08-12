module.exports = {
  reactStrictMode: true,
  // lifted from https://dev.to/marcinwosinek/how-to-add-resolve-fallback-to-webpack-5-in-nextjs-10-i6j
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false,
      assert: false,
      process: false,
      util: false,
      path: false,
      os: false
    };
    return config;
  },
};
