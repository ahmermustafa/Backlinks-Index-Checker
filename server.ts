import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { getDb } from "./src/db"; // Import database helper (compiled/run with node type:module or tsx)

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazily initialized Gemini Client helper
let aiInstance: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// URL Normalization & Validation Helper
function normalizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return url;
  }
}

function isValidUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// 1. Check HTTP Headers & Redirects
async function checkUrlHeaders(url: string): Promise<{
  httpStatus: number | null;
  redirected: boolean;
  redirectUrl: string | null;
  error: string | null;
}> {
  try {
    // Try to perform a GET fetch with custom headers and manual redirect
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000) // 8-second timeout
    });

    const isRedirect = res.status >= 300 && res.status < 400;
    const location = res.headers.get('location');

    return {
      httpStatus: res.status,
      redirected: isRedirect,
      redirectUrl: isRedirect ? location : null,
      error: null
    };
  } catch (err: any) {
    // Fallback: If 'manual' redirect throws or is unsupported, try default redirect: 'follow'
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(8000)
      });
      const redirected = res.redirected || (res.url && res.url !== url);
      return {
        httpStatus: res.status,
        redirected: redirected,
        redirectUrl: redirected ? res.url : null,
        error: null
      };
    } catch (innerErr: any) {
      return {
        httpStatus: null,
        redirected: false,
        redirectUrl: null,
        error: innerErr.message || String(innerErr)
      };
    }
  }
}

