# Setup Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get your Anthropic API key**
   - Go to [https://console.anthropic.com/](https://console.anthropic.com/)
   - Sign up or log in
   - Navigate to API Keys section
   - Create a new API key

3. **Configure environment**
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and replace `your_api_key_here` with your actual API key:
     ```
     VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
     ```

4. **Run the app**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Navigate to `http://localhost:5173` (or the URL shown in terminal)

## Common Issues

### "Missing API key" error
- Make sure you created a `.env` file (not `.env.example`)
- Check that the API key is correctly set in `.env`
- Restart the dev server after creating/modifying `.env`

### PDF not loading
- Ensure the PDF contains extractable text (not scanned images)
- Check browser console for detailed error messages
- Try a different PDF file

### No voice narration
- Check that your browser supports Web Speech API (Chrome, Edge, Safari work best)
- Ensure system volume is not muted
- Try different narration moods

### API errors
- Verify your API key is valid and has credits
- Check your internet connection
- Look at browser console for specific error messages
