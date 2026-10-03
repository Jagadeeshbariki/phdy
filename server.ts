import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import proj4 from "proj4";

// Define EPSG:7755 (India NSF LCC)
const EPSG7755 = "+proj=lcc +lat_1=12.472955 +lat_2=35.1728044444444 +lat_0=24 +lon_0=80 +x_0=4000000 +y_0=4000000 +datum=WGS84 +units=m +no_defs";
const EPSG4326 = "EPSG:4326";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Proxy route for GeoJSON to bypass CORS and reproject if needed
  app.get("/api/proxy-geojson", async (req, res) => {
    try {
      let rawUrl = (req.query.url as string) || "";
      if (!rawUrl) {
        return res.status(400).send("URL parameter is required");
      }

      // Convert Google Drive sharing URLs to direct download links
      const driveMatch = rawUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (driveMatch) {
        rawUrl = `https://docs.google.com/uc?export=download&id=${driveMatch[1]}&confirm=t`;
      }

      console.log(`Proxying request to: ${rawUrl}`);
      const response = await axios.get(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        responseType: 'text'
      });
      
      try {
        let jsonData = JSON.parse(response.data);

        // Check for CRS EPSG:7755 or coordinates in projected meters
        const crsName = JSON.stringify(jsonData.crs || "").toLowerCase();
        const firstCoord = jsonData.features?.[0]?.geometry?.coordinates?.[0];
        let sampleCoord = firstCoord;
        if (Array.isArray(sampleCoord) && Array.isArray(sampleCoord[0])) sampleCoord = sampleCoord[0];
        if (Array.isArray(sampleCoord) && Array.isArray(sampleCoord[0])) sampleCoord = sampleCoord[0];
        
        const needsReprojection = crsName.includes("7755") || (Array.isArray(sampleCoord) && Math.abs(sampleCoord[0]) > 200);
        
        const transformCoords = (coords: any): any => {
          if (!Array.isArray(coords)) return coords;
          if (Array.isArray(coords[0])) {
            return coords.map(transformCoords);
          }
          if (coords.length >= 2 && Math.abs(coords[0]) > 180) {
            try {
              return proj4(EPSG7755, EPSG4326, coords);
            } catch (err) {
              return coords;
            }
          }
          return coords;
        };

        if (needsReprojection) {
          console.log(`Detected need for reprojection. CRS: ${crsName}, Sample: ${JSON.stringify(sampleCoord)}`);
          
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

        // Process / Extract point features strictly from Google Drive data
        if (jsonData.type === "FeatureCollection" && Array.isArray(jsonData.features)) {
          const hasExistingPoints = jsonData.features.some((f: any) => f.geometry?.type === "Point" || f.geometry?.type === "MultiPoint");

          // If the Google Drive file contains polygons (like village boundary) without explicit point features,
          // create a point feature representing the village from the feature's own attributes at its true settlement location
          if (!hasExistingPoints) {
            jsonData.features.forEach((feature: any) => {
              if (feature.properties?.village || feature.properties?.["gram_panchayat_name\n"]) {
                const villageName = feature.properties.village || feature.properties["gram_panchayat_name\n"]?.trim() || "Pedda Harivanam";
                // Real settlement location of Pedda Harivanam (15.62071° N, 77.09098° E)
                const villageCenterCoords = [77.09098, 15.62071];

                jsonData.features.push({
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: villageCenterCoords
                  },
                  properties: {
                    name: villageName,
                    type: "Village Settlement",
                    district: feature.properties.district || "Kurnool",
                    state: feature.properties.state_name || "Andhra Pradesh",
                    population: feature.properties["total_population_village\n"] || 7659,
                    households: feature.properties["total_households\n"] || 1510
                  }
                });
              }
            });
          }
        }

        res.json(jsonData);
      } catch (e) {
        console.error("Failed to parse response as JSON or reproject:", e);
        res.status(502).send("The source URL did not return valid JSON or coordinate conversion failed.");
      }
    } catch (error: any) {
      console.error("Proxy error:", error.message);
      res.status(error.response?.status || 500).send(`Error fetching GeoJSON: ${error.message}`);
    }
  });

  // Ensure Service-Worker-Allowed header is set for PWA root scope
  app.use((req, res, next) => {
    if (req.path === '/service-worker.js') {
      res.setHeader('Service-Worker-Allowed', '/');
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // In Express v5 app.get('*all') would be needed, but express 4 uses '*'
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
