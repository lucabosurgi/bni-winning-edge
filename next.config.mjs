/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Member logos/photos may be served from Supabase Storage or, temporarily,
    // hot-linked from member sites. Allow any https host; tighten later if you
    // move everything into Supabase Storage.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
