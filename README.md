# SKÅDIS DXF Generator

> Generate custom-sized IKEA SKÅDIS-compatible pegboard DXF files for laser cutting or CNC, with a live preview and locked hole pattern for perfect accessory fit.

---

## 🚀 Live Demo

**Cloudflare Pages:** [skadis-dxf.pages.dev](https://skadis-dxf.pages.dev/)

---

## Features

- **SKÅDIS-compatible:** Hole size, spacing, and offsets are locked to IKEA SKÅDIS spec so all official accessories fit.
- **Parametric sizing:** Choose any board width, height, and corner radius.
- **Instant preview:** See your board and hole pattern before exporting.
- **DXF export:** Download a ready-to-cut DXF file for laser/CNC.
- **Modern UI:** Clean, responsive, and easy to use.

---

## CNC Operator Solution (Preferred)

When cutting holes, the CNC operator should use an **outside** or **pocket** toolpath for the holes, not **on the line**. This tells the CNC to offset the toolpath outward by the radius of the bit, so the final hole matches the intended size.

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Deploying to Cloudflare Pages (with Wrangler)

```bash
# Build the site
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=skadis-dxf
```

---

## License

MIT
