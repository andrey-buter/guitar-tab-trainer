# Google Drive Integration Setup Guide

This guide will help you set up Google Drive API integration for the AlphaTab Playground.

## Prerequisites

- Google Account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Create Project"** or select an existing project
3. Give your project a name (e.g., "AlphaTab Playground")
4. Click **"Create"**

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Search for **"Google Drive API"**
3. Click on it and press **"Enable"**
4. Search for **"Google Picker API"** and enable it as well

## Step 3: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. If prompted, configure the OAuth consent screen:

   - Choose **"External"** user type
   - Fill in the required fields:
     - App name: "AlphaTab Playground"
     - User support email: your email
     - Developer contact information: your email
   - Click **"Save and Continue"**
   - On the Scopes page, click **"Save and Continue"**
   - On the Test users page, you can add test users or skip
   - Click **"Save and Continue"**

4. Back to creating OAuth client ID:

   - **Application type**: Web application
   - **Name**: "AlphaTab Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**: (optional for implicit flow)
   - Click **"Create"**

5. **Save your credentials**:
   - Copy the **Client ID** (looks like: `xxxxx.apps.googleusercontent.com`)
   - You'll use this in the next step

## Step 4: Create API Key (for Picker)

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"API key"**
3. **Save your API Key**
4. (Optional) Click **"Restrict Key"** to add restrictions:
   - Under **"API restrictions"**, select **"Restrict key"**
   - Choose **"Google Drive API"** and **"Google Picker API"**
   - Under **"Website restrictions"**, add your domains
   - Click **"Save"**

## Step 5: Configure the Component

1. Open the file: `src/components/AlphaTabPlayground/google-drive-picker.tsx`

2. Find these lines near the top of the component (around line 48-50):

```typescript
const CLIENT_ID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
const API_KEY = "YOUR_API_KEY";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
```

3. Replace the values:
   - `YOUR_CLIENT_ID` → Your OAuth 2.0 Client ID from Step 3
   - `YOUR_API_KEY` → Your API Key from Step 4
   - `SCOPES` → Keep as is for read-only access

Example:

```typescript
const CLIENT_ID = "123456789-abcdefghijklmnop.apps.googleusercontent.com";
const API_KEY = "AIzaSyABC-1234567890DefghIJKlmnopQRSTuv";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";
```

## Step 6: Test the Integration

1. Start your development server:

```bash
npm start
```

2. Open the AlphaTab Playground page

3. Look for the Google Drive icon button next to the "Open File" button

4. Click it to sign in with your Google account

5. After signing in, click the button again to open the file picker modal

6. Select a folder and browse files

## OAuth Scopes Explanation

You can adjust the `SCOPES` constant based on your needs:

- `https://www.googleapis.com/auth/drive.readonly` - **Read-only access** (recommended)
- `https://www.googleapis.com/auth/drive.file` - Access only to files created by the app
- `https://www.googleapis.com/auth/drive` - Full access to all Drive files (not recommended)

## Security Considerations

1. **Never commit your credentials to Git**:

   - Consider using environment variables for production
   - Add `.env` files to `.gitignore`

2. **Restrict your API key**:

   - Limit it to specific APIs
   - Add HTTP referrer restrictions

3. **Configure OAuth consent screen**:

   - Add proper privacy policy
   - Request only necessary scopes

4. **For production**:
   - Move credentials to environment variables
   - Use a backend proxy for additional security
   - Implement proper token refresh logic

## Troubleshooting

### "Access blocked: This app's request is invalid"

- Make sure you've added the correct authorized JavaScript origins
- Check that your OAuth consent screen is properly configured

### "Failed to load Google API scripts"

- Check your internet connection
- Make sure the scripts aren't blocked by ad blockers
- Check browser console for errors

### "Invalid API key"

- Verify your API key is correct
- Make sure the API key restrictions allow your domain
- Ensure Google Drive API and Google Picker API are enabled

### Token expires quickly

- OAuth tokens typically expire after 1 hour
- Consider implementing token refresh logic for better UX
- For now, users can simply sign in again

## Next Steps

1. **Implement file download**: Add logic to download and load selected files into AlphaTab
2. **Add file filtering**: Filter by file types (e.g., only show .gp, .gpx, .gp5 files)
3. **Improve UX**: Add loading states, error messages, and better feedback
4. **Add persistence**: Save the last selected folder to localStorage

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Google Picker API Guide](https://developers.google.com/picker/guides)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)
