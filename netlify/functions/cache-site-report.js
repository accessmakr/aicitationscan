import fs from "fs";
import path from "path";

const cacheDir =
  path.resolve(
    process.cwd(),
    "site-report/cache/completed"
  );

export default async (req) => {

  try {

    const url =
      new URL(req.url)
      .searchParams
      .get("url");

    if (!url) {

      return Response.json({
        success: false,
        error: "Missing URL"
      });
    }

    const cleanDomain =
      url
        .replace("https://", "")
        .replace("http://", "")
        .replace(/\/$/, "");

    const cacheFile =
      path.join(
        cacheDir,
        `${cleanDomain}.json`
      );

    if (!fs.existsSync(cacheFile)) {

      return Response.json({
        success: false,
        cached: false
      });
    }

    const raw =
      fs.readFileSync(
        cacheFile,
        "utf-8"
      );

    return Response.json({
      success: true,
      cached: true,
      data: JSON.parse(raw)
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    });
  }
};
