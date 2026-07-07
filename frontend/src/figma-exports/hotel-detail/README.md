# Hotel Detail Figma Reference

## Source

- Figma file: `WEB BUSINESS`
- File key: `0yFVbRHuE6VDIY14P1jWcQ`
- Frame name: `User - Chi tiết khách sạn`
- Frame node: `168:157`
- MCP read path used in this export:
  - `mcp__codex_apps__figma._get_metadata`
  - `mcp__codex_apps__figma._get_screenshot`
  - `mcp__codex_apps__figma._use_figma` in read-only mode

## Frame Size

- Root frame: `1280 x 2285`
- Main content shell inside page: `1200px` wide
- Effective content width for hero, gallery, content blocks: `1152px`
- Footer height: `516px`
- Header height: `96px`

## Files

- `frontend/src/figma-exports/hotel-detail/index.html`
- `frontend/src/figma-exports/hotel-detail/style.css`
- `frontend/src/figma-exports/hotel-detail/README.md`

## Key Visual Tokens

### Colors

- Page background: `#FBF9F8`
- Main surface: `#FFFFFF`
- Soft surface: `#F5F3F3`
- Primary text: `#1B1C1C`
- Secondary text: `#5F5E5E`
- Brand red: `#C8102E`
- Deep red for price/emphasis: `#9E001F`
- Soft border: `#E5BDBB`
- Footer red: `#D62828`
- Footer accent gold: `#F4C542`

### Typography

- Title: `48px`, `Be Vietnam Pro ExtraBold`, line-height `52.8px`, letter-spacing `-0.96px`
- Section title: `24px`, `Be Vietnam Pro Bold`, line-height `31.2px`
- Description body: `18px`, `Be Vietnam Regular`, line-height `29.25px`
- Address and summary text: `16px`, line-height `24px`
- Room and price emphasis: `28px`, `Be Vietnam Pro ExtraBold`
- Footer headings: `14px`, `Be Vietnam Pro Bold`, letter-spacing `1.4px`
- Review meta: `12px`

### Spacing

- Header horizontal padding: `80px`
- Main page top spacing below header: about `32px`
- Hero vertical gap: `16px`
- Gallery gap: `12px`
- Content/sidebar gap: `32px`
- Room cards gap: `16px`
- Amenity chips gap: `16px`
- Sidebar/card inner padding: `16px`
- Footer top/bottom padding: `80px / 40px`

### Radius

- Gallery images: `12px`
- Booking panel: `12px`
- Room cards: `12px`
- Review card: `12px`
- Buttons and amenity chips: `8px`
- Small badge: `4px`

### Shadow

- Header: subtle shadow with blur
- Booking panel shadow:
  - `0 4px 6px -4px rgba(0,0,0,0.10)`
  - `0 10px 15px -3px rgba(0,0,0,0.10)`
- Room cards: `0 1px 2px rgba(0,0,0,0.05)`

## Layout Notes From Figma

- Header is a white translucent top nav with centered navigation and right-side utility icons.
- Hotel hero starts with red star row, very large title, address row, inline map link, then price block aligned to the right.
- Gallery uses a fixed bento layout:
  - left image `570 x 412`
  - four right tiles `279 x 200`
  - bottom-right tile has dark overlay and `+12 ảnh`
- Description and amenities sit on the left column while booking summary sits on the right column.
- Booking panel in Figma is a compact summary card, not a booking form.
- Room section is a 3-column grid with shallow cards, image top, short meta row, bottom divider, price, and CTA.
- Review section is compact with one visible review card in the frame.
- Footer is a large solid red block with four columns and muted bottom bar links.

## Asset Notes

- This export uses image URLs returned by Figma MCP screenshots for:
  - logo
  - gallery images
  - room images
- These URLs are short-lived Figma asset links and may expire. They are suitable for visual reference, not production use.

## React Gaps To Fix Later

- Current React page renders a breadcrumb, but the Figma frame does not show one.
- Current React detail screen is missing the Figma top navigation and footer inside this route-level reference.
- Current React booking panel is form-heavy with date, guest, room quantity, and total rows. Figma only shows a short summary card plus 2 buttons.
- Current React gallery is interactive and data-driven, but it still needs the exact `570 / 279 / 279` bento proportions and the overlay treatment from Figma.
- Current React room cards contain more content than the Figma cards, including description text, extra metadata, and selected state handling that is not present in this frame.
- Current React review area shows a broader review summary block, while Figma keeps the section much lighter and more editorial.
- Current React styling should be retuned to match Figma typography:
  - title size and tracking
  - muted body color
  - border pink tone
  - panel/card radii
  - shadow softness
  - footer color system

## Practical Mapping Summary

- Treat this export as a static visual baseline only.
- Do not import this HTML into the app.
- Use it in the next task to map:
  - page shell
  - hotel hero
  - gallery grid
  - booking summary card
  - room cards
  - review card
  - footer
