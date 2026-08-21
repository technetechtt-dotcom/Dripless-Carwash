# Google Maps setup

Dripless uses Google Maps for:

1. **Server geocoding / Places autocomplete / routing** (`GOOGLE_MAPS_API_KEY`)
2. **In-app map tiles & markers** (`VITE_GOOGLE_MAPS_API_KEY` in Customer, Driver, Ops)

## Google Cloud Console

Create (or reuse) a project and enable:

- Maps JavaScript API
- Places API
- Geocoding API
- Directions API

Create two keys:

| Key | Restriction | Used by |
|-----|-------------|---------|
| Server key | IP restrict (API host) | `backend-api` `GOOGLE_MAPS_API_KEY` |
| Browser key | HTTP referrer (`https://customer…/*`, `http://localhost:5173/*`, etc.) | `VITE_GOOGLE_MAPS_API_KEY` |

## Backend `.env`

```
GEOCODER_PROVIDER=google
ROUTING_PROVIDER=google
GOOGLE_MAPS_API_KEY=AIza...
```

## App `.env` (Customer / Driver / Ops)

```
VITE_GOOGLE_MAPS_API_KEY=AIza...
```

Restart Vite after changing `VITE_*` vars.

## Behaviour

- Autocomplete: Places Autocomplete → Place Details (lat/lng), biased to Sandton/ZA
- Maps UI: Google Maps JS when browser key is set; otherwise OpenStreetMap Leaflet fallback
- Navigation links open Google Maps directions
- Zone validation still uses the Sandton pilot polygon on the API

## Verify

1. Book a wash → type an address → suggestions appear
2. Select suggestion → map pin moves
3. Driver active job map shows Google tiles
4. Ops Dispatch live fleet map uses Google when key present
