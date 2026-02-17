# LinkedIn CRM

Browser extension (Manifest V3) that adds a **“Private notes”** box on LinkedIn profile pages and syncs notes via the browser storage.

## Features

- Adds a “Private notes” card on profiles (`/in/...`)
- Saves and syncs notes using `storage.sync`
- **Save** / **Clear** buttons

## Installation

### Firefox

Refer to [this page](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/#self-distribution) to install a Firefox extension.

## Permissions

- `storage`: store/sync notes
- `*://*.linkedin.com/*`: inject the UI on LinkedIn pages

## Development

- Main script: `LinkedInCRM/content.js`
- Manifest: `LinkedInCRM/manifest.json`

## License

Released under the **GNU GPLv3** license (see `LICENSE`).

