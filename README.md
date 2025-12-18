# SillyInnkeeper

**SillyInnkeeper** is an application for convenient work with character cards for SillyTavern. It provides powerful tools for searching, filtering, and sorting thousands of cards, as well as integration with SillyTavern for quick character launching.

> 🌐 **Languages**: [English](README.md) | [Русский](docs/README.ru.md)

> 🔗 **SillyTavern Extension**: [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) — Install this extension in SillyTavern to integrate with SillyInnkeeper.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://opensource.org/licenses/AGPL-3.0)

![Main img](assets/main.webp)

## 💡 Why SillyInnkeeper?

If you have a large collection of character cards (hundreds or thousands of files), you've likely encountered problems when working with them:

- **Lag and freezing** — SillyTavern's built-in tools can't handle large volumes of cards
- **Slow search** — Searching through cards takes a long time or doesn't work at all
- **Inconvenient filtering** — Limited filtering and sorting capabilities
- **Navigation difficulties** — Hard to find the right card among thousands of files
- **Missing metadata** — Difficult to understand what's in a card without opening it

SillyInnkeeper solves all these problems by providing a fast and convenient way to work with your card collection.

## ✨ Key Features

### Card Library Management

- **Automatic scanning**: Just specify the folder with cards — the application will find and index all PNG files automatically
- **Automatic updates**: When new cards are added or existing ones are changed, the application will automatically update the information
- **Duplicate management**: Automatic detection of identical cards and convenient management of them

### Powerful Search and Filtering

- **Search by name**: Quick search for cards by character name
- **Filter by creator**: Find all cards from a specific author
- **Filter by tags**: Select multiple tags for precise search
- **Filter by date**: Find cards created in a specific period
- **Filter by content**: Find cards with specific fields (e.g., only with system prompt or with alternate greetings)
- **Filter by size**: Search by approximate number of prompt tokens
- **Flexible sorting**: Sort by creation date or by name

### Convenient Card Viewing

- **All information in one place**: View all card data without needing to open the file
- **Tab organization**: Information is divided into categories for convenience:
  - Main information (name, description, personality, scenario, first message)
  - Alternate greetings
  - System prompts
  - Raw JSON (for advanced users)
- **Image viewing**: Zoom card images with optional blur (censorship)
- **Metadata**: View ID, specification version, creation date, and other useful information

### SillyTavern Integration

- **One-click launch**: The "Play" button instantly imports the card into SillyTavern
- **Automatic import**: The SillyTavern extension automatically receives cards from SillyInnkeeper
- **Card export**: Download PNG files with correct metadata for use in other applications

### User Experience

- **Fast performance**: The application is optimized to work with thousands of cards without lag
- **Automatic thumbnails**: All cards are displayed with thumbnails for quick viewing
- **Themes**: Light, dark, and automatic theme (follows system settings)
- **Two languages**: Support for Russian and English

### Format Support

- Support for Character Card V1, V2, and V3 — work with cards of any format

## 💻 System Requirements

- **Node.js**: version 18.x or higher (recommended 20.x or 24.x)
- **Yarn**: version 4.12.0 (or npm 9.x+)
- **Operating system**: Windows 10/11, Linux, macOS
- **RAM**: minimum 2 GB (recommended 4 GB+ for large collections)
- **Free disk space**: minimum 500 MB for installation + space for database and cache

