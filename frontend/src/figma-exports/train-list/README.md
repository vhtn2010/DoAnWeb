# Train List Figma Reference

## Source

- Figma file: `WEB BUSINESS`
- File key: `0yFVbRHuE6VDIY14P1jWcQ`
- Frame name: `User - Đặt vé tàu`
- Root frame node: `168:151`
- Nested content node returned by MCP: `39:2640` (`Chọn vé tàu`)
- MCP read path used in this export:
  - `mcp__codex_apps__figma._get_metadata`
  - `mcp__codex_apps__figma._get_screenshot`

## Frame Size

- Root frame: `1280 x 1886` from MCP metadata
- Screenshot render: `1284 x 1887`
- Header height: about `96px`
- Hero visual band before overlap card: about `358px`
- Search card shell: about `1180px` wide
- Footer block: about `520px` tall

## Files

- `frontend/src/figma-exports/train-list/index.html`
- `frontend/src/figma-exports/train-list/style.css`
- `frontend/src/figma-exports/train-list/README.md`

## Extraction Notes

- MCP read the correct frame and confirmed the exact node name `User - Đặt vé tàu`.
- The nested node `39:2640` was returned by metadata as a collapsed/self-closing frame, so not every internal child node was available as XML.
- Because of that, section naming, sizing, and visual tokens below combine:
  - direct MCP metadata for the root frame and header structure
  - screenshot inspection of node `168:151`
  - shared design language already visible in adjacent user frames from the same Figma file
- No layout in this export was invented without an MCP-readable screenshot of the frame.

## Key Visual Tokens

### Colors

- Page background: `#FBF7F6`
- Surface: `#FFFFFF`
- Soft input surface: `#F5F3F2`
- Primary text: `#342926`
- Strong text: `#261D1B`
- Secondary text: `#75615D`
- Muted text: `#9B8782`
- Brand red: `#DE2A2A`
- Strong CTA red: `#D91F23`
- Soft red border: `#F4DFDE`
- Footer red: `#DF2424`
- Footer accent gold: `#F5BF2F`

### Typography

- Hero title: about `64px`, extra bold, tight tracking
- Hero subtitle: about `22px`, bold
- Search field values: about `17px`, bold italic
- Result summary: about `18px`, bold
- Train code: about `26px`, extra bold
- Departure / arrival time: about `22px`, extra bold
- Price emphasis: about `34px`, extra bold
- Footer links/body: `16px`, bold

### Spacing

- Main page shell: about `1180px`
- Footer content shell: about `1120px`
- Search card top padding: about `32px`
- Search field gap: about `18px`
- Main content gap between sidebar and results: about `38px`
- Train card vertical gap: about `24px`
- Footer top / bottom padding: about `80px / 40px`

### Radius

- Search card: about `34px`
- Train cards: about `28px`
- Filter panel: about `16px`
- Field pills and CTA pills: `999px`
- Small button corners: about `8px` to `14px`

### Shadow

- Header: `0 1px 2px rgba(28,16,16,0.06)`
- Search card: large soft ambient shadow
- Result cards: soft card shadow
- Primary CTA buttons: soft red-tinted shadow

## Main Sections

- Header / top navigation
- Hero banner with large destination headline
- Overlapping train search card
- Filter sidebar
- Result summary row
- Train listing cards
- Bottom "Xem thêm chuyến tàu" CTA
- Footer with four columns

## Main Components

- Brand logo area and nav links
- Utility icons and account avatar
- Search fields:
  - ga đi
  - ga đến
  - ngày đi / về
  - hành khách
- Trip type pills: `Khứ hồi`, `1 Chiều`
- Search CTA button
- Sort control: `Giá rẻ nhất`
- Filter groups:
  - loại tàu
  - khung giờ khởi hành
  - mức giá
- Train cards with:
  - loại tàu
  - mã tàu
  - giờ đi
  - ga đi
  - thời lượng
  - giờ đến
  - ga đến
  - giá cũ / giá mới
  - CTA `Chọn chuyến`
  - seat availability note

## Important Observations

- The frame behaves like a train listing screen, not a form-heavy booking checkout.
- The search card is the visual anchor and overlaps the hero instead of sitting below it.
- The left filter column is compact and secondary; the train cards dominate the page.
- Price and CTA occupy a dedicated right column inside each train card.
- A seat/carriage selector is not visibly present in this frame. If a later React screen needs `loại ghế/toa`, that will need a product decision or another Figma source.

## Asset Notes

- MCP provided a screenshot for the full frame, but no reliable per-asset URLs for the hero image or logo internals were available from the collapsed nested node.
- This HTML reference therefore uses CSS-based placeholders for the hero atmosphere and a text-based brand block to preserve layout and proportions.
- If future MCP reads expose stable image assets, they can replace these placeholders in the reference layer only.

## React Mapping Notes For The Next Task

- Route target later will be `/trains`.
- Do not import this HTML directly into the app.
- Break the future React page into:
  - page shell / header
  - hero copy
  - search form card
  - filters sidebar
  - result list
  - train result card
  - footer
- Keep the overlap relationship between hero and search card.
- Keep the card internals in a two-part structure:
  - route/timing block on the left
  - price/CTA block on the right
- Sort state and trip-type chips need clear active styling.
- The future React implementation should decide whether footer/header remain shared layout components or route-local visual sections.
