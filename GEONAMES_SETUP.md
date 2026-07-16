# GeoNames API Setup for Location Detection

## Overview
The ATS Location Management system uses the GeoNames API to detect location information via:
- Current geolocation (browser GPS)
- PIN code lookup

## Getting a GeoNames Username

### Step 1: Sign Up
1. Go to https://www.geonames.org/login
2. Create a free account (no credit card required)
3. Your username will be your GeoNames API key

### Step 2: Configure Environment Variables

#### Frontend (.env.development)
```bash
# Replace 'demo' with your actual GeoNames username
VITE_GEONAMES_USERNAME=your_actual_username
```

#### Backend (.env)
```bash
# Add your GeoNames username for server-side operations
GEONAMES_USERNAME=your_actual_username
```

### Step 3: Restart Development Server
After updating the environment variables, restart your development server:
```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev
```

## API Limits

### Free Account (Demo)
- **Daily Limit**: 20,000 credits (shared with all users)
- **Rate Limit**: May be exceeded during peak usage
- **Recommended**: Use your own username for development

### Personal Account (Free)
- **Daily Limit**: 2,000 credits per day
- **Sufficient**: For typical development and testing
- **No Sharing**: Dedicated to your account

### Commercial Account (Paid)
- **Higher Limits**: Available for production use
- **Priority Support**: Faster response times
- **Recommended**: For high-traffic production deployments

## Troubleshooting

### Error: "the daily limit of 20000 credits for demo has been exceeded"
**Solution**: Get your own GeoNames username from https://www.geonames.org/login and update `VITE_GEONAMES_USERNAME` in `.env.development`

### Error: "Unable to detect location"
**Possible Causes**:
1. Browser geolocation permission denied
2. Invalid PIN code format
3. GeoNames API rate limit exceeded
4. Network connectivity issues

**Solutions**:
1. Allow location access in browser settings
2. Ensure PIN code is 5-10 digits
3. Use your own GeoNames username instead of demo
4. Check internet connection

### Error: "Invalid PIN code or location not found"
**Possible Causes**:
1. PIN code doesn't exist in GeoNames database
2. GeoNames doesn't have data for this region
3. Typo in PIN code

**Solutions**:
1. Verify PIN code is correct
2. Try using manual location selection as fallback
3. Use current location detection instead

## API Endpoints Used

### PIN Code Search
```
GET https://secure.geonames.org/postalCodeSearchJSON?postalcode={PINCODE}&maxRows=1&username={USERNAME}
```

### Reverse Geocoding
```
GET https://secure.geonames.org/findNearbyPostalCodesJSON?lat={LAT}&lng={LNG}&username={USERNAME}
```

## Data Returned

### PIN Code Search Response
```json
{
  "postalCodes": [
    {
      "placeName": "Hyderabad",
      "adminName1": "Telangana",
      "countryCode": "IN",
      "postalCode": "500085",
      "lat": "17.4375",
      "lng": "78.4483"
    }
  ]
}
```

### Reverse Geocoding Response
```json
{
  "postalCodes": [
    {
      "placeName": "Hyderabad",
      "adminName1": "Telangana",
      "countryCode": "IN",
      "postalCode": "500085",
      "lat": "17.4375",
      "lng": "78.4483"
    }
  ]
}
```

## Security Notes

1. **Never commit actual API keys** to version control
2. **Use .env files** for environment-specific configuration
3. **Add .env to .gitignore** if not already present
4. **Use different usernames** for development, staging, and production

## Additional Resources

- GeoNames Documentation: http://www.geonames.org/export/geonames-search.html
- GeoNames Terms of Use: http://www.geonames.org/export/api
- Rate Limits: http://www.geonames.org/export/web-services.html