## 📦 Installation

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) (version 18.x or higher)
- [Yarn](https://yarnpkg.com/) (version 4.12.0) or npm

### Method 1: Automatic Installation (Windows)

1. Clone the repository:

```bash
git clone https://github.com/dmitryplyaskin/SillyInnkeeper.git
cd SillyInnkeeper
```

2. Run the installation script:

```bash
start.bat
```

The script will automatically install all dependencies, build the project, and start the server. The browser will open automatically.

### Method 2: Manual Installation

1. Clone the repository:

```bash
git clone https://github.com/dmitryplyaskin/SillyInnkeeper.git
cd SillyInnkeeper
```

2. Install server dependencies:

```bash
cd server
yarn install
# or
npm install
```

3. Install client dependencies:

```bash
cd ../client
yarn install
# or
npm install
```

4. Build the project:

Build the client:

```bash
cd client
yarn build
# or
npm run build
```

Build the server:

```bash
cd server
yarn build
# or
npm run build
```

5. Start the server:

```bash
cd server
yarn start
# or
npm start
```

6. Open your browser and navigate to:

```
http://127.0.0.1:48912
```

### Configuration (.env)

You can configure **host/port** and SillyTavern integration via a root `.env` file.

- Copy [`env.example`](env.example) to `.env` (in the repository root, next to `package.json`)
- Variables:
  - `INNKEEPER_HOST` — bind interface (default `127.0.0.1`). Use `0.0.0.0` to allow access from your local network.
  - `INNKEEPER_PORT` — server port (default `48912`)
  - `ST_PORT` — SillyTavern port for default CORS allowlist (default `8000`)
  - `CORS_ALLOW_ORIGINS` — extra allowed origins (comma-separated), e.g. `http://192.168.1.50:8001`

**Note about LAN**: if you set `INNKEEPER_HOST=0.0.0.0`, open the app from another device using `http://<your-pc-lan-ip>:<INNKEEPER_PORT>` (you may also need to allow inbound traffic in your firewall).

## 🚀 Quick Start

### First Launch

1. **Start the application** (see [Installation](#-installation) section)

2. **Configure the path to the cards folder**:

   - Open settings (the "Settings" button in the top panel)
   - Specify the path to the folder where your PNG card files are stored
   - Save the settings

3. **Wait for scanning to complete**:

   - On first launch, the application will automatically start scanning the specified folder
   - Scanning progress is displayed in the interface
   - After completion, all cards will be available for search and viewing

4. **Start using**:
   - Use search and filters to find the cards you need
   - Click on a card to view detailed information
   - Use the "Play" button to launch the card in SillyTavern (if integration is configured)

### SillyTavern Integration Setup

1. Install the [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) extension in SillyTavern

2. In the extension settings, specify the SillyInnkeeper URL:

   ```
   http://127.0.0.1:48912
   ```

   If SillyTavern is opened on a different machine, **do not use `localhost`** — use the Innkeeper machine IP/hostname instead (e.g. `http://192.168.1.10:48912`).

   If SillyTavern is not on port 8000, set `ST_PORT` (and/or add its full origin to `CORS_ALLOW_ORIGINS`).

3. Enable "Auto-connect" for automatic connection

4. Now you can use the "Play" button in SillyInnkeeper to automatically import the card into SillyTavern

## 📖 Usage

### Main Interface

The main screen of the application consists of:

- **Top panel**: Header, theme switcher, view settings, settings and filters buttons
- **Card grid**: List of all cards with thumbnails
- **Filters sidebar**: Opens with the "Filters" button

### Search and Filtering

1. **Open the filters panel** (the "Filters" button in the top panel)

2. **Use available filters**:

   - **Search by name**: Enter the character name
   - **Creator**: Select one or more creators
   - **Specification version**: Filter by Character Card version (V1/V2/V3)
   - **Tags**: Select tags for filtering
   - **Creation date**: Specify a date range
   - **Tokens**: Minimum and maximum number of tokens
   - **Alternate greetings**: Presence and minimum count
   - **Field presence**: Select fields that should be present/absent

3. **Choose sorting**: By creation date or by name

4. **Apply filters**: Results will update automatically

5. **Reset filters**: Use the "Reset" button to clear all filters

### Viewing a Card

1. **Click on a card** in the grid to open detailed information

2. **Explore the information**:

   - **"Main" tab**: Main information about the character
   - **"Alternate Greetings" tab**: All alternate greetings
   - **"System" tab**: System prompt and post history instructions
   - **"Raw JSON" tab**: Full card JSON for editing

3. **Use actions**:
   - **Play**: Launch the card in SillyTavern
   - **Download**: Download the PNG file of the card
   - **Rename**: Change the name of the main file
   - **Delete**: Delete the card or duplicate

### Library Management

- **Automatic updates**: When files in the cards folder are changed, the application will automatically update the index
- **Manual scanning**: You can start a rescan through settings
- **Duplicate management**: In the detailed card view, you can select the main file or delete duplicates

## 🔗 SillyTavern Integration

SillyInnkeeper integrates with SillyTavern through the [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) extension.

### Extension Installation

1. Open SillyTavern
2. Go to **Extensions → Extension Installer**
3. Paste the repository URL:
   ```
   https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper
   ```
4. Click "Install"

### Extension Configuration

1. Open **Extensions → SillyInnkeeper** in SillyTavern
2. Specify **SillyInnkeeper URL**: `http://127.0.0.1:48912` (or your port)
3. Enable **Auto-connect** (recommended)
4. Optionally enable **Report import result back to SillyInnkeeper**
5. Optionally enable **Open imported character** to automatically open the imported character

### Usage

1. Open a card in SillyInnkeeper
2. Click the **"Play"** button in the detailed view
3. The card will automatically be imported into SillyTavern
4. If the "Open imported character" option is enabled, the character will open automatically

## 🗺 Future Plans

### Planned Features

1. **Full SillyTavern Integration and Scanning**

   - Scanning cards from SillyTavern folder
   - Managing and editing cards, chats, lorebooks, etc.
   - Two-way synchronization between SillyInnkeeper and SillyTavern

2. **Lorebook Support**

   - Viewing and managing lorebooks from cards
   - Editing lorebooks
   - Export/import lorebooks

3. **Multiple Directories Support**

   - Support for multiple card libraries
   - Switching between libraries
   - Unified search across all libraries
   - Library management through UI

4. **Auto-Download and Auto-Import**

   - Monitoring downloads folder
   - Automatic scanning of new files
   - Automatic import into SillyTavern (optional)
   - Configuration rules for automatic card organization

## 📄 License

This project is licensed under [AGPL-3.0](https://opensource.org/licenses/AGPL-3.0).

## 👤 Author

**Dmitry Plyaskin**

- GitHub: [@dmitryplyaskin](https://github.com/dmitryplyaskin)
- Project: [SillyInnkeeper](https://github.com/dmitryplyaskin/SillyInnkeeper)
- SillyTavern Extension: [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper)

---

**Note**: SillyInnkeeper is an independent project, not officially affiliated with SillyTavern. It is a community tool for improving work with character cards.
