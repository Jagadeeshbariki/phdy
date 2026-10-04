import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import proj4 from "proj4";

// Define EPSG:7755 (India NSF LCC)
const EPSG7755 = "+proj=lcc +lat_1=12.472955 +lat_2=35.1728044444444 +lat_0=24 +lon_0=80 +x_0=4000000 +y_0=4000000 +datum=WGS84 +units=m +no_defs";
const EPSG4326 = "EPSG:4326";

function transformCoords(coords: any): any {
  if (!Array.isArray(coords)) return coords;
  if (Array.isArray(coords[0])) {
    return coords.map(transformCoords);
  }
  if (coords.length >= 2 && Math.abs(coords[0]) > 180) {
    try {
      return proj4(EPSG7755, EPSG4326, coords);
    } catch {
      return coords;
    }
  }
  return coords;
}

function reprojectGeoJsonIfNeeded(jsonData: any) {
  const crsName = JSON.stringify(jsonData.crs || "").toLowerCase();
  const firstCoord = jsonData.features?.[0]?.geometry?.coordinates?.[0];
  let sampleCoord = firstCoord;
  if (Array.isArray(sampleCoord) && Array.isArray(sampleCoord[0])) sampleCoord = sampleCoord[0];
  if (Array.isArray(sampleCoord) && Array.isArray(sampleCoord[0])) sampleCoord = sampleCoord[0];

  const needsReprojection = crsName.includes("7755") || (Array.isArray(sampleCoord) && Math.abs(sampleCoord[0]) > 200);

  if (needsReprojection) {
    if (jsonData.type === "FeatureCollection" && Array.isArray(jsonData.features)) {
      jsonData.features.forEach((feature: any) => {
        if (feature.geometry && feature.geometry.coordinates) {
          feature.geometry.coordinates = transformCoords(feature.geometry.coordinates);
        }
      });
    } else if (jsonData.type === "Feature" && jsonData.geometry) {
      jsonData.geometry.coordinates = transformCoords(jsonData.geometry.coordinates);
    }

    jsonData.crs = {
      type: "name",
      properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" }
    };
  }
  return jsonData;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Supabase runtime config endpoint
  app.get("/api/supabase-config", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || "";
    res.json({
      url: cleanUrl,
      anonKey: key,
      configured: Boolean(cleanUrl && key && cleanUrl.startsWith("https://"))
    });
  });

  // Dedicated endpoints for local bundled geojson data (zero failure, 100% reliable)
  app.get("/api/points", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const filePath = path.join(process.cwd(), "public", "pedda_harivanam_points.geojson");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        return res.send(data);
      }
    } catch (err: any) {
      console.error("Error reading pedda_harivanam_points.geojson:", err.message);
    }
    // Fallback JSON in case file system has issues
    res.json({
      type: "FeatureCollection",
      name: "Pedda_harivanam_point",
      crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
      features: [
        { type: "Feature", properties: { id: 1, Name: "Zilla Parisadh High School", type: "High School" }, geometry: { type: "Point", coordinates: [ 77.102188059346034, 15.630581808142665 ] } },
        { type: "Feature", properties: { id: 2, Name: "M.P.P Kannada School", type: "Primary School (Kannada)" }, geometry: { type: "Point", coordinates: [ 77.10034438685858, 15.6325348009539 ] } },
        { type: "Feature", properties: { id: 3, Name: "M.P.P Telugu School", type: "Primary School (Telugu)" }, geometry: { type: "Point", coordinates: [ 77.10342190707631, 15.634604239468418 ] } }
      ]
    });
  });

  app.get("/api/boundary", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      const filePath = path.join(process.cwd(), "public", "pedda_harivanam_boundary.geojson");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        return res.send(data);
      }
    } catch (err: any) {
      console.error("Error reading pedda_harivanam_boundary.geojson:", err.message);
    }
    res.status(404).json({ error: "Boundary file not found" });
  });

  // Proxy route for GeoJSON to bypass CORS and reproject if needed
  app.get("/api/proxy-geojson", async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    try {
      let rawUrl = (req.query.url as string) || "";
      if (!rawUrl) {
        return res.status(400).json({ error: "URL parameter is required" });
      }

      // Check if this matches known Google Drive file IDs
      const driveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                         rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = driveMatch ? driveMatch[1] : null;

      // Handle direct local fallbacks for user's primary files if Google Drive rate limits / returns HTML
      const pointsFileId = "1FfBr0ImlgQ7n3fFUeL4T7awunubQOMi1";
      const boundaryFileId = "1z9Skq818piocsKZ215_Bqs5iAOJaq-SE";

      let fetchedData: any = null;

      // Try fetching from Google Drive
      if (fileId) {
        const downloadUrls = [
          `https://drive.usercontent.google.com/download?id=${fileId}&export=download`,
          `https://docs.google.com/uc?export=download&id=${fileId}&confirm=t`
        ];

        for (const dlUrl of downloadUrls) {
          try {
            const response = await axios.get(dlUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/plain, */*"
              },
              responseType: "text",
              timeout: 7000
            });

            if (typeof response.data === "string" && response.data.trim().startsWith("{")) {
              fetchedData = JSON.parse(response.data);
              break;
            } else if (typeof response.data === "object" && response.data !== null) {
              fetchedData = response.data;
              break;
            }
          } catch (e: any) {
            console.warn(`Failed fetching from ${dlUrl}:`, e.message);
          }
        }
      } else {
        // Normal non-drive URL
        try {
          const response = await axios.get(rawUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            responseType: "text",
            timeout: 8000
          });
          if (typeof response.data === "string" && response.data.trim().startsWith("{")) {
            fetchedData = JSON.parse(response.data);
          } else if (typeof response.data === "object" && response.data !== null) {
            fetchedData = response.data;
          }
        } catch (e: any) {
          console.warn(`Failed fetching raw URL ${rawUrl}:`, e.message);
        }
      }

      // If network fetch failed or returned HTML, use local fallback if available
      if (!fetchedData) {
        if (fileId === pointsFileId || rawUrl.includes(pointsFileId)) {
          console.log("Serving local fallback for Pedda Harivanam points");
          const localPoints = path.join(process.cwd(), "public", "pedda_harivanam_points.geojson");
          if (fs.existsSync(localPoints)) {
            return res.send(fs.readFileSync(localPoints, "utf8"));
          }
        } else if (fileId === boundaryFileId || rawUrl.includes(boundaryFileId)) {
          console.log("Serving local fallback for Pedda Harivanam boundary");
          const localBoundary = path.join(process.cwd(), "public", "pedda_harivanam_boundary.geojson");
          if (fs.existsSync(localBoundary)) {
            return res.send(fs.readFileSync(localBoundary, "utf8"));
          }
        }

        return res.status(502).json({
          error: "The requested URL did not return valid GeoJSON, or Google Drive requires human verification. Falling back to local data."
        });
      }

      // Reproject coordinates if EPSG:7755
      const reprojected = reprojectGeoJsonIfNeeded(fetchedData);
      return res.json(reprojected);
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(500).json({ error: `Error processing GeoJSON: ${error.message}` });
    }
  });

  // Ensure Service-Worker-Allowed header is set for PWA root scope
  app.use((req, res, next) => {
    if (req.path === "/service-worker.js") {
      res.setHeader("Service-Worker-Allowed", "/");
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
