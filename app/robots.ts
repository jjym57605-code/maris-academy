
import type { MetadataRoute } from "next";

const siteUrl = "https://maris-academy-three.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/login",
          "/register",
          "/reset-password",
          "/dashboard",
          "/courses",
          "/library",
          "/quizzes",
          "/progress",
          "/leaderboard",
          "/achievements",
          "/maris-id",
          "/profile",
          "/reels",
          "/admin",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}

