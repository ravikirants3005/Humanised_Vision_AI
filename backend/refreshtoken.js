
import "dotenv/config";
import express from "express";
import opn from "opn";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 5000; // Make port configurable

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

// Validate environment variables on startup
if (!client_id || !client_secret || !redirect_uri) {
  console.error("❌ Missing required environment variables");
  process.exit(1);
}

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  const scopes = [
    "user-read-private",
    "user-read-email",
    "playlist-modify-public",
    "playlist-modify-private",
  ].join(" ");

  const authURL = new URL("https://accounts.spotify.com/authorize");
  authURL.searchParams.append("response_type", "code");
  authURL.searchParams.append("client_id", client_id);
  authURL.searchParams.append("scope", scopes);
  authURL.searchParams.append("redirect_uri", redirect_uri);
  authURL.searchParams.append("show_dialog", "true"); // Force login dialog

  const htmlResponse = `
    <html>
      <head>
        <title>Spotify Auth</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 2rem; }
          .login-btn {
            background-color: #1DB954;
            color: white;
            padding: 1rem 2rem;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin: 1rem;
          }
        </style>
      </head>
      <body>
        <h1>Spotify Authentication</h1>
        <a href="${authURL.toString()}" class="login-btn">Login with Spotify</a>
      </body>
    </html>
  `;

  res.send(htmlResponse);

  // Open browser automatically
  opn(authURL.toString()).catch((err) =>
    console.error("⚠️ Could not automatically open browser:", err.message)
  );
});

app.get("/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    console.error("❌ Spotify auth error:", error);
    return res.status(400).send(`<h1>Authorization Failed</h1><p>${error}</p>`);
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${client_id}:${client_secret}`
          ).toString("base64")}`,
        },
      }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Success response with better formatting and token handling suggestions
    res.send(`
      <html>
        <head>
          <title>Auth Success</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto; }
            .token {
              background: #f5f5f5;
              padding: 1rem;
              border-radius: 4px;
              word-break: break-all;
              margin-bottom: 1rem;
            }
            .warning { color: #d62c1a; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>✅ Spotify Authentication Successful</h1>
          <p><strong>Access Token:</strong> (expires in ${expires_in} seconds)</p>
          <div class="token">${access_token}</div>

          <p><strong>Refresh Token:</strong> (keep this secure!)</p>
          <div class="token">${refresh_token}</div>

          <p class="warning">⚠️ Important: Store these tokens securely and never expose them in production!</p>
          <p>You can now use these tokens to make API requests to Spotify.</p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error(
      "❌ Token exchange error:",
      err.response?.data || err.message
    );
    res.status(500).send(`
      <h1>Token Exchange Failed</h1>
      <p>${err.response?.data?.error_description || err.message}</p>
      <p>Check server logs for more details.</p>
    `);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔐 Spotify auth URL: http://localhost:${PORT}`);
});
