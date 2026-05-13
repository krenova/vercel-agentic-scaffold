# PropertyGuru Navigation

## Purpose
Navigate PropertyGuru to find and extract listing details for a specific property or area.

## Steps
1. Go to https://www.propertyguru.com.sg
2. Enter the district, area name, or MRT station in the search bar at the top
3. Click "More Filters" and apply bedroom count and price range as specified by the user
4. For each relevant listing, open the listing card to reach the detail page
5. Extract the following: asking price, full address, floor area (sqft/sqm), PSF, listing date, and agent contact

## Constraints
- Only include listings updated within the last 30 days
- Skip any listing marked with "Ad" or "Sponsored"
- If a page requires login to view details, stop immediately and tell the user access is restricted
- Do not guess or extrapolate missing data — report it as unavailable
- Do not click on listings that belong to competing agencies unless the user explicitly asks
