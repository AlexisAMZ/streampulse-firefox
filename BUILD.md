# Build Instructions for Mozilla Add-ons Reviewer

## Overview
StreamPulse is built with standard Vanilla JavaScript (ES Modules), HTML5, and CSS3.
There is **no transpilation** (no Babel, no TypeScript, no Webpack, no minifier) applied to the extension's original source code.
The only third-party minified file is `js/vendor/hls.light.min.js`, which is the official open-source HLS.js library (v1.5.8) from https://github.com/video-dev/hls.js.

## Environment Requirements
- **OS**: macOS, Linux, or Windows
- **Node.js**: v20.0.0 or higher (v24 LTS recommended)
- **npm**: v10.0.0 or higher
- **zip / unzip**: Standard system utilities

## Step-by-Step Reproduction / Build Instructions
1. Unzip the source package into a clean directory:
   ```bash
   unzip StreampulseFirefox_source.zip -d streampulse-source
   cd streampulse-source
   ```
2. Install the linter and verification dependencies:
   ```bash
   npm install
   ```
3. Run the automated verification suite:
   ```bash
   npm run verify
   ```
4. Build the final distribution package:
   ```bash
   npm run build
   ```
   The exact production archive `StreampulseFirefox_26.9.8.zip` will be produced in `~/Desktop/dev/ZIPS/` (or the folder defined by `STREAMPULSE_ZIP_DIR`).
