# LLM Chatbot Demo

A static, GitHub Pages-ready chat interface for experimenting with OpenAI-compatible large language model APIs. The site runs entirely in the browser and talks directly to the API endpoint you configure.

## Features

- 🧠 Chat with any API that implements the [OpenAI Chat Completions](https://platform.openai.com/docs/guides/text-generation/chat-completions-api) protocol.
- 🎛️ Adjustable connection settings (API base URL, model, temperature) saved in localStorage.
- 🔐 Optional local storage of your API key on the device.
- 🌗 Light/dark theme toggle that respects the system preference.
- ⚠️ Friendly inline error handling with toast notifications.

## Getting started

1. **Configure GitHub Pages**
   - Push this repository to GitHub.
   - In the repository settings, enable GitHub Pages using the `main` branch (or whichever branch you prefer).

2. **Visit your site**
   - Navigate to the published GitHub Pages URL.
   - Paste your API key into the settings panel, optionally enable "Remember key", and choose a model.

3. **Chat away!**
   - Type a prompt and press <kbd>Send</kbd> to forward the conversation to your configured LLM API.

## Development

The site uses vanilla HTML, CSS, and JavaScript—no build step required. To run it locally, start a simple HTTP server:

```bash
python -m http.server 3000
```

Then open <http://localhost:3000> in your browser.

## Security notes

- API keys are **never** sent to any server beyond the API endpoint you configure.
- If you choose to remember your key, it is stored (base64-encoded) in `localStorage` on this device only. Remove the checkmark or click **Reset** in the settings panel to clear it.

## Deployment checklist

- [ ] Set the repository visibility based on your preference.
- [ ] Configure [CORS](https://developer.mozilla.org/docs/Web/HTTP/CORS) on your API endpoint if necessary so the browser can reach it.
- [ ] Rotate API keys regularly and prefer fine-grained keys with limited scopes.

Enjoy exploring!
