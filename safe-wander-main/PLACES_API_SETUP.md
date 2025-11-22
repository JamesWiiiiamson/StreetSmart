# Google Places API Setup Guide

If Nearby Safe Places is not loading, you may need to enable the Places API in Google Cloud Console.

## Required APIs

Make sure these APIs are enabled in your Google Cloud Console:

1. **Maps JavaScript API** ✅ (Required for the map)
2. **Places API** ✅ (Required for nearby places search)
3. **Places API (New)** ✅ (Optional, for enhanced features)
4. **Directions API** ✅ (Required for routing)
5. **Geolocation API** ✅ (Required for user location)

## How to Enable

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** > **Library**
4. Search for and enable:
   - "Places API" (Legacy)
   - "Places API (New)" (Optional but recommended)
5. Make sure your API key has access to these APIs

## Common Issues

### Issue: "Places API not loaded"
- **Solution**: Make sure the `places` library is included in the Maps script (it should be: `libraries=places,geometry,directions`)

### Issue: No places showing up
- **Check**: Open browser console and look for errors
- **Check**: Verify Places API is enabled in Google Cloud Console
- **Check**: Verify your API key has billing enabled (Places API requires billing)
- **Check**: Make sure your API key restrictions allow your domain

### Issue: Places load but no opening hours
- **Solution**: Enable "Places API (New)" for detailed opening hours
- **Note**: The app will still work with basic data if Places API (New) is not enabled

## Testing

To test if Places API is working:
1. Open browser console
2. Look for log messages like "Total places found before filtering: X"
3. Check for any error messages about Places API

## Billing Note

The Places API requires billing to be enabled on your Google Cloud project. Make sure you have:
- A valid billing account
- Quotas set up appropriately
- API key restrictions configured

