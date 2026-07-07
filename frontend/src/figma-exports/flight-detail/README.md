# Flight Detail Figma Reference

## Source

- Figma file: `WEB BUSINESS`
- File key: `0yFVbRHuE6VDIY14P1jWcQ`
- Frame name: `User - Chi tiết vé máy bay`
- Frame node: `168:159`
- MCP read path used in this export:
  - `mcp__codex_apps__figma._get_metadata`
  - `mcp__codex_apps__figma._get_screenshot`
  - `mcp__codex_apps__figma._get_design_context`

## Frame Size

- Root frame: `1285 x 2069`
- Main design frame inside root: `1280 x 2069`
- Main content wrapper: `1200px` wide at `x = 40`
- Effective content width used by sections: `1152px`
- Left content column: `760px`
- Right payment sidebar: `368px`
- Header height: `96px`
- Footer height: `516px`

## Files

- `frontend/src/figma-exports/flight-detail/index.html`
- `frontend/src/figma-exports/flight-detail/style.css`
- `frontend/src/figma-exports/flight-detail/README.md`

## Key Visual Tokens

### Colors

- Page background: `#FBF9F8`
- Surface: `#FFFFFF`
- Soft surface: `#F5F3F3`
- Muted block background: `#EFEDED`
- Primary text: `#1B1C1C`
- Secondary text: `#5F5E5E`
- Brown nav text: `#5C403D`
- Soft brown labels: `#906F6E`
- Brand red: `#D62828`
- Deep red emphasis: `#9E001F`
- Soft red border: `#E5BDBB`
- Gold outline/accent: `#F4C542`
- Card border: `#E2DFDE`
- Footer red: `#D62828`

### Typography

- Main destination heading: `48px`, `Be Vietnam Pro ExtraBold`, line-height `52.8px`, tracking `-0.96px`
- Section heading: `24px`, `Be Vietnam Pro Bold`, line-height `31.2px`
- Airline name: `24px`, `Be Vietnam Pro Bold`
- Departure / arrival time: `28px`, `Be Vietnam Pro ExtraBold`
- Fare prices: roughly `28px` to `40px` emphasis depending on block
- Summary and body copy: `16px`, line-height `24px`
- Long description body: `18px`, line-height `29.25px`
- Small labels and fare conditions: `12px` to `14px`

### Spacing

- Header horizontal shell: `1120px`
- Main page top spacing below header: about `32px`
- Main content gap: `32px`
- Fare cards gap: about `10px`
- Info cards gap: `16px`
- Internal card padding: `16px` to `18px`
- Footer padding: `80px` top, `40px` bottom

### Radius

- Small buttons / chips: `8px`
- Main cards: `12px`
- Highlight pill: `9999px`

### Shadow

- Header: `0 1px 2px rgba(0,0,0,0.05)`
- Standard card: `0 1px 2px rgba(0,0,0,0.05)`
- Payment panel:
  - `0 4px 6px -4px rgba(0,0,0,0.10)`
  - `0 10px 15px -3px rgba(0,0,0,0.10)`
- CTA / highlighted fare:
  - `0 4px 6px -1px rgba(158,0,31,0.20)`
  - `0 2px 4px -2px rgba(158,0,31,0.20)`

## Main Components In The Frame

- Translucent header with logo, nav, utility icons, and account avatar
- Top-right share / heart action buttons
- Flight header card:
  - airline logo
  - airline name
  - flight code
  - aircraft type
  - eco tag
  - departure / route line / arrival timeline
- Fare options grid:
  - economy lite
  - featured economy standard
  - business
- Aircraft info card
- In-flight amenities chip card
- Right sidebar payment summary
- Destination information section with large editorial heading and city image
- Red footer with four columns

## Layout Notes From Figma

- The screen is content-first, not hero-image-first.
- The main area is a two-column layout:
  - left column for flight details and fare selection
  - right column for payment summary
- The fare section is the core decision area of the page.
- The center fare card is highlighted in red and sits slightly taller / lifted.
- The payment sidebar is compact and visually heavy enough to stay as the booking CTA anchor.
- The destination section below is editorial and acts like supplemental travel inspiration content.

## Asset Notes

- This export uses Figma MCP asset URLs where available for:
  - brand logo
  - airline logo
  - destination image
- These URLs are short-lived and should be treated as reference-only, not production assets.

## React Mapping Notes For The Next Task

- Route target later will be `/flights/:slug`.
- Keep this export as static visual reference only. Do not import this HTML directly into React.
- Likely React sections to map:
  - header actions area
  - flight detail hero card
  - fare option card list
  - payment summary sidebar
  - policy / baggage / refund content
  - destination info section
- Important data groups the future React screen should expose:
  - airline name / code / aircraft
  - departure and arrival times
  - airport codes / airport names / terminal labels
  - duration and stop type
  - fare tier title / price / benefits / selected state
  - tax / fee / add-on summary
  - CTA actions for buy now / add to cart
  - destination image and destination editorial content

## Implementation Watchouts

- Do not model this screen as a generic form page. The Figma design is a product-detail + fare-selection page.
- The sidebar is not a full passenger form in this frame; it is a payment summary card with 2 CTAs.
- Fare cards need a clear selected / featured state difference.
- The route timeline is a signature visual and should be preserved closely when mapping to React.
- The destination section needs strong typography scale and a left-to-right image fade, not a plain text block.
