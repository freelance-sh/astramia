/**
 * Runs before every build. On Vercel's production deploys (pushes to main)
 * it brings the database up to date before the app that needs it goes
 * live; a failed migration fails the build, and the site already live keeps
 * running. Previews and local builds never touch the database.
 */
if (process.env.VERCEL_ENV === "production") {
    await import("./migrate");
} else {
    console.log("migrations: skipped (not a production deploy)");
}

export {};
