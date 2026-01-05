# SillyInnkeeper

**SillyInnkeeper** is an application for convenient work with character cards for SillyTavern. It provides powerful tools for searching, filtering, and sorting thousands of cards, as well as integration with SillyTavern for quick character launching.

> 🌐 **Languages**: [English](README.md) | [Русский](docs/README.ru.md)

> 🔗 **SillyTavern Extension**: [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper) — Install this extension in SillyTavern to integrate with SillyInnkeeper.

> 📢 **Telegram Channel**: [@SillyInnkeeper](https://t.me/SillyInnkeeper) — news, updates, and project discussions.

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

### Full SillyTavern Integration

- **View and edit cards**: Full access to character card content from SillyTavern
- **Chat management**: View information about chats associated with cards, filter by user profiles
- **Data synchronization**: Automatic synchronization of metadata between SillyInnkeeper and SillyTavern
- **One-click launch**: The "Play" button instantly imports the card into SillyTavern
- **Automatic import**: The SillyTavern extension automatically receives cards from SillyInnkeeper

### Powerful Search and Filtering

- **Search by name**: Quick search for cards by character name
- **Text search**: Full-text search through card content with two modes:
  - "LIKE" mode — simple substring search
  - "FTS" mode — full-text search with relevance ranking
  - Search fields: description, personality, scenario, first message, message examples, creator notes, system prompts, post history instructions, alternate greetings, group-only greetings
- **Metadata filtering**:
  - By creator (single or multiple)
  - By specification version (V1/V2/V3)
  - By tags (multiple selection)
  - By patterns (customizable rules)
- **Date filtering**: Date range for card creation
- **Size filtering**: Search by approximate number of prompt tokens (min/max)
- **Field presence filtering**: Find cards with or without specific fields:
  - Creator notes
  - System prompts
  - Post history instructions
  - Personality
  - Scenario
  - Message examples
  - Character Book (lorebook)
- **Alternate greetings filtering**: Presence and minimum count
- **Source filtering**: Cards from SillyTavern, from folder, or all
- **Status filtering**: Hidden, favorite cards
- **SillyTavern chats filtering**:
  - Chat count (equal/greater than/less than)
  - User profiles
  - Hide cards without chats
- **Flexible sorting**:
  - By creation date (newest/oldest first)
  - By name (A-Z / Z-A)
  - By prompt tokens count (descending/ascending)
  - By SillyTavern chats count (descending/ascending)
  - By last chat date (newest/oldest first)
  - By first chat date (newest/oldest first)
  - By relevance (when using full-text search)

### Card Library Management

- **Automatic scanning**: Just specify the folder with cards — the application will find and index all PNG files automatically
- **Automatic updates**: When new cards are added or existing ones are changed, the application will automatically update the information
- **Duplicate management**: Automatic detection of identical cards and convenient management of them

### Convenient Card Viewing

- **All information in one place**: View all card data without needing to open the file
- **Tab organization**: Information is divided into categories for convenience:
  - Main information (name, description, personality, scenario, first message)
  - Alternate greetings
  - System prompts
  - Raw JSON (for advanced users)
- **Image viewing**: Zoom card images with optional blur (censorship)
- **Metadata**: View ID, specification version, creation date, and other useful information
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

2. In the extension settings, specify the SillyInnkeeper URL: `http://127.0.0.1:48912`

   If SillyTavern is opened on a different machine, use the Innkeeper machine IP/hostname instead (e.g. `http://192.168.1.10:48912`).

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

2. **Use search**:
   - **Search by name**: Enter the character name for quick search
   - **Text search**: Enter text to search through card content
     - Choose search mode: "LIKE" (simple search) or "FTS" (full-text search with ranking)
     - Select fields to search: description, personality, scenario, first message, message examples, creator notes, system prompts, post history instructions, alternate greetings, group-only greetings

3. **Apply filters**:
   - **Metadata**: Creator, specification version (V1/V2/V3), tags, patterns
   - **Creation date**: Specify a date range
   - **Prompt tokens**: Minimum and maximum number of tokens
   - **Alternate greetings**: Presence and minimum count
   - **Field presence**: Select fields that should be present/absent (creator notes, system prompts, post history instructions, personality, scenario, message examples, Character Book)
   - **Source**: All cards, only from SillyTavern, only from folder
   - **Status**: Hidden, favorite cards
   - **SillyTavern chats**: Chat count (equal/≥/≤), user profiles, hide cards without chats

4. **Choose sorting**: By creation date, name, token count, chat count, last/first chat date, or by relevance (when using full-text search)

5. **Results update automatically** when filters change

6. **Reset filters**: Use the "Reset" button to clear all filters

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

1. **Lorebook Support (Character Book)**

   - Viewing and managing lorebooks from cards
   - Editing lorebooks
   - Export/import lorebooks
   - This functionality will be redesigned to improve UX/UI

2. **Native Desktop Application**

   - Possible implementation of a native desktop application for improved performance and usability

## 📄 License

This project is licensed under [AGPL-3.0](https://opensource.org/licenses/AGPL-3.0).

## 👤 Author

**Dmitry Plyaskin**

- GitHub: [@dmitryplyaskin](https://github.com/dmitryplyaskin)
- Telegram Channel: [@SillyInnkeeper](https://t.me/SillyInnkeeper)
- Project: [SillyInnkeeper](https://github.com/dmitryplyaskin/SillyInnkeeper)
- SillyTavern Extension: [ST-Extension-SillyInnkeeper](https://github.com/dmitryplyaskin/ST-Extension-SillyInnkeeper)
