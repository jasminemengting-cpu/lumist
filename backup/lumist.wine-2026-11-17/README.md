# lumist.wine — front-end snapshot, 17 Nov 2026

A copy of what https://lumist.wine served to a signed-out visitor on 17 November 2026,
captured page by page in a browser.

## What is included
- 10 pages as rendered HTML: home, journal, estate, three journal essays, my account
  (sign-in, sign-up, lost password) and cart.
- Every same-site stylesheet, script, font and image those pages load: the
  `lumist-editorial` theme, the `lumist-accounts`, `lumist-commerce` and
  `lumist-estate-artwork` plugins, WooCommerce and WordPress core assets.
- `manifest.json`: source URL, size and SHA-256 for every file.

## What is not included
- Server-side code (PHP templates, plugin logic), the database, uploads that no page
  links to, and anything behind wp-admin. Those need a hosting or WordPress export.
- Photos hosted on Unsplash and Google Fonts are still loaded from their own servers.

Pages keep their original absolute links to lumist.wine, so this folder is an archive,
not a working mirror.