// 2. Perform Google site: query indexing check using Gemini API with Search Grounding
async function checkGoogleIndex(url: string): Promise<{
  indexed: boolean;
  reason: string;
}> {
  if (!process.env.GEMINI_API_KEY) {
    return {
      indexed: false,
      reason: "Error: GEMINI_API_KEY environment variable is not configured."
    };
  }

  try {
    const ai = getGenAI();
    // Query google search grounding for the exact URL
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Search Google using the query:
site:${url}

Determine if the exact URL "${url}" appears in Google's search results.
Answer in detail whether this specific page is indexed. Your output must clearly state either "INDEXED" or "NOT_INDEXED".`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Let's analyze grounding chunks for any match
    let foundInChunks = false;
    const targetNormalized = url.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');

    for (const chunk of chunks) {
      if (chunk.web && chunk.web.uri) {
        const chunkNormalized = chunk.web.uri.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '');
        if (chunkNormalized === targetNormalized || chunkNormalized.includes(targetNormalized) || targetNormalized.includes(chunkNormalized)) {
          foundInChunks = true;
          break;
        }
      }
    }

    const textSaysIndexed = text.toUpperCase().includes('INDEXED') && !text.toUpperCase().includes('NOT_INDEXED');

    let indexed = false;
    if (foundInChunks) {
      indexed = true;
    } else if (chunks.length > 0) {
      // If there are results and the model believes it's indexed, let's mark as indexed
      indexed = textSaysIndexed;
    } else {
      // If chunks is empty, there are no results returned from Google search, so it is strictly not indexed
      indexed = false;
    }

    return {
      indexed,
      reason: text.substring(0, 300) || (indexed ? "Verified in Google Search results." : "No results returned for this URL query.")
    };
  } catch (err: any) {
    console.error(`Gemini Grounding check failed for URL: ${url}`, err);
    return {
      indexed: false,
      reason: `Error: ${err.message || String(err)}`
    };
  }
}

// Background batch processing runner
async function processBatchJob(jobId: number, urls: string[]) {
  const db = await getDb();
  let indexedCount = 0;
  let notIndexedCount = 0;
  let redirectedCount = 0;
  let errorCount = 0;

  // Process backlinks using a controlled concurrency queue (concurrency = 3)
  const CONCURRENCY = 3;
  let index = 0;

  const runWorker = async () => {
    while (index < urls.length) {
      const currentIdx = index++;
      if (currentIdx >= urls.length) break;

      const rawUrl = urls[currentIdx];
      const url = normalizeUrl(rawUrl);

      // Update current URL being checked in the job
      await db.run(
        `UPDATE jobs SET current_url = ? WHERE id = ?`,
        [url, jobId]
      );

      let indexStatus = "Error ❌";
      let httpStatus: number | null = null;
      let redirectUrl: string | null = null;
      const checkedAt = new Date().toISOString();

      if (!isValidUrl(url)) {
        indexStatus = "Error ❌";
        errorCount++;
        await db.run(
          `INSERT INTO backlinks (job_id, url, index_status, http_status, redirect_url, checked_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [jobId, rawUrl || '(empty)', indexStatus, null, null, checkedAt]
        );
        continue;
      }

      try {
        // Step 1: Check HTTP Headers / Status
        const headerRes = await checkUrlHeaders(url);
        httpStatus = headerRes.httpStatus;
        redirectUrl = headerRes.redirectUrl;

        if (headerRes.error) {
          indexStatus = "Error ❌";
          errorCount++;
        } else if (httpStatus === 404) {
          indexStatus = "Not Found ⚠️";
          notIndexedCount++;
        } else if (headerRes.redirected) {
          indexStatus = "Redirected ↪️";
          redirectedCount++;
        } else {
          // HTTP Status 200/OK. Check indexing status with Gemini Search Grounding.
          let searchResult = null;
          let retries = 3;

          while (retries > 0) {
            try {
              searchResult = await checkGoogleIndex(url);
              break;
            } catch (err: any) {
              if (err.status === 429 || err.message?.includes('429')) {
                retries--;
                await new Promise(resolve => setTimeout(resolve, 3000));
              } else {
                throw err;
              }
            }
          }

          if (searchResult) {
            if (searchResult.indexed) {
              indexStatus = "Indexed ✅";
              indexedCount++;
            } else {
              indexStatus = "Not Indexed ❌";
              notIndexedCount++;
            }
          } else {
            indexStatus = "Error ❌";
            errorCount++;
          }
        }
      } catch (err) {
        console.error(`Error processing URL ${url}:`, err);
        indexStatus = "Error ❌";
        errorCount++;
      }

      // Record this backlink check
      await db.run(
        `INSERT INTO backlinks (job_id, url, index_status, http_status, redirect_url, checked_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [jobId, url, indexStatus, httpStatus, redirectUrl, checkedAt]
      );

      // Update the cumulative stats for this job
      await db.run(
        `UPDATE jobs 
         SET indexed_count = ?, not_indexed_count = ?, redirected_count = ?, error_count = ?
         WHERE id = ?`,
        [indexedCount, notIndexedCount, redirectedCount, errorCount, jobId]
      );
    }
  };

  try {
    const workers = Array.from({ length: CONCURRENCY }, () => runWorker());
    await Promise.all(workers);

    // Set job status to completed and clear the current checking URL
    await db.run(
      `UPDATE jobs SET status = 'completed', current_url = '' WHERE id = ?`,
      [jobId]
    );
  } catch (err) {
    console.error(`Batch job ${jobId} failed completely:`, err);
    await db.run(
      `UPDATE jobs SET status = 'failed', current_url = '' WHERE id = ?`,
      [jobId]
    );
  }
}

// API Routes

// 1. Health & status check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", apiKeyConfigured: !!process.env.GEMINI_API_KEY });
});

// 2. Fetch all historical batch checking jobs
app.get("/api/jobs", async (req, res) => {
  try {
    const db = await getDb();
    const jobs = await db.all("SELECT * FROM jobs ORDER BY id DESC");
    res.json({ success: true, jobs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create a new backlink checking job (Max 100 URLs)
app.post("/api/jobs", async (req, res) => {
  try {
    const { urls } = req.body;
    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({ success: false, error: "Missing parameter: urls (should be an array of strings)" });
    }

    // Filter, normalize and remove duplicate URLs
    const uniqueRawUrls = Array.from(new Set(urls.map(u => u.trim()).filter(Boolean)));
    const validatedUrls = uniqueRawUrls.map(normalizeUrl).filter(Boolean);

    if (validatedUrls.length === 0) {
      return res.status(400).json({ success: false, error: "Please submit at least one valid backlink URL." });
    }

    if (validatedUrls.length > 100) {
      return res.status(400).json({ success: false, error: "Maximum limit is 100 URLs per check." });
    }

    const db = await getDb();
    const createdAt = new Date().toISOString();

    // Create the pending job
    const result = await db.run(
      `INSERT INTO jobs (created_at, total_urls, indexed_count, not_indexed_count, redirected_count, error_count, current_url, status)
       VALUES (?, ?, 0, 0, 0, 0, '', 'processing')`,
      [createdAt, validatedUrls.length]
    );

    const jobId = result.lastID;

    // Start background processing immediately (non-blocking)
    processBatchJob(jobId!, uniqueRawUrls);

    res.json({
      success: true,
      jobId,
      message: `Job ${jobId} created and is now processing ${validatedUrls.length} backlinks.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Fetch details & backlinks of a specific job
app.get("/api/jobs/:id", async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const db = await getDb();

    const job = await db.get("SELECT * FROM jobs WHERE id = ?", [jobId]);
    if (!job) {
      return res.status(404).json({ success: false, error: `Job with ID ${jobId} not found.` });
    }

    const backlinks = await db.all("SELECT * FROM backlinks WHERE job_id = ? ORDER BY id ASC", [jobId]);

    res.json({
      success: true,
      job,
      backlinks
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete a job
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    const jobId = parseInt(req.params.id, 10);
    const db = await getDb();

    const result = await db.run("DELETE FROM jobs WHERE id = ?", [jobId]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: `Job with ID ${jobId} not found.` });
    }

    res.json({ success: true, message: `Job ${jobId} and its results have been deleted.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Main Server Setup Function
async function startServer() {
  const db = await getDb();

  // Reset any lingering 'processing' jobs from a previous server run to 'failed' (safeguard)
  await db.run("UPDATE jobs SET status = 'failed', current_url = '' WHERE status = 'processing'");

  // Vite middleware integration for Hot Reload & Client Routing
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start the Express full-stack server:", err);
});